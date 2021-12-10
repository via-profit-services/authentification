import { Context } from '@via-profit-services/core';
import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
} from 'graphql';

import accounts from './accounts';
import { ACCESS_TOKEN_EMPTY_ID } from '../constants';
import AccessTokenPayload from '../schema/AccessTokenPayload';

const MeType = new GraphQLObjectType({
  name: 'Me',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    login: { type: new GraphQLNonNull(GraphQLString) },
    token: { type: new GraphQLNonNull(AccessTokenPayload) },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
  },
});

const Query = new GraphQLObjectType<unknown, Context>({
  name: 'Query',
  fields: () => ({
    me: {
      type: new GraphQLNonNull(MeType),
      resolve: async (_parent, _args, context) => {
        const { token } = context;

        if (token.id === ACCESS_TOKEN_EMPTY_ID) {
          throw new Error(
            'The account was not found or you forgot to provide a valid bearer token. ' +
              'Make sure that you pass the http header «Authorization: Bearer <Token>»',
          );
        }

        // just load account by ID
        const account = accounts.find(acc => acc.id === token.uuid);

        if (!account) {
          throw new Error('Account not found');
        }

        return {
          id: account.id,
          name: account.name,
          login: account.login,
          token: context.token,
          roles: context.token.roles,
        };
      },
    },
  }),
});

const customSchema = new GraphQLSchema({
  description: 'custom schema',
  query: Query,
});

export default customSchema;
