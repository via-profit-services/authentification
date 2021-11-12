import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  Resolvers,
} from '@via-profit-services/authentification';

const authentificationMutation: Resolvers['AuthentificationMutation'] = {
  create: async (_parent, args, context) => {
    const { login, password } = args;
    const { services } = context;
    const { authentification } = services;

    const response = await authentification.createToken({
      context,
      login,
      password,
    });

    if (response.__typename === 'TokenRegistrationSuccess') {
      context.token = response.payload.accessToken.payload;
    }

    return response;
  },

  refresh: async (_parent, args, context) => {
    const { refreshToken } = args;
    const { services } = context;
    const { authentification } = services;

    let tokenPayload: RefreshTokenPayload | AccessTokenPayload;
    try {
      tokenPayload = await authentification.verifyToken(refreshToken);
    } catch (err) {
      throw new Error(err.message);
    }

    if (!authentification.isRefreshTokenPayload(tokenPayload)) {
      throw new Error(
        'This is token are not «Refresh» token type. You should provide «Refresh» token type',
      );
    }

    const response = await authentification.refreshToken({
      context,
      tokenPayload,
    });

    if (response.__typename === 'TokenRegistrationSuccess') {
      context.token = response.payload.accessToken.payload;
    }

    return response;
  },
};

export default authentificationMutation;
