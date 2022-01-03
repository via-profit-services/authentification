import type { MiddlewareFactory } from '@via-profit-services/authentification';
import { Middleware } from '@via-profit-services/core';

import AuthentificationService from './services/AuthentificationService';

const factory: MiddlewareFactory = async configuration => {
  const { jwt, tokenService } = configuration;

  const middleware: Middleware = async ({ context }) => {
    const { services } = context;

    context.jwt = context.jwt ?? jwt;
    services.tokenService = services.tokenService ?? tokenService;

    services.authentification = services.authentification ?? new AuthentificationService(jwt);
    const { authentification } = services;

    // Default token state
    context.token = authentification.getDefaultTokenPayload();

    try {
      const requestToken = authentification.extractTokenFromRequest(context.request);
      if (requestToken) {
        const tokenPayload = await authentification.verifyToken(requestToken);

        if (authentification.isAccessTokenPayload(tokenPayload)) {
          const isRevoked = await services.tokenService.checkTokenRevoke({ context, tokenPayload });
          if (!isRevoked) {
            context.token = tokenPayload;
          }
        }
      }
    } catch (err) {
      throw new Error(err);
    }
  };

  return middleware;
};

export default factory;
