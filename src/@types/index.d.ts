declare module '@via-profit-services/authentification' {
  import { Context, Middleware, MaybePromise, MiddlewareProps } from '@via-profit-services/core';
  import { IncomingMessage } from 'http';
  import { Algorithm } from 'jsonwebtoken';
  import {
    GraphQLEnumType,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLUnionType,
    ValidationRule,
  } from 'graphql';

  export interface Configuration {
    readonly jwt: JwtConfig;
    readonly tokenService: TokenService;
  }

  export type TokenService = {
    /**
     * This function is triggered every time an authorization attempt is made \
     * You should return tokens pair or error message or false\
     * \
     * **Example**:
     * ```js
     * ...
     * const account = await services.accounts.getAccount(login, password);
     * // you can return error message string or false
     * if (!account) {
     *  return 'Invalid login or password';
     * }
     *
     * // for success response
     * return services.authentification.generateTokens({
     *   uuid: account.id,
     *   roles: account.roles,
     * });
     * ```
     */
    createToken: CreateTokenFn;

    /**
     * This function is triggered every time a token refresh is attempted \
     * You should return new tokens pair or error message or false\
     * \
     * **Example**:
     * ```js
     * ...
     * const account = await services.accounts.getAccount(tokenPayload.uuid);
     * // you can return error message string or false
     * if (!account) {
     *  return 'Account not found';
     * }
     *
     * // for success response
     * return services.authentification.generateTokens({
     *   uuid: account.id,
     *   roles: account.roles,
     * });
     * ```
     */
    refreshToken: RefreshTokenFn;

    /**
     * This function is run at every request to check if the token is in the blacklist
     */
    checkTokenRevoke: CheckTokenRevokeFn;
  };

  export type CreateTokenFn = (props: {
    login: string;
    password: string;
    context: Context;
  }) => MaybePromise<false | string | TokenPackage>;

  export type RefreshTokenFn = (props: {
    tokenPayload: RefreshTokenPayload;
    context: Context;
  }) => MaybePromise<false | string | TokenPackage>;

  export type CheckTokenRevokeFn = (props: {
    tokenPayload: AccessTokenPayload | RefreshTokenPayload;
    context: Context;
  }) => MaybePromise<boolean>;

  export interface JwtConfig {
    /**
     * Signature algorithm. Could be one of these values :
     * - HS256:    HMAC using SHA-256 hash algorithm
     * - HS384:    HMAC using SHA-384 hash algorithm
     * - HS512:    HMAC using SHA-512 hash algorithm
     * - RS256:    RSASSA using SHA-256 hash algorithm
     * - RS384:    RSASSA using SHA-384 hash algorithm
     * - RS512:    RSASSA using SHA-512 hash algorithm
     * - ES256:    ECDSA using P-256 curve and SHA-256 hash algorithm
     * - ES384:    ECDSA using P-384 curve and SHA-384 hash algorithm
     * - ES512:    ECDSA using P-521 curve and SHA-512 hash algorithm
     * - none:     No digital signature or MAC value included
     */
    readonly algorithm: Algorithm;
    /**
     * Cert private key
     */
    readonly privateKey: Buffer;
    /**
     * Cert public key
     */
    readonly publicKey: Buffer;
    /**
     * Unix time that determines the moment when the Access Token becomes invalid\
     * (the access token lifetime in seconds)\
     * \
     * Unit: `seconds`\
     * Example: `1800` (30 minutes)
     */
    readonly accessTokenExpiresIn: number;

    /**
     * Unix time that determines the moment when the Refresh Token becomes invalid\
     * (the refresh token lifetime in seconds)\
     * \
     * Unit: `seconds`\
     * Example: `2.592e6` (30 days)
     */
    readonly refreshTokenExpiresIn: number;

    /**
     * A case-sensitive string or URI that is the unique identifier of the token-generating party
     */
    readonly issuer?: string;

    /**
     * An array of case-sensitive string or URI \
     * that is the unique identifier of the token-generating party
     */
    readonly verifiedIssuers?: string[];
  }

  export type MiddlewareFactory = (config: Configuration) => Middleware;

  export type TokenRegistrationResponseSuccess = {
    __typename: 'TokenRegistrationSuccess';
    payload: TokenPackage;
    query: Record<string, any>;
  };

  export type TokenRegistrationResponseFailure = {
    name: string;
    msg: string;
    __typename: 'TokenRegistrationError';
  };

  export type TokenRegistrationResponse =
    | TokenRegistrationResponseSuccess
    | TokenRegistrationResponseFailure;

  export type TokenVerificationResponse =
    | TokenVerificationResponseSuccess
    | TokenVerificationResponseFailure;

  export type TokenVerificationResponseSuccess = {
    __typename: 'TokenVerificationSuccess';
    payload: AccessTokenPayload;
    query: Record<string, any>;
  };

  export type TokenVerificationResponseFailure = {
    name: string;
    msg: string;
    __typename: 'TokenVerificationError';
  };

  export interface TokenPackage {
    accessToken: {
      token: string;
      payload: AccessTokenPayload;
    };
    refreshToken: {
      token: string;
      payload: RefreshTokenPayload;
    };
  }

  export type AccessTokenPayload = {
    /**
     * Token type (only for internal identify)
     */
    type: 'access';
    /**
     * Token ID
     */
    id: string;

    /**
     * Account ID
     */
    uuid: string;

    /**
     * Account roles array
     */
    roles: string[];

    /**
     * Unix time that determines the moment when the Token becomes invalid\
     * Unit: `seconds`
     * ```js
     * // Check that the token has expired:
     * const isExpired = new Date().getTime() / 1000 > token.exp;
     * ```
     *
     */
    exp: number;

    /**
     * A case-sensitive string or URI that is the unique identifier of the token-generating party
     */
    iss: string;
  };

  export type RefreshTokenPayload = Omit<AccessTokenPayload, 'type'> & {
    /**
     * Token type (only for internal identify)
     */
    type: 'refresh';

    /**
     * Associated Access token info
     */
    associated: AccessTokenPayload;
  };

  export interface AccessToken {
    token: string;
    payload: AccessTokenPayload;
  }

  export interface RefreshToken {
    token: string;
    payload: RefreshTokenPayload;
  }

  export type ValidatioRuleMiddleware = (props: {
    context: Context;
    configuration: Configuration;
    config: MiddlewareProps['config'];
  }) => MaybePromise<ValidationRule>;

  export interface GenerateTokenPayload {
    uuid: string;
    roles: string[];
  }

  export class AuthentificationService {
    jwt: JwtConfig;
    constructor(jwt: JwtConfig);
    /**
     * Generate token pair (access + refresh)
     */
    generateTokens(
      payload: GenerateTokenPayload,
      exp?: {
        access: number;
        refresh: number;
      },
    ): TokenPackage;
    getDefaultTokenPayload(): AccessTokenPayload;
    extractTokenFromRequest(request: IncomingMessage): string | false;
    verifyToken(token: string): Promise<AccessTokenPayload | RefreshTokenPayload>;
    isAccessTokenPayload(
      payload: AccessTokenPayload | RefreshTokenPayload,
    ): payload is AccessTokenPayload;
    isRefreshTokenPayload(
      payload: AccessTokenPayload | RefreshTokenPayload,
    ): payload is RefreshTokenPayload;
  }

  export type IsEmptyToken = (tokenPayload: AccessTokenPayload) => boolean;

  export const factory: MiddlewareFactory;
  export const schema: GraphQLSchema;
  export const AuthentificationQueryType: GraphQLObjectType;
  export const AuthentificationMutationType: GraphQLObjectType;
  export const TokenTypeType: GraphQLEnumType;
  export const TokenBagType: GraphQLObjectType;
  export const AccessTokenType: GraphQLObjectType;
  export const RefreshTokenType: GraphQLObjectType;
  export const AccessTokenPayloadType: GraphQLObjectType;
  export const RefreshTokenPayloadType: GraphQLObjectType;
  export const TokenRegistrationResponseType: GraphQLUnionType;
  export const TokenRegistrationSuccessType: GraphQLObjectType;
  export const TokenRegistrationErrorType: GraphQLObjectType;
  export const TokenVerificationResponseType: GraphQLUnionType;
  export const TokenVerificationSuccessType: GraphQLObjectType;
  export const TokenVerificationErrorType: GraphQLObjectType;
  export const isEmptyToken: IsEmptyToken;
}

declare module '@via-profit-services/core' {
  import {
    JwtConfig,
    AccessTokenPayload,
    AuthentificationService,
    TokenService,
  } from '@via-profit-services/authentification';

  interface Context {
    /**
     * JWT configuration.
     * @see [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
     */
    jwt: JwtConfig;
    /**
     * Access token payload
     */
    token: AccessTokenPayload;
  }

  interface ServicesCollection {
    /**
     * Authentification service
     */
    authentification: AuthentificationService;
    /**
     * Authentification service
     */
    tokenService: TokenService;
  }
}
