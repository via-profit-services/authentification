import { stitchSchemas } from '@graphql-tools/stitch';
import * as core from '@via-profit-services/core';
import * as redis from '@via-profit-services/redis';
import express from 'express';
import http from 'http';
import path from 'path';
import bcryptjs from 'bcryptjs';

import { factory as authFactory } from '../index';
import graphiql from './graphiql';
import accounts from './accounts';
import authSchema from '../schema';
import customSchema from './customSchema';

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
    accessTokenExpiresIn: 60 * 60 * 24, // 1 day
    checkTokenRevokeFn: async ({ tokenPayload, context }) => {
      const { redis } = context;
      const has = await redis.get(`revoked_${tokenPayload.id}`);

      return has !== null;
    },
    createTokenFn: async ({ context, login, password }) => {
      const { services, redis } = context;

      // get account by login
      const account = accounts.find(account => account.login === login);

      // return error if account not found or password are invalid
      if (!account || !bcryptjs.compareSync(`${login}.${password}`, account.password)) {
        return 'Invalid login or password';
      }

      // generate tokens pair
      const { accessToken, refreshToken } = services.authentification.generateTokens({
        uuid: account.id,
        roles: account.roles,
      });

      // In this example, we save the token ID in Redis,
      // which allows you to specify the time after which
      // the record will be automatically deleted from store
      await redis.set(
        `token_${accessToken.payload.id}`,
        accessToken.payload.id,
        'EXAT',
        accessToken.payload.exp,
      );
      await redis.set(
        `token_${refreshToken.payload.id}`,
        refreshToken.payload.id,
        'EXAT',
        refreshToken.payload.exp,
      );

      // return both tokens
      return { accessToken, refreshToken };
    },
    refreshTokenFn: async ({ tokenPayload, context }) => {
      const { services, redis } = context;

      // get account by id
      const account = accounts.find(account => account.id === tokenPayload.uuid);

      // return error if account not found
      if (!account) {
        return 'Account not found';
      }

      // generate tokens pair
      const { accessToken, refreshToken } = services.authentification.generateTokens({
        uuid: account.id,
        roles: account.roles,
      });

      // In this example, we save the token ID in Redis,
      // which allows you to specify the time after which
      // the record will be automatically deleted from store
      await redis.set(`token_${accessToken.payload.id}`, 'access', 'EXAT', accessToken.payload.exp);
      await redis.set(
        `token_${refreshToken.payload.id}`,
        'refresh',
        'EXAT',
        refreshToken.payload.exp,
      );

      // We can remove the ID of old tokens from your storage
      await redis.del(`token_${tokenPayload.id}`, `token_${tokenPayload.associated.id}`);

      // You should put the ID of the old tokens in the blacklist
      // so that authorization for them is no longer possible
      // `tokenPayload` - is a old access token payload data
      await redis.set(`revoked_${tokenPayload.id}`, 'access', 'EXAT', tokenPayload.exp);
      await redis.set(
        `revoked_${tokenPayload.associated.id}`,
        'refresh',
        'EXAT',
        tokenPayload.associated.exp,
      );

      // return both tokens
      return { accessToken, refreshToken };
    },
  });

  // const enableIntrospection = false;

  const { graphQLExpress } = await core.factory({
    server,
    schema: stitchSchemas({
      subschemas: [core.schema, authSchema, customSchema],
    }),
    debug: true,
    middleware: [redisMiddleware, authentification.middleware],
  });

  app.use('/graphql', graphQLExpress);
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

  server.listen(8080, () => {
    console.log(`GraphQL Server started at http://localhost:8080/graphql`);
  });
})();
