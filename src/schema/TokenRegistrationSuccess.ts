import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import Query from './Query';
import TokenBag from './TokenBag';

const TokenRegistrationSuccess = new GraphQLObjectType({
  name: 'TokenRegistrationSuccess',
  fields: () => ({
    query: { type: new GraphQLNonNull(Query) },
    payload: { type: new GraphQLNonNull(TokenBag) },
  }),
});

export default TokenRegistrationSuccess;
