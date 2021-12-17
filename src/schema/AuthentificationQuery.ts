import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { Context } from '@via-profit-services/core';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@via-profit-services/authentification';

import TokenVerificationResponse from './TokenVerificationResponse';

type VerifyTokenArgs = {
  accessToken: string;
};

const AuthentificationQuery = new GraphQLObjectType<unknown, Context>({
  name: 'AuthentificationQuery',
  fields: () => ({
    verifyToken: {
      description: 'Verify your Access token',
      type: new GraphQLNonNull(TokenVerificationResponse),
      args: {
        accessToken: {
          description: 'Access token',
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve: async (_parent, args: VerifyTokenArgs, context) => {
        const { accessToken } = args;
        const { services } = context;
        const { authentification, tokenService } = services;

        let tokenPayload: AccessTokenPayload | RefreshTokenPayload;

        try {
          tokenPayload = await authentification.verifyToken(accessToken);
        } catch (err) {
          return {
            name: 'VerificationError',
            msg: err.message,
            __typename: 'TokenVerificationError',
          };
        }

        try {
          const isRevoked = await tokenService.checkTokenRevoke({
            context,
            tokenPayload,
          });

          if (isRevoked) {
            return {
              name: 'VerificationError',
              msg: 'Token revoked',
              __typename: 'TokenVerificationError',
            };
          }
        } catch (err) {
          return {
            name: 'VerificationError',
            msg: err.message,
            __typename: 'TokenVerificationError',
          };
        }

        if (authentification.isRefreshTokenPayload(tokenPayload)) {
          return {
            name: 'VerificationError',
            msg: 'This is token are «Refresh» token type. You should provide «Access» token type',
            __typename: 'TokenVerificationError',
          };
        }

        return {
          __typename: 'TokenVerificationSuccess',
          query: {},
          payload: tokenPayload,
        };
      },
    },
  }),
});

export default AuthentificationQuery;
