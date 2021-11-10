import { env } from './env';

export const SERVER = {
  PORT: Number.parseInt(env.API_PORT) || env.API_PORT,
  JWT_SECRET: env.JWT_SECRET,
  CALLBACK_URL: env.API_LOGIN_CALLBACK_URL,
};

export const TWITCH = {
  CLIENT_ID: env.TWITCH_CLIENT_ID,
  CLIENT_SECRET: env.TWITCH_CLIENT_SECRET,
  CALLBACK_URL: env.TWITCH_CALLBACK_URL,
};

export const GOOGLE = {
  CLIENT_ID: env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  CALLBACK_URL: env.GOOGLE_CALLBACK_URL,
};

export const YOUTUBE = {
  API_KEY: env.YOUTUBE_API_KEY,
};

export const DB_URI = env.DB_URI;

export const API = {
  AUTH_SERVICE_URL: env.AUTH_SERVICE_LOGIN_URL,
};
