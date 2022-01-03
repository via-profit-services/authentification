import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';

import TokenType from './TokenType';

const AccessTokenPayload = new GraphQLObjectType({
  name: 'AccessTokenPayload',
  description: 'Access token payload',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    uuid: { type: new GraphQLNonNull(GraphQLID) },
    exp: { type: new GraphQLNonNull(GraphQLInt) },
    iss: { type: GraphQLString },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    type: {
      type: new GraphQLNonNull(TokenType),
      resolve: () => 'access',
    },
  }),
});

export default AccessTokenPayload;
