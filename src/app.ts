import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as http from 'http';
import axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';
import * as uuid from 'uuid';
import * as _ from 'lodash';

import { SERVER, TWITCH, GOOGLE } from '../config';
import { publishTwitchUser, publishYoutubeUser } from './socket-server';
import { youtubeClient } from './clients';
import { MongoCollections } from './mongo';
import { Readable } from 'stream';

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

export const httpServer = http.createServer(app.callback());

app.use(passport.initialize());

passport.use(
  'twitch',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: TWITCH.clientId,
      clientSecret: TWITCH.clientSecret,
      callbackURL: TWITCH.callbackUrl,
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
      clientID: GOOGLE.clientId,
      clientSecret: GOOGLE.clientSecret,
      callbackURL: GOOGLE.callbackUrl,
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

  params.append('client_id', TWITCH.clientId);
  params.append('client_secret', TWITCH.clientSecret);
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

  params.append('client_id', GOOGLE.clientId);
  params.append('client_secret', GOOGLE.clientSecret);
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

  jsonwebtoken.verify(jwt, SERVER.jwtSecret);

  ctx.body = await youtubeClient.getChannels(channelName as string, ctx.ip);
});

router.get('/youtube/streams', async (ctx, next) => {
  const { channelId } = ctx.query;
  const jwt = ctx.get('jwt');

  jsonwebtoken.verify(jwt, SERVER.jwtSecret);

  ctx.body = await youtubeClient.getStreams(channelId as string, ctx.ip);
});

router.get('/auth', async (ctx, next) => {
  const jwt = jsonwebtoken.sign({ isLoggedIn: true }, SERVER.jwtSecret, {
    expiresIn: '1d',
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
  const { id, channels } = await readBody(ctx.req);

  const { Sync } = MongoCollections;

  if (!id) {
    const id = uuid.v4();

    await Sync.insertOne({
      id,
      channels,
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
      },
    },
  );

  ctx.body = {
    id,
  };
});

function readBody(readStream: Readable): Promise<any> {
  return new Promise((resolve, reject) => {
    const allData: Buffer[] = [];

    readStream.on('data', (data: Buffer) => {
      allData.push(data);
    });

    readStream.on('error', reject);

    readStream.on('close', () => {
      resolve(JSON.parse(Buffer.concat(allData).toString()));
    });
  });
}

app.use(router.routes());

app.use((ctx) => {
  ctx.throw(404);
});
