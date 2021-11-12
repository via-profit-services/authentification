import {
  Resolvers,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@via-profit-services/authentification';

const authentificationQuery: Resolvers['AuthentificationQuery'] = {
  tokenPayload: async (_parent, _args, context) => {
    const { token } = context;

    return token;
  },
  verifyToken: async (_parent, args, context) => {
    const { token } = args;
    const { services } = context;
    const { authentification } = services;

    let tokenPayload: AccessTokenPayload | RefreshTokenPayload;

    try {
      tokenPayload = await authentification.verifyToken(token);
    } catch (err) {
      return {
        name: 'VerificationError',
        msg: err.message,
        __typename: 'TokenVerificationError',
      };
    }

    try {
      const isRevoked = await authentification.checkTokenRevokeFn({
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
};

export default authentificationQuery;
