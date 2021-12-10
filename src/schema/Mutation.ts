import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import AuthentificationMutation from './AuthentificationMutation';

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    authentification: {
      type: new GraphQLNonNull(AuthentificationMutation),
      resolve: () => ({}),
    },
  }),
});

export default Mutation;
