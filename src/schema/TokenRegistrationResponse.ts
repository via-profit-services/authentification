import { GraphQLUnionType } from 'graphql';

import TokenRegistrationSuccess from './TokenRegistrationSuccess';
import TokenRegistrationError from './TokenRegistrationError';

const TokenRegistrationResponse = new GraphQLUnionType({
  name: 'TokenRegistrationResponse',
  types: () => [TokenRegistrationSuccess, TokenRegistrationError],
});

export default TokenRegistrationResponse;
