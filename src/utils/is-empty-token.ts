import { ACCESS_TOKEN_EMPTY_ID } from '../constants';
import type { IsEmptyToken } from '@via-profit-services/authentification';

const isEmptyToken: IsEmptyToken = tokenPayload => {
  const { id } = tokenPayload;

  return typeof id === 'undefined' || id === ACCESS_TOKEN_EMPTY_ID;
};

export default isEmptyToken;
