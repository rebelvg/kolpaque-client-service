import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

interface IEnv {
  API_PORT: string;
  API_LOGIN_CALLBACK_URL: string;
  DB_URI: string;
  JWT_SECRET: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  TWITCH_CALLBACK_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  YOUTUBE_API_KEY: string;
  AUTH_SERVICE_LOGIN_URL: string;
  KICK_CLIENT_ID: string;
  KICK_CLIENT_SECRET: string;
  KICK_CALLBACK_URL: string;
}

export const env: IEnv = {
  API_PORT: process.env.API_PORT,
  API_LOGIN_CALLBACK_URL: process.env.API_LOGIN_CALLBACK_URL,
  DB_URI: process.env.DB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  TWITCH_CALLBACK_URL: process.env.TWITCH_CALLBACK_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  AUTH_SERVICE_LOGIN_URL: process.env.AUTH_SERVICE_LOGIN_URL,
  KICK_CLIENT_ID: process.env.KICK_CLIENT_ID,
  KICK_CLIENT_SECRET: process.env.KICK_CLIENT_SECRET,
  KICK_CALLBACK_URL: process.env.KICK_CALLBACK_URL,
};

console.log(env);
