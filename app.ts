import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import * as OAuth2Strategy from 'passport-oauth2';
import { twitch } from './config';

declare module 'koa' {
  interface Context {
    state: {
      user: {
        accessToken: string;
        refreshToken: string;
      };
      [key: string]: any;
    };
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    state: {
      user: {
        accessToken: string;
        refreshToken: string;
      };
      [key: string]: any;
    };
  }
}

export const app = new Koa();

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

    ctx.cookies.set('requestId', requestId);

    await next();
  },
  passport.authenticate('twitch', { session: false, scope: 'user_read' })
);

router.get(
  '/auth/twitch/callback',
  passport.authenticate('twitch', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    ctx.body = {
      requestId: ctx.cookies.get('requestId'),
      state: ctx.state.user,
    };
  }
);

app.use(router.routes());

app.use((ctx) => {
  ctx.throw(404);
});
