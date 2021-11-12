declare module '@via-profit-services/core' {
  import {
    JwtConfig,
    AccessTokenPayload,
    AuthentificationService,
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
  }
}
