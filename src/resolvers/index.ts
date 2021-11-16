import { fieldBuilder } from '@via-profit-services/core';
import type { Resolvers } from '@via-profit-services/authentification';

import AuthentificationMutation from './AuthentificationMutation';
import AuthentificationQuery from './AuthentificationQuery';
import Mutation from './Mutation';
import Query from './Query';

const resolvers: Resolvers & any = {
  Mutation,
  AuthentificationQuery,
  AuthentificationMutation,
  Query,
};

export default resolvers;
