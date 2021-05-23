import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as http from 'http';
import axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import * as bodyParser from 'koa-bodyparser';
import * as koaSession from 'koa-session';

import { SERVER, TWITCH, GOOGLE, API } from '../config';
import { publishTwitchUser, publishYoutubeUser } from './socket-server';
import { youtubeClient } from './clients';
import { MongoCollections } from './mongo';

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

app.proxy = true;

app.use(bodyParser({ enableTypes: ['json'] }));

export const httpServer = http.createServer(app.callback());

app.use(passport.initialize());

passport.use(
  'twitch',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: TWITCH.CLIENT_ID,
      clientSecret: TWITCH.CLIENT_SECRET,
      callbackURL: TWITCH.CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      const user: IUser = {
        accessToken,
        refreshToken,
      };

      done(null, user);
    },
  ),
);

passport.use(
  'google',
  new OAuth2Strategy(
    {
      authorizationURL:
        'https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&access_type=offline',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientID: GOOGLE.CLIENT_ID,
      clientSecret: GOOGLE.CLIENT_SECRET,
      callbackURL: GOOGLE.CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      const user: IUser = {
        accessToken,
        refreshToken,
      };

      done(null, user);
    },
  ),
);

app.proxy = true;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error(error);

    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});

app.keys = [uuid.v4()];

app.use(koaSession({ signed: true }, app));

const router = new Router();

router.get(
  '/auth/twitch',
  async (ctx, next) => {
    const { requestId } = ctx.query;

    if (!requestId) {
      throw new Error('no_request_id');
    }

    ctx.cookies.set('requestId', requestId as string);

    await next();
  },
  passport.authenticate('twitch', { session: false, scope: 'user_read' }),
);

router.get(
  '/auth/google',
  async (ctx, next) => {
    const { requestId } = ctx.query;

    if (!requestId) {
      throw new Error('no_request_id');
    }

    ctx.cookies.set('requestId', requestId as string);

    await next();
  },
  passport.authenticate('google', {
    session: false,
    scope: ['https://www.googleapis.com/auth/youtube.readonly'],
  }),
);

router.get(
  '/auth/twitch/callback',
  passport.authenticate('twitch', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishTwitchUser(requestId, user);

    ctx.body = 'sign_in_successful';
  },
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishYoutubeUser(requestId, user);

    ctx.body = 'sign_in_successful';
  },
);

router.get('/auth/twitch/refresh', async (ctx, next) => {
  const { refreshToken } = ctx.query;

  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  const params = new URLSearchParams();

  params.append('client_id', TWITCH.CLIENT_ID);
  params.append('client_secret', TWITCH.CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken as string);

  const { data } = await axios.post(
    'https://id.twitch.tv/oauth2/token',
    params,
  );

  ctx.body = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
});

router.get('/auth/google/refresh', async (ctx, next) => {
  ctx.body = null;

  return;

  const { refreshToken } = ctx.query;

  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  const params = new URLSearchParams();

  params.append('client_id', GOOGLE.CLIENT_ID);
  params.append('client_secret', GOOGLE.CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken as string);

  const { data } = await axios.post(
    'https://www.googleapis.com/oauth2/v4/token',
    params,
  );

  ctx.body = {
    accessToken: data.access_token,
    refreshToken,
  };
});

router.get('/youtube/channels', async (ctx, next) => {
  const { channelName } = ctx.query;
  const jwt = ctx.get('jwt');

  // jsonwebtoken.verify(jwt, SERVER.JWT_SECRET, { ignoreExpiration: true });

  ctx.body = await youtubeClient.getChannels(channelName as string, ctx.ip);
});

router.get('/youtube/streams', async (ctx, next) => {
  const { channelId } = ctx.query;
  const jwt = ctx.get('jwt');

  // jsonwebtoken.verify(jwt, SERVER.JWT_SECRET, { ignoreExpiration: true });

  ctx.body = await youtubeClient.getStreams(channelId as string, ctx.ip);
});

router.get('/auth', async (ctx, next) => {
  const jwt = jsonwebtoken.sign({ isLoggedIn: true }, SERVER.JWT_SECRET, {
    noTimestamp: true,
  });

  ctx.body = {
    jwt,
  };
});

router.get('/klpq/auth', async (ctx, next) => {
  const redirectUri = `${SERVER.CALLBACK_URL}/auth/callback?token=`;

  ctx.session.token = jsonwebtoken.sign({}, SERVER.JWT_SECRET, {
    expiresIn: '1m',
  });

  ctx.redirect(
    `${API.AUTH_SERVICE_URL}?redirectUri=${encodeURIComponent(redirectUri)}`,
  );
});

router.get('/klpq/auth/callback', (ctx, next) => {
  const { token: jwtToken } = ctx.query;
  const { token: verifyToken } = ctx.session;

  jsonwebtoken.verify(verifyToken, SERVER.JWT_SECRET);

  const jwt = jsonwebtoken.sign({ jwtToken }, SERVER.JWT_SECRET, {
    noTimestamp: true,
  });

  ctx.body = {
    jwt,
  };
});

router.get('/sync/:id', async (ctx, next) => {
  const { id } = ctx.params;

  const { Sync } = MongoCollections;

  const syncRecord = await Sync.findOne({
    id,
  });

  if (!syncRecord) {
    ctx.status = 404;

    return;
  }

  ctx.body = syncRecord;
});

router.post('/sync', async (ctx, next) => {
  const { id, channels } = ctx.request.body;

  const { Sync } = MongoCollections;

  if (!id) {
    const id = uuid.v4();

    await Sync.insertOne({
      id,
      channels,
      createdDate: new Date(),
      updateDate: new Date(),
      ipCreated: ctx.ip,
      ipUpdated: ctx.ip,
    });

    ctx.body = {
      id,
    };

    return;
  }

  await Sync.updateOne(
    { id },
    {
      $set: {
        channels,
        updateDate: new Date(),
        ipUpdated: ctx.ip,
      },
    },
  );

  ctx.body = {
    id,
  };
});

app.use(router.routes());

app.use((ctx) => {
  ctx.throw(404);
});
