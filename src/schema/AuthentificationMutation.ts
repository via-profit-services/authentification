import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { Context } from '@via-profit-services/core';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenRegistrationResponseSuccess,
  TokenRegistrationResponseFailure,
} from '@via-profit-services/authentification';

import TokenRegistrationResponse from './TokenRegistrationResponse';

type CreateTokenArgs = {
  login: string;
  password: string;
};

type RefreshTokenArgs = {
  refreshToken: string;
};

const AuthentificationMutation = new GraphQLObjectType<unknown, Context>({
  name: 'AuthentificationMutation',
  fields: () => ({
    create: {
      description: 'Create «Access» and «Refresh» tokens pair',
      type: new GraphQLNonNull(TokenRegistrationResponse),
      args: {
        login: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_parent, args: CreateTokenArgs, context) => {
        const { login, password } = args;
        const { services } = context;
        const { authentification } = services;

        // try to generate token pairs (call user function)
        const result = await authentification.createToken({
          context,
          login,
          password,
        });

        // if registration is done
        if (typeof result === 'object') {
          context.token = result.accessToken.payload;
          const response: TokenRegistrationResponseSuccess = {
            __typename: 'TokenRegistrationSuccess',
            payload: result,
            query: {
              /* Empty object */
            },
          };

          return response;
        }

        // if registration is failed
        const response: TokenRegistrationResponseFailure = {
          __typename: 'TokenRegistrationError',
          name: 'TokenRegistrationError',
          msg: typeof result === 'string' ? result : 'Invalid credentials',
        };

        return response;
      },
    },
    refresh: {
      description: 'Exchange a «Refresh» token to new «Access» and «Refresh» tokens pair',
      type: new GraphQLNonNull(TokenRegistrationResponse),
      args: {
        refreshToken: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_parent, args: RefreshTokenArgs, context) => {
        const { refreshToken } = args;
        const { services } = context;
        const { authentification } = services;

        let tokenPayload: RefreshTokenPayload | AccessTokenPayload;
        try {
          tokenPayload = await authentification.verifyToken(refreshToken);
        } catch (err) {
          throw new Error(err.message);
        }

        // if is not a valid refresh token
        if (!authentification.isRefreshTokenPayload(tokenPayload)) {
          const response: TokenRegistrationResponseFailure = {
            name: 'TokenVerificationError',
            msg: 'This is token are not «Refresh» token type. You should provide «Refresh» token type',
            __typename: 'TokenRegistrationError',
          };

          return response;
        }

        // if token was revoked
        const isRevoked = await authentification.checkTokenRevokeFn({ context, tokenPayload });
        if (isRevoked) {
          const response: TokenRegistrationResponseFailure = {
            name: 'TokenVerificationError',
            msg: 'Token revoked',
            __typename: 'TokenRegistrationError',
          };

          return response;
        }

        // try to generate token pairs (call user function)
        const result = await authentification.refreshToken({
          context,
          tokenPayload,
        });

        // if registration is done
        if (typeof result === 'object') {
          context.token = result.accessToken.payload;
          const response: TokenRegistrationResponseSuccess = {
            __typename: 'TokenRegistrationSuccess',
            payload: result,
            query: {
              /* Empty object */
            },
          };

          return response;
        }

        // if registration is failed
        const response: TokenRegistrationResponseFailure = {
          __typename: 'TokenRegistrationError',
          name: 'TokenRegistrationError',
          msg: typeof result === 'string' ? result : 'Invalid credentials',
        };

        return response;
      },
    },
  }),
});

export default AuthentificationMutation;
