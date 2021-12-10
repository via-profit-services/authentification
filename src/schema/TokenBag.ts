import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import AccessToken from './AccessToken';
import RefreshToken from './RefreshToken';

const TokenBag = new GraphQLObjectType({
  name: 'TokenBag',
  fields: {
    accessToken: { type: new GraphQLNonNull(AccessToken) },
    refreshToken: { type: new GraphQLNonNull(RefreshToken) },
  },
});

export default TokenBag;
