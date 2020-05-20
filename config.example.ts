export const server = {
  port: 8000,
  jwtSecret: 'jwt_secret',
};

export const twitch = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:8000/auth/twitch/callback',
};

export const google = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:8000/auth/google/callback',
};

export const youtube = {
  apiKey: 'api_key',
};

export const DB_HOST = 'localhost';
export const DB_NAME = 'klpqclient';
