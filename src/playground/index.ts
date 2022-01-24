/* eslint-disable no-console */
/* eslint-disable import/max-dependencies */
import { mergeSchemas } from '@graphql-tools/schema';
import { graphqlExpressFactory } from '@via-profit-services/core';
import type { JwtConfig } from '@via-profit-services/authentification';
import * as redis from '@via-profit-services/redis';
import express from 'express';
import path from 'path';
import fs from 'fs';

import { factory as authFactory, AuthentificationService } from '../index';
import graphiql from './graphiql';
import authSchema from '../schema';
import customSchema from './customSchema';
import tokenService from './token-service';

(async () => {
  const app = express();
  const endpoint = '/graphql';
  const port = 8080;

  const redisConfig: redis.Options = {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0,
    maxRetriesPerRequest: 1,
  };

  const jwt: JwtConfig = {
    algorithm: 'HS256',
    issuer: 'company-iss',
    verifiedIssuers: ['company-iss', 'third-party-iss'],
    privateKey: fs.readFileSync(path.resolve(__dirname, '../src/playground/jwtRS256.key')),
    publicKey: fs.readFileSync(path.resolve(__dirname, '../src/playground/jwtRS256.key.pub')),
    accessTokenExpiresIn: 60 * 60 * 24, // 1 day
    refreshTokenExpiresIn: 2.592e6, // 30 days
  };

  const authentification = authFactory({
    tokenService,
    jwt,
  });

  const authService = new AuthentificationService(jwt);
  const redisMiddleware = redis.factory(redisConfig);
  const graphqlExpress = await graphqlExpressFactory({
    schema: mergeSchemas({
      schemas: [authSchema, customSchema],
    }),
    debug: true,
    middleware: [redisMiddleware, authentification],
  });

  app.use('/graphql', graphqlExpress);
  app.use('/test', async (req, res) => {
    try {
      const token = authService.extractTokenFromRequest(req);
      const tokenPayload = await authService.verifyToken(token || '');

      res.send({
        tokenPayload,
      });
    } catch (err) {
      res.status(403).send('<h1>Forbidden</h1>');
    }
  });

  app.use(
    '/',
    graphiql({
      endpoint,
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
  );

  app.listen(port, () => console.log(`Server started at http://localhost:${port}`));
})();
