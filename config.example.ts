export const SERVER = {
  PORT: 8000,
  JWT_SECRET: 'jwt_secret',
  CALLBACK_URL: 'http://localhost:8000',
};

export const TWITCH = {
  CLIENT_UD: 'client_id',
  CLIENT_SECRET: 'client_secret',
  CALLBACK_URL: 'http://localhost:8000/auth/twitch/callback',
};

export const GOOGLE = {
  CLIENT_ID: 'client_id',
  CLIENT_SECRET: 'client_secret',
  CALLBACK_URL: 'http://localhost:8000/auth/google/callback',
};

export const YOUTUBE = {
  API_KEY: 'api_key',
};

export const DB_URI = 'mongodb://USERNAME:PASSWORD@HOST/DATABASE';

export const API = {
  AUTH_SERVICE_URL: 'http://localhost:9000',
};
