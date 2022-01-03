import { TokenService } from '@via-profit-services/authentification';
import bcryptjs from 'bcryptjs';

import accounts from './accounts';

const tokenService: TokenService = {
  checkTokenRevoke: async props => {
    const { tokenPayload, context } = props;
    const { redis } = context;
    const has = await redis.get(`revoked_${tokenPayload.id}`);

    return has !== null;
  },
  createToken: async props => {
    const { context, login, password } = props;
    const { services, redis } = context;

    // get account by login
    const account = accounts.find(account => account.login === login);

    // return error if account not found or password are invalid
    if (!account || !bcryptjs.compareSync(`${login}.${password}`, account.password)) {
      return 'Invalid login or password';
    }

    // generate tokens pair
    const { accessToken, refreshToken } = services.authentification.generateTokens({
      uuid: account.id,
      roles: account.roles,
    });

    // In this example, we save the token ID in Redis,
    // which allows you to specify the time after which
    // the record will be automatically deleted from store
    await redis.set(
      `token_${accessToken.payload.id}`,
      accessToken.payload.id,
      'EXAT',
      accessToken.payload.exp,
    );
    await redis.set(
      `token_${refreshToken.payload.id}`,
      refreshToken.payload.id,
      'EXAT',
      refreshToken.payload.exp,
    );

    // return both tokens
    return { accessToken, refreshToken };
  },
  refreshToken: async props => {
    const { tokenPayload, context } = props;
    const { services, redis } = context;

    // get account by id
    const account = accounts.find(account => account.id === tokenPayload.uuid);

    // return error if account not found
    if (!account) {
      return 'Account not found';
    }

    // generate tokens pair
    const { accessToken, refreshToken } = services.authentification.generateTokens({
      uuid: account.id,
      roles: account.roles,
    });

    // In this example, we save the token ID in Redis,
    // which allows you to specify the time after which
    // the record will be automatically deleted from store
    await redis.set(`token_${accessToken.payload.id}`, 'access', 'EXAT', accessToken.payload.exp);
    await redis.set(
      `token_${refreshToken.payload.id}`,
      'refresh',
      'EXAT',
      refreshToken.payload.exp,
    );

    // We can remove the ID of old tokens from your storage
    await redis.del(`token_${tokenPayload.id}`, `token_${tokenPayload.associated.id}`);

    // You should put the ID of the old tokens in the blacklist
    // so that authorization for them is no longer possible
    // `tokenPayload` - is a old access token payload data
    await redis.set(`revoked_${tokenPayload.id}`, 'access', 'EXAT', tokenPayload.exp);
    await redis.set(
      `revoked_${tokenPayload.associated.id}`,
      'refresh',
      'EXAT',
      tokenPayload.associated.exp,
    );

    // return both tokens
    return { accessToken, refreshToken };
  },
};

export default tokenService;