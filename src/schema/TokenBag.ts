import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import AccessToken from './AccessToken';
import RefreshToken from './RefreshToken';

const TokenBag = new GraphQLObjectType({
  name: 'TokenBag',
  description: 'Tokens pair (Access and Refresh)',
  fields: {
    accessToken: { type: new GraphQLNonNull(AccessToken) },
    refreshToken: { type: new GraphQLNonNull(RefreshToken) },
  },
});

export default TokenBag;
