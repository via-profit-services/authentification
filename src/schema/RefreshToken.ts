import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';

import RefreshTokenPayload from './RefreshTokenPayload';

const RefreshToken = new GraphQLObjectType({
  name: 'RefreshToken',
  description: 'Access token package',
  fields: () => ({
    token: { type: new GraphQLNonNull(GraphQLString) },
    payload: { type: new GraphQLNonNull(RefreshTokenPayload) },
  }),
});

export default RefreshToken;
