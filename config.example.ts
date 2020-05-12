export const server = {
  port: 3000,
  jwtSecret: 'jwt_secret',
};

export const twitch = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:3000/auth/twitch/callback',
};

export const google = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:3000/auth/google/callback',
};
