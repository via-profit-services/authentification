/* eslint-disable import/max-dependencies */
import type { MiddlewareFactory, JwtConfig } from '@via-profit-services/authentification';
import { Middleware } from '@via-profit-services/core';
import fs from 'fs';

import AuthentificationService from './services/AuthentificationService';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRED,
  DEFAULT_REFRESH_TOKEN_EXPIRED,
  DEFAULT_SIGNATURE_ALGORITHM,
  DEFAULT_SIGNATURE_ISSUER,
} from './constants';

const factory: MiddlewareFactory = async configuration => {
  const {
    privateKey,
    publicKey,
    algorithm,
    issuer,
    refreshTokenExpiresIn,
    accessTokenExpiresIn,
    createTokenFn,
    refreshTokenFn,
    checkTokenRevokeFn,
  } = configuration;

  const jwt: JwtConfig = {
    issuer: issuer || DEFAULT_SIGNATURE_ISSUER,
    algorithm: algorithm || DEFAULT_SIGNATURE_ALGORITHM,
    accessTokenExpiresIn: accessTokenExpiresIn || DEFAULT_ACCESS_TOKEN_EXPIRED,
    refreshTokenExpiresIn: refreshTokenExpiresIn || DEFAULT_REFRESH_TOKEN_EXPIRED,
    privateKey: Buffer.from(''),
    publicKey: Buffer.from(''),
  };

  try {
    jwt.privateKey = typeof privateKey === 'string' ? fs.readFileSync(privateKey) : privateKey;
    jwt.publicKey = typeof publicKey === 'string' ? fs.readFileSync(publicKey) : publicKey;
  } catch (err) {
    throw new Error('Failed to get private or/and public keys');
  }

  const middleware: Middleware = async ({ context, requestCounter }) => {
    if (requestCounter === 1) {
      // JsonWebToken settings
      context.jwt = jwt;

      // Authentification Service
      context.services.authentification = new AuthentificationService({
        context,
        createTokenFn,
        refreshTokenFn,
        checkTokenRevokeFn,
      });
    }

    const { services } = context;
    const { authentification } = services;

    // Default token state
    context.token = context.services.authentification.getDefaultTokenPayload();

    try {
      const requestToken = authentification.extractTokenFromRequest(context.request);
      if (requestToken) {
        const tokenPayload = await authentification.verifyToken(requestToken);

        if (authentification.isAccessTokenPayload(tokenPayload)) {
          const isRevoked = await authentification.checkTokenRevokeFn({ context, tokenPayload });
          if (!isRevoked) {
            context.token = tokenPayload;
          }
        }
      }
    } catch (err) {
      throw new Error(err);
    }

    return {
      context,
    };
  };

  return {
    middleware,
  };
};

export default factory;
