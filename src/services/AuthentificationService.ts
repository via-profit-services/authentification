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

    const accessTokenPayload = {
      ...payload,
      type: 'access',
      id: uuidv4(),
      exp: Math.floor(Date.now() / 1000) + Number(accessExpires),
      iss: issuer,
    };

    const refreshTokenPayload = {
      ...payload,
      type: 'refresh',
      id: uuidv4(),
      associated: accessTokenPayload.id,
      exp: Math.floor(Date.now() / 1000) + Number(refreshExpires),
      iss: issuer,
    };

    const accessTokenString = jsonwebtoken.sign(accessTokenPayload, privateKey, { algorithm });
    const refreshTokenString = jsonwebtoken.sign(refreshTokenPayload, privateKey, { algorithm });

    return {
      accessToken: {
        token: accessTokenString,
        payload: {
          ...accessTokenPayload,
          type: 'access',
        },
      },
      refreshToken: {
        token: refreshTokenString,
        payload: {
          ...refreshTokenPayload,
          type: 'refresh',
        },
      },
    };
  }

  /**
   * Generate new tokens pair and register it
   */
  // public async createTokens(data: { uuid: string }): Promise<TokenPackage> {
  //   const { context } = this.props;
  //   const { services } = context;
  //   const { uuid } = data;

  //   const account = await services.accounts.getAccount(uuid);

  //   if (!account) {
  //     throw new Error(`Account with id[${uuid}] not found`);
  //   }

  //   const tokens = this.generateTokens({
  //     uuid: account.id,
  //     roles: account.roles,
  //   });

  //   try {
  //     await knex('tokens').insert([
  //       {
  //         id: tokens.accessToken.payload.id,
  //         account: tokens.accessToken.payload.uuid,
  //         type: 'access',
  //         // expiredAt: moment(tokens.accessToken.payload.exp * 1000).format(),
  //         expiredAt: new Date(tokens.accessToken.payload.exp * 1000).toISOString(),
  //       },
  //       {
  //         id: tokens.refreshToken.payload.id,
  //         account: tokens.refreshToken.payload.uuid,
  //         type: 'refresh',
  //         associated: tokens.accessToken.payload.id,
  //         expiredAt: new Date(tokens.refreshToken.payload.exp * 1000).toISOString(),
  //       },
  //     ]);
  //   } catch (err) {
  //     throw new Error('Failed to register tokens');
  //   }

  //   console.info('New Access token was registered', {
  //     accessTokenID: tokens.accessToken.payload.id,
  //     refreshTokenID: tokens.refreshToken.payload.id,
  //   });

  //   return tokens;
  // }

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

  // public async revokeAccountTokens(account: string): Promise<string[]> {
  //   const {} = this.props.context;

  //   const allTokens = await knex('tokens')
  //     .select(['id'])
  //     .where({ account })
  //     .where('expiredAt', '>=', knex.raw('now()'));

  //   const ids = allTokens.map((token: { id: string }) => token.id);

  //   if (ids.length) {
  //     await this.revokeToken(ids);
  //   }

  //   return ids;
  // }

  // public async revokeToken(accessTokenIdOrIds: string | string[]) {
  //   const { context } = this.props;
  //   const { redis } = context;

  //   const ids = Array.isArray(accessTokenIdOrIds) ? accessTokenIdOrIds : [accessTokenIdOrIds];

  //   this.tokenAddToBlacklist(ids)
  //   console.info('New tokens has been added in BlackList', { tokenIds: ids });

  //   const tokensList = await knex('tokens')
  //     .select(['tokens.account', 'tokens.id as access', 'refreshTokens.id as refresh'])
  //     .leftJoin('accounts', 'accounts.id', 'tokens.account')
  //     .leftJoin('tokens as refreshTokens', 'refreshTokens.associated', 'tokens.id')
  //     .whereIn('tokens.id', ids);

  //   tokensList.forEach((data: { account: string; access: string; refresh: string }) => {
  //     console.info(`Revoke Access Token ${data.access} for account ${data.account}`, { data });
  //     console.info(`Revoke Refresh Token ${data.refresh} for account ${data.account}`, {
  //       data,
  //     });
  //   });
  // }

  // public async tokenAddToBlacklist(accessTokenIdOrIds: string | string[]) {
  //   const { context } = this.props;
  //   const ids = Array.isArray(accessTokenIdOrIds) ? accessTokenIdOrIds : [accessTokenIdOrIds];

  //   context.redis.sadd(REDIS_TOKENS_BLACKLIST, ids);
  // }

  // public async tokenRemoveFromBlacklist(accessTokenIdOrIds: string | string[]) {
  //   const { context } = this.props;
  //   const ids = Array.isArray(accessTokenIdOrIds) ? accessTokenIdOrIds : [accessTokenIdOrIds];

  //   context.redis.srem(REDIS_TOKENS_BLACKLIST, ids);
  // }
}

export default AuthentificationService;
