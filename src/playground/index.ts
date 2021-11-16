import { makeExecutableSchema } from '@graphql-tools/schema';
import { factory, resolvers, typeDefs } from '@via-profit-services/core';
import * as redis from '@via-profit-services/redis';
import express from 'express';
import http from 'http';
import path from 'path';
import bcryptjs from 'bcryptjs';

import customTypes from './customTypes';
import customResolvers from './customResolvers';
import { factory as authFactory } from '../index';
import graphiql from './graphiql';
import accounts from './accounts';

(async () => {
  const app = express();
  const server = http.createServer(app);

  const redisConfig: redis.Options = {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0,
  };

  const redisMiddleware = redis.factory(redisConfig);

  const authentification = await authFactory({
    privateKey: path.resolve(__dirname, './jwtRS256.key'),
    publicKey: path.resolve(__dirname, './jwtRS256.key.pub'),
    accessTokenExpiresIn: 60 * 60 * 24,
    roles: ['viewer', 'enemy', 'administrator'],
    checkTokenRevokeFn: async ({ tokenPayload, context }) => {
      const { redis } = context;
      const token = await redis.hget('blacklist', tokenPayload.id);

      return token !== null;
    },
    createTokenFn: async ({ context, login, password }) => {
      const { services, redis } = context;
      const credentials = `${login}.${password}`;

      // get account by login
      const account = accounts.find(account => account.login === login);

      // return error if account not found or password are invalid
      if (!account || !bcryptjs.compareSync(credentials, account.password)) {
        return {
          __typename: 'TokenRegistrationError',
          name: 'InvalidCredentials',
          msg: 'Invalid login or password',
        };
      }

      const payload = services.authentification.generateTokens({
        uuid: account.id,
        roles: account.roles,
      });

      // save token in your store
      await redis.hset(
        'tokens',
        payload.accessToken.payload.id,
        JSON.stringify(payload.accessToken.payload),
      );

      return {
        __typename: 'TokenRegistrationSuccess',
        query: {},
        payload,
      };
    },
    refreshTokenFn: async ({ tokenPayload, context }) => {
      const { services, redis } = context;

      // get account by id
      const account = accounts.find(account => account.id === tokenPayload.uuid);

      // return error if account not found
      if (!account) {
        return {
          __typename: 'TokenRegistrationError',
          name: 'InvalidCredentials',
          msg: 'Account not found',
        };
      }

      const payload = services.authentification.generateTokens({
        uuid: account.id,
        roles: account.roles,
      });

      // save token in your store
      await redis.hset(
        'tokens',
        payload.accessToken.payload.id,
        JSON.stringify(payload.accessToken.payload),
      );

      return {
        __typename: 'TokenRegistrationSuccess',
        query: {},
        payload,
      };
    },
  });

  const schema = makeExecutableSchema({
    typeDefs: [
      typeDefs,
      customTypes,
      authentification.typeDefs,
      `type User {
        id: ID!
        name: String!
      }`,
    ],
    resolvers: [resolvers, customResolvers, authentification.resolvers],
  });

  // const enableIntrospection = false;
  const { graphQLExpress } = await factory({
    server,
    schema,
    debug: true,
    middleware: [redisMiddleware, authentification.middleware],
  });

  app.use('/graphql', graphQLExpress); // <-- Last
  app.use(
    '/',
    graphiql({
      variables: {
        login: 'donatello',
        password: 'donatello',
      },
      query: `
# Make access token mutation
mutation CreateTokenMutation($login: String!, $password: String!) {
  authentification {
    create(login: $login, password: $password) {
      ...AuthFailedFragment
      ...AuthSuccessFragment
    }
  }
}

# This request will fail with an error
# because no access token is provided
query GetMyDataWithoutToken {
  me {
    id
    name
  }
}

fragment AuthFailedFragment on TokenRegistrationError {
  name
  msg
}

fragment AuthSuccessFragment on TokenRegistrationSuccess {
  query {
    # This resolver will be executed without errors,
    # since the token will be present in the context
    me {
      id
      name
    }
  }
  payload {
    accessToken {
      token
      payload {
        type
        id
        uuid
        exp
        roles
        iss
      }
    }
    refreshToken {
      token
      payload {
        type
        id
        uuid
        exp
        roles
        iss
      }
    }
  }
}`,
    }),
  ); // <-- Last

  server.listen(9000, () => {
    console.log(`GraphQL Server started at http://localhost:9000/graphql`);
  });
})();
