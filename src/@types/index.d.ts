declare module '@via-profit-services/authentification' {
  import { Context, Middleware, MaybePromise, MiddlewareProps } from '@via-profit-services/core';
  import { IncomingMessage } from 'http';
  import { Algorithm } from 'jsonwebtoken';
  import { GraphQLFieldResolver, ValidationRule } from 'graphql';

  export interface Configuration {
    /**
     * Cert private key file path or key content
     */
    privateKey: string | Buffer;
    /**
     * Cert public key file path or key content
     */
    publicKey: string | Buffer;

    /**
     * This function is triggered every time an authorization attempt is made \
     * You should return success or error response:
     * ```ts
     * // for success response
     * {
     *   __typename: 'TokenRegistrationSuccess',
     *   payload: TokenPackage,
     *   query: {},
     * }
     * // ... or for error response
     * {
     *    __typename: 'TokenRegistrationError',
     *    name: 'InvalidCredentials',
     *    msg: 'Invalid login or password',
     * }
     * ```
     */
    createTokenFn: CreateTokenFn;

    /**
     * This function is triggered every time a token refresh is attempted \
     * You should return success or error response:
     * ```ts
     * // for success response
     * {
     *   __typename: 'TokenRegistrationSuccess',
     *   payload: TokenPackage,
     *   query: {},
     * }
     * // ... or for error response
     * {
     *    __typename: 'TokenRegistrationError',
     *    name: 'InvalidCredentials',
     *    msg: 'Invalid login or password',
     * }
     * ```
     */
    refreshTokenFn: RefreshTokenFn;

    /**
     * This function is run at every request to check if the token is in the blacklist
     */
    checkTokenRevokeFn: CheckTokenRevokeFn;
    /**
     * Account roles.\
     * The roles that will be passed here will be added
     * to the type: `enum AccountRole`
     */
    roles: AccountRole[];

    /**
     * Signature algorithm. Could be one of these values :
     * - HS256:    HMAC using SHA-256 hash algorithm (default)
     * - HS384:    HMAC using SHA-384 hash algorithm
     * - HS512:    HMAC using SHA-512 hash algorithm
     * - RS256:    RSASSA using SHA-256 hash algorithm
     * - RS384:    RSASSA using SHA-384 hash algorithm
     * - RS512:    RSASSA using SHA-512 hash algorithm
     * - ES256:    ECDSA using P-256 curve and SHA-256 hash algorithm
     * - ES384:    ECDSA using P-384 curve and SHA-384 hash algorithm
     * - ES512:    ECDSA using P-521 curve and SHA-512 hash algorithm
     * - none:     No digital signature or MAC value included
     * \
     * \
     * Default: `RS256`
     */
    algorithm?: Algorithm;

    /**
     * A case-sensitive string or URI that is the unique identifier of the token-generating party\
     * \
     * Default: `via-profit-service`
     */
    issuer?: string;

    /**
     * Unix time that determines the moment when the Access Token becomes invalid\
     * (the access token lifetime in seconds)\
     * \
     * Default: `1800` (30 minutes)
     */
    accessTokenExpiresIn?: number;

    /**
     * Unix time that determines the moment when the Refresh Token becomes invalid\
     * (the refresh token lifetime in seconds)\
     * \
     * Default: `2.592e6`
     */
    refreshTokenExpiresIn?: number;
  }

  export type CreateTokenFn = (props: {
    login: string;
    password: string;
    context: Context;
  }) => MaybePromise<TokenRegistrationResponse>;

  export type RefreshTokenFn = (props: {
    tokenPayload: RefreshTokenPayload;
    context: Context;
  }) => MaybePromise<TokenRegistrationResponse>;

  // export type RevokeTokenFn = (props: {
  //   tokenPayload: AccessTokenPayload;
  //   context: Context;
  // }) => MaybePromise<void>;

  export type CheckTokenRevokeFn = (props: {
    tokenPayload: AccessTokenPayload | RefreshTokenPayload;
    context: Context;
  }) => MaybePromise<boolean>;

  export interface JwtConfig {
    algorithm?: Algorithm;
    issuer?: string;
    accessTokenExpiresIn?: number;
    refreshTokenExpiresIn?: number;
    privateKey: Buffer;
    publicKey: Buffer;
  }

  export type MiddlewareFactory = (config: Configuration) => Promise<{
    resolvers: Resolvers;
    typeDefs: string;
    middleware: Middleware;
  }>;

  export type AccountRole = string;

  export type Resolvers = {
    Query: {
      authentification: GraphQLFieldResolver<unknown, Context>;
    };
    Mutation: {
      authentification: GraphQLFieldResolver<unknown, Context>;
    };
    AuthentificationMutation: {
      create: GraphQLFieldResolver<
        unknown,
        Context,
        {
          login: string;
          password: string;
        }
      >;
      refresh: GraphQLFieldResolver<
        unknown,
        Context,
        {
          refreshToken: string;
        }
      >;
    };
    AuthentificationQuery: {
      tokenPayload: GraphQLFieldResolver<unknown, Context>;
      verifyToken: GraphQLFieldResolver<
        unknown,
        Context,
        {
          token: string;
        }
      >;
    };
  };

  export type TokenBagResolver = Record<
    keyof TokenPackage,
    GraphQLFieldResolver<TokenPackage, Context>
  >;

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
    roles: AccountRole[];

    /**
     * Unix time that determines the moment when the Token becomes invalid
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
     * Access token ID associated value
     */
    associated: string;
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
    roles: AccountRole[];
  }

  /**
   * Authentification service constructor props
   */
  export interface AuthentificationServiceProps {
    context: Context;
    createTokenFn: CreateTokenFn;
    refreshTokenFn: RefreshTokenFn;
    checkTokenRevokeFn: CheckTokenRevokeFn;
  }

  class AuthentificationService {
    props: AuthentificationServiceProps;
    constructor(props: AuthentificationServiceProps);
    createToken(props: Parameters<CreateTokenFn>[0]): MaybePromise<ReturnType<CreateTokenFn>>;
    refreshToken(props: Parameters<RefreshTokenFn>[0]): MaybePromise<ReturnType<RefreshTokenFn>>;
    checkTokenRevokeFn(
      props: Parameters<CheckTokenRevokeFn>[0],
    ): MaybePromise<ReturnType<CheckTokenRevokeFn>>;
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
}
