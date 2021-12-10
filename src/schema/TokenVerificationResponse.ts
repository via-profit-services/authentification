import { GraphQLUnionType } from 'graphql';

import TokenVerificationSuccess from './TokenVerificationSuccess';
import TokenVerificationError from './TokenVerificationError';

const TokenVerificationResponse = new GraphQLUnionType({
  name: 'TokenVerificationResponse',
  types: () => [TokenVerificationSuccess, TokenVerificationError],
});

export default TokenVerificationResponse;
