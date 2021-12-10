import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import AuthentificationQuery from './AuthentificationQuery';

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    authentification: {
      type: new GraphQLNonNull(AuthentificationQuery),
      resolve: () => ({}),
    },
  }),
});

export default Query;
