import type {
  AccessTokenPayload,
  TokenPackage,
  RefreshTokenPayload,
  AuthentificationServiceProps,
  AuthentificationService as AuthentificationServiceInterface,
  CreateTokenFn,
  RefreshTokenFn,
  GenerateTokenPayload,
  CheckTokenRevokeFn,
} from '@via-profit-services/authentification';
import { IncomingMessage } from 'http';
import jsonwebtoken from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import {
  TOKEN_BEARER_KEY,
  TOKEN_BEARER,
  ACCESS_TOKEN_EMPTY_ID,
  ACCESS_TOKEN_EMPTY_UUID,
  ACCESS_TOKEN_EMPTY_ISSUER,
} from '../constants';

class AuthentificationService implements AuthentificationServiceInterface {
  props: AuthentificationServiceProps;

  public constructor(props: AuthentificationServiceProps) {
    this.props = props;
  }

  public async createToken(props: Parameters<CreateTokenFn>[0]) {
    const { createTokenFn } = this.props;

    return await createTokenFn(props);
  }

  public async refreshToken(props: Parameters<RefreshTokenFn>[0]) {
    const { refreshTokenFn } = this.props;

    return await refreshTokenFn(props);
  }

  public async checkTokenRevokeFn(props: Parameters<CheckTokenRevokeFn>[0]) {
    const { checkTokenRevokeFn } = this.props;

    return await checkTokenRevokeFn(props);
  }

  public getDefaultTokenPayload(): AccessTokenPayload {
    return {
      type: 'access',
      id: ACCESS_TOKEN_EMPTY_ID,
      uuid: ACCESS_TOKEN_EMPTY_UUID,
      iss: ACCESS_TOKEN_EMPTY_ISSUER,
      roles: [],
      exp: 0,
    };
  }

  /**
   * Generate token pair (access + refresh)
   */
  public generateTokens(
    payload: GenerateTokenPayload,
    exp?: {
      access: number;
      refresh: number;
    },
  ): TokenPackage {
    const { context } = this.props;
    const { accessTokenExpiresIn, refreshTokenExpiresIn, issuer, algorithm, privateKey } =
      context.jwt;

    const accessExpires = exp?.access ?? accessTokenExpiresIn;
    const refreshExpires = exp?.refresh ?? refreshTokenExpiresIn;

    const accessTokenPayload: AccessTokenPayload = {
      ...payload,
      type: 'access',
      id: uuidv4(),
      exp: Math.floor(Date.now() / 1000) + Number(accessExpires),
      iss: issuer,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      ...payload,
      type: 'refresh',
      id: uuidv4(),
      exp: Math.floor(Date.now() / 1000) + Number(refreshExpires),
      iss: issuer,
      associated: accessTokenPayload,
    };

    const accessTokenString = jsonwebtoken.sign(accessTokenPayload, privateKey, { algorithm });
    const refreshTokenString = jsonwebtoken.sign(refreshTokenPayload, privateKey, { algorithm });

    return {
      accessToken: {
        token: accessTokenString,
        payload: accessTokenPayload,
      },
      refreshToken: {
        token: refreshTokenString,
        payload: refreshTokenPayload,
      },
    };
  }
  public extractTokenFromSubscription(connectionParams: any): string | false {
    if (typeof connectionParams === 'object' && TOKEN_BEARER_KEY in connectionParams) {
      const [bearer, token] = String(connectionParams[TOKEN_BEARER_KEY]).split(' ');

      if (bearer === TOKEN_BEARER && token !== '') {
        return String(token);
      }
    }

    return false;
  }

  public extractTokenFromRequest(request: IncomingMessage): string | false {
    const { headers } = request;

    // try to get access token from headers
    if (TOKEN_BEARER_KEY.toLocaleLowerCase() in headers) {
      const [bearer, tokenFromHeader] = String(headers[TOKEN_BEARER_KEY.toLocaleLowerCase()]).split(
        ' ',
      );

      if (bearer === TOKEN_BEARER && tokenFromHeader !== '') {
        return String(tokenFromHeader);
      }
    }

    return false;
  }

  public async verifyToken(token: string): Promise<AccessTokenPayload | RefreshTokenPayload> {
    const { context } = this.props;
    const { jwt } = context;
    const { privateKey, algorithm } = jwt;

    const payload = jsonwebtoken.verify(String(token), privateKey, {
      algorithms: [algorithm],
    }) as AccessTokenPayload | RefreshTokenPayload;

    return payload;
  }

  public isAccessTokenPayload(
    payload: AccessTokenPayload | RefreshTokenPayload,
  ): payload is AccessTokenPayload {
    return payload.type === 'access';
  }

  public isRefreshTokenPayload(
    payload: AccessTokenPayload | RefreshTokenPayload,
  ): payload is RefreshTokenPayload {
    return payload.type === 'refresh';
  }
}

export default AuthentificationService;
