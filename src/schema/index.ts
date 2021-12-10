/* eslint-disable import/max-dependencies */
import { GraphQLSchema } from 'graphql';

import Query from './Query';
import Mutation from './Mutation';
import AuthentificationQueryType from './AuthentificationQuery';
import AuthentificationMutationType from './AuthentificationMutation';
import TokenTypeType from './TokenType';
import TokenBagType from './TokenBag';
import AccessTokenType from './AccessToken';
import RefreshTokenType from './RefreshToken';
import AccessTokenPayloadType from './AccessTokenPayload';
import RefreshTokenPayloadType from './RefreshTokenPayload';
import TokenRegistrationResponseType from './TokenRegistrationResponse';
import TokenRegistrationSuccessType from './TokenRegistrationSuccess';
import TokenRegistrationErrorType from './TokenRegistrationError';
import TokenVerificationResponseType from './TokenVerificationResponse';
import TokenVerificationSuccessType from './TokenVerificationSuccess';
import TokenVerificationErrorType from './TokenVerificationError';

const schema = new GraphQLSchema({
  description: 'Authentification schema',
  query: Query,
  mutation: Mutation,
});

export {
  schema,
  AuthentificationQueryType,
  AuthentificationMutationType,
  TokenTypeType,
  TokenBagType,
  AccessTokenType,
  RefreshTokenType,
  AccessTokenPayloadType,
  RefreshTokenPayloadType,
  TokenRegistrationResponseType,
  TokenRegistrationSuccessType,
  TokenRegistrationErrorType,
  TokenVerificationResponseType,
  TokenVerificationSuccessType,
  TokenVerificationErrorType,
};

export default schema;
