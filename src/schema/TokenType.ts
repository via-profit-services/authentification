import { GraphQLEnumType } from 'graphql';

const TokenType = new GraphQLEnumType({
  name: 'TokenType',
  description: 'Token type',
  values: {
    access: {
      value: 'access',
      description: 'Access token type',
    },
    refresh: {
      value: 'refresh',
      description: 'Refresh token type',
    },
  },
});

export default TokenType;
