import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as http from 'http';
import axios from 'axios';

import { twitch } from './config';
import { publishToken } from './socket';

export interface IUser {
  accessToken: string;
  refreshToken: string;
}

declare module 'koa' {
  interface Context {
    state: {
      user: IUser;
      [key: string]: any;
    };
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    state: {
      user: IUser;
      [key: string]: any;
    };
  }
}

export const app = new Koa();

export const server = http.createServer(app.callback());

app.use(passport.initialize());

passport.use(
  'twitch',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: twitch.clientId,
      clientSecret: twitch.clientSecret,
      callbackURL: twitch.callbackUrl,
    },
    function (accessToken, refreshToken, profile, done) {
      const user = {
        accessToken,
        refreshToken,
      };

      done(null, user);
    }
  )
);

app.proxy = true;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});

const router = new Router();

router.get(
  '/auth/twitch',
  async (ctx, next) => {
    const { requestId } = ctx.query;

    if (!requestId) {
      throw new Error('no_request_id');
    }

    await next();
  },
  async (ctx, next) => {
    const { requestId } = ctx.query;

    ctx.cookies.set('requestId', requestId);

    await next();
  },
  passport.authenticate('twitch', { session: false, scope: 'user_read' })
);

router.get(
  '/auth/twitch/callback',
  passport.authenticate('twitch', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishToken(requestId, user);

    ctx.body = 'sign_in_successful';
  }
);

router.get(
  '/auth/twitch/refresh',
  async (ctx, next) => {
    const { refreshToken } = ctx.query;

    if (!refreshToken) {
      throw new Error('no_refresh_token');
    }

    await next();
  },
  async (ctx, next) => {
    const { refreshToken } = ctx.query;

    const params = new URLSearchParams();

    params.append('client_id', twitch.clientId);
    params.append('client_secret', twitch.clientSecret);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const { data } = await axios.post('https://id.twitch.tv/oauth2/token', params);

    ctx.body = data;
  }
);

app.use(router.routes());

app.use((ctx) => {
  ctx.throw(404);
});
