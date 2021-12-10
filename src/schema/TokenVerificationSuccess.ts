import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import AccessTokenPayload from './AccessTokenPayload';

const TokenVerificationSuccess = new GraphQLObjectType({
  name: 'TokenVerificationSuccess',
  fields: () => ({
    payload: { type: new GraphQLNonNull(AccessTokenPayload) },
  }),
});

export default TokenVerificationSuccess;
