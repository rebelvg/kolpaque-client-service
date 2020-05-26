export const SERVER = {
  port: 8000,
  jwtSecret: 'jwt_secret',
};

export const TWITCH = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:8000/auth/twitch/callback',
};

export const GOOGLE = {
  clientId: 'client_id',
  clientSecret: 'client_secret',
  callbackUrl: 'http://localhost:8000/auth/google/callback',
};

export const YOUTUBE = {
  apiKey: 'api_key',
};

export const DB_HOST = 'localhost';
export const DB_NAME = 'klpqclient';
