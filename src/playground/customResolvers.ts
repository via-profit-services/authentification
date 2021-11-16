import { Context, fieldBuilder } from '@via-profit-services/core';
import { GraphQLFieldResolver } from 'graphql';
import { AccessTokenPayload } from '@via-profit-services/authentification';

import accounts from './accounts';
import { ACCESS_TOKEN_EMPTY_ID } from '../constants';

type Resolvers = {
  Query: {
    me: GraphQLFieldResolver<unknown, Context>;
  };
  Me: MeResolver;
};

type Me = {
  id: string;
  name: string;
  login: string;
  token: AccessTokenPayload;
};

type MeResolver = Record<keyof Me, GraphQLFieldResolver<unknown, Context>>;

const meResolver = fieldBuilder<Me>(
  ['id', 'name', 'login', 'token'],
  field => (_parent, _args, context) => {
    const { token } = context;

    if (token.id === ACCESS_TOKEN_EMPTY_ID) {
      throw new Error('The account was not found or you forgot to provide a valid bearer token');
    }

    // just load account by ID
    const account = accounts.find(acc => acc.id === token.uuid);

    if (!account) {
      throw new Error('Account not found');
    }

    // Load token from context
    if (field === 'token') {
      return context.token;
    }

    return account[field];
  },
);

const customResolvers: Resolvers = {
  Query: {
    me: () => ({}),
  },
  Me: meResolver,
};

export default customResolvers;
