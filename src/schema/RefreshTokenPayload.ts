import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from 'graphql';

import TokenType from './TokenType';

const RefreshTokenPayload = new GraphQLObjectType({
  name: 'RefreshTokenPayload',
  description: 'Refresh token payload',
  fields: () => ({
    type: {
      type: new GraphQLNonNull(TokenType),
      resolve: () => 'refresh',
    },
    id: { type: new GraphQLNonNull(GraphQLID) },
    uuid: { type: new GraphQLNonNull(GraphQLID) },
    exp: { type: new GraphQLNonNull(GraphQLInt) },
    iss: { type: GraphQLString },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
  }),
});

export default RefreshTokenPayload;
