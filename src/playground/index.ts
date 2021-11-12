import { makeExecutableSchema } from '@graphql-tools/schema';
import { factory, resolvers, typeDefs, Context } from '@via-profit-services/core';
import * as redis from '@via-profit-services/redis';
import express from 'express';
import http from 'http';
import path from 'path';
import bcryptjs from 'bcryptjs';

import { factory as authFactory } from '../index';
import { AccessTokenPayload } from '@via-profit-services/authentification';

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

  const accounts = [
    {
      id: '3e905cf1-58be-47e2-8ce3-54b36d0e91ad',
      name: 'Raphael',
      roles: ['viewer'],
      login: 'raphael',
      password: '$2a$10$4Znmu.IfH.c2Cv/ErQAtEuVi01yzqDEGzcS9qaSOjJG2U9udImIeu', // raphael
    },
    {
      id: '62af975d-a696-4749-917f-4b85d0d47c11',
      name: 'Leonardo',
      roles: ['administrator'],
      login: 'leonardo',
      password: '$2a$10$4Znmu.IfH.c2Cv/ErQAtEuhWETYN/ravOGmQBzUVYVYe0iniS/we2', // leonardo
    },
    {
      id: 'fe93babe-3f17-4866-b997-4e7412d78a18',
      name: 'Donatello',
      roles: ['viewer'],
      login: 'donatello',
      password: '$2a$10$4Znmu.IfH.c2Cv/ErQAtEun8AXUHu6q5wK0QPJfnnpi/M68tq1dV2', // donatello
    },
    {
      id: '34228712-3752-4dad-bada-4c2536ca8384',
      name: 'Michelangelo',
      roles: ['viewer'],
      login: 'michelangelo',
      password: '$2a$10$4Znmu.IfH.c2Cv/ErQAtEuOMPSThRtqFv3RnvjauoZV/EzXo2MuPu', // michelangelo
    },
    {
      id: 'ec3e6213-45f8-4187-b42e-6f265a4c22ae',
      name: 'Shredder',
      roles: ['enemy', 'viewer'],
      login: 'shredder',
      password: '$2a$10$4Znmu.IfH.c2Cv/ErQAtEur3qV197mxjL0zuiLtfO3DVIbctq9phu', // shredder
    },
  ];

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

  const customTypes = `
    extend type Query {
      propper: Propper!
    }

    extend type Mutation {
      revokeToken(userID: String!): Void
    }

    type Propper {
      id: ID!
      name: String!
      token: String!
    }
  `;

  const customResolvers = {
    Query: {
      propper: () => ({}),
    },
    Mutation: {
      revokeToken: async (
        _parent: any,
        args: { userID: string },
        context: Context,
      ): Promise<void> => {
        const { userID } = args;
        const { redis } = context;

        const tokens = await redis.hgetall('tokens');
        Object.entries(tokens).forEach(([_tokenID, payloadStr]) => {
          const { uuid, id } = JSON.parse(payloadStr) as AccessTokenPayload;
          if (uuid === userID) {
            redis.hdel('tokens', id);
            redis.hset('blacklist', id, payloadStr);
          }
        });

        // remove expired records
        const blacklist = await redis.hgetall('blacklist');
        Object.entries(blacklist).forEach(([tokenID, payloadStr]) => {
          const { exp } = JSON.parse(payloadStr) as { exp: number };
          if (exp < Date.now() / 1000) {
            redis.hdel('blacklist', tokenID);
          }
        });
      },
    },
    Propper: {
      id: () => 'propperID',
      name: (_parent: any, _args: any, context: Context) => {
        const { token } = context;
        console.log('Propper Name token', token.id);

        return 'Propper Name';
      },
      token: (_parent: any, _args: any, context: Context) => {
        const { token } = context;

        return `Token is «${token.id}»`;
      },
    },
  };

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

  server.listen(9000, () => {
    console.log(`GraphQL Server started at http://localhost:9000/graphql`);
  });
})();
