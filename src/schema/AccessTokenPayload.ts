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
    type: {
      type: new GraphQLNonNull(TokenType),
      resolve: () => 'access',
    },
    id: { type: new GraphQLNonNull(GraphQLID) },
    uuid: { type: new GraphQLNonNull(GraphQLID) },
    exp: { type: new GraphQLNonNull(GraphQLInt) },
    iss: { type: new GraphQLNonNull(GraphQLString) },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
  }),
});

export default AccessTokenPayload;
