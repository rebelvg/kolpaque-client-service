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

import { SERVER, TWITCH, GOOGLE, API, KICK } from './config';
import {
  publishKickUser,
  publishKlpqUser,
  publishTwitchUser,
  publishYoutubeUser,
} from './socket-server';
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

app.use(bodyParser({ enableTypes: ['json'] }));

export const httpServer = http.createServer(app.callback());

app.use(passport.initialize());

passport.use(
  'kick',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.kick.com/oauth/authorize',
      tokenURL: 'https://id.kick.com/oauth/token',
      clientID: KICK.CLIENT_ID,
      clientSecret: KICK.CLIENT_SECRET,
      callbackURL: KICK.CALLBACK_URL,
      state: true,
      pkce: true,
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
  console.log(
    ctx.method,
    ctx.href,
    JSON.stringify(ctx.headers),
    JSON.stringify(ctx.params),
    JSON.stringify(ctx.query),
  );

  try {
    await next();

    console.log(ctx.method, ctx.href, ctx.status);
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };

    console.error(ctx.method, ctx.href, ctx.status, ctx.ip, ctx.headers);
    console.error('http_error', error.message, JSON.stringify(error.stack));
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
  passport.authenticate('twitch', {
    session: false,
    scope: ['user_read', 'user:read:follows'],
  }),
);

router.get(
  '/auth/kick',
  async (ctx, next) => {
    const { requestId } = ctx.query;

    if (!requestId) {
      throw new Error('no_request_id');
    }

    ctx.cookies.set('requestId', requestId as string);

    await next();
  },
  passport.authenticate('kick', {
    session: false,
    scope: ['user:read', 'channel:read'],
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
  '/auth/kick/callback',
  passport.authenticate('kick', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishKickUser(requestId, user);

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

  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
  }>('https://id.twitch.tv/oauth2/token', params);

  ctx.body = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
});

router.get('/auth/kick/refresh', async (ctx, next) => {
  const { refreshToken } = ctx.query;

  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  const params = new URLSearchParams();

  params.append('client_id', KICK.CLIENT_ID);
  params.append('client_secret', KICK.CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken as string);

  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
  }>('https://id.kick.com/oauth/token', params);

  ctx.body = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
});

router.get('/auth/klpq/refresh', async (ctx, next) => {
  const jwt = ctx.get('jwt');

  const { _v, klpqJwtToken } = jsonwebtoken.verify(
    jwt,
    SERVER.JWT_SECRET,
    {},
  ) as {
    _v: string;
    klpqJwtToken: string;
  };

  if (_v !== 'v1') {
    throw new Error('bad_token');
  }

  const klpqJwt = jsonwebtoken.decode(klpqJwtToken) as {
    userId: string;
  };

  if (!klpqJwt.userId) {
    throw new Error('bad_klpq_token');
  }

  const {
    data: { jwtToken: newKlpqJwtToken },
  } = await axios.get(`${new URL(API.AUTH_SERVICE_URL).origin}/users/refresh`, {
    headers: { 'jwt-token': klpqJwtToken },
  });

  ctx.body = {
    jwt: jsonwebtoken.sign(
      {
        _v: 'v1',
        klpqJwtToken: newKlpqJwtToken,
      },
      SERVER.JWT_SECRET,
      {
        expiresIn: '120d',
      },
    ),
  };
});

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
  '/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishYoutubeUser(requestId, user);

    ctx.body = 'sign_in_successful';
  },
);

router.get('/auth/google/refresh', async (ctx, next) => {
  const { refreshToken } = ctx.query;

  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  const params = new URLSearchParams();

  params.append('client_id', GOOGLE.CLIENT_ID);
  params.append('client_secret', GOOGLE.CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken as string);

  const { data } = await axios.post<{
    access_token: string;
  }>('https://www.googleapis.com/oauth2/v4/token', params);

  ctx.body = {
    accessToken: data.access_token,
    refreshToken,
  };
});

router.get('/youtube/channels', async (ctx, next) => {
  const { channelName, forHandle } = ctx.query;

  if (!channelName) {
    return;
  }

  const jwt = ctx.get('jwt');

  try {
    const { _v, klpqJwtToken } = jsonwebtoken.verify(
      jwt,
      SERVER.JWT_SECRET,
      {},
    ) as {
      _v: string;
      klpqJwtToken: string;
    };

    if (_v !== 'v1') {
      throw new Error('bad_token');
    }
  } catch (error) {
    console.error(error.message, jwt);

    return;
  }

  ctx.body = await youtubeClient.getChannels(
    channelName as string,
    ctx.ip,
    !!forHandle,
  );
});

router.get('/youtube/streams', async (ctx, next) => {
  return;

  const { channelId } = ctx.query;

  if (!channelId) {
    return;
  }

  const jwt = ctx.get('jwt');

  try {
    const { _v, klpqJwtToken } = jsonwebtoken.verify(
      jwt,
      SERVER.JWT_SECRET,
      {},
    ) as {
      _v: string;
      klpqJwtToken: string;
    };

    if (_v !== 'v1') {
      throw new Error('bad_token');
    }
  } catch (error) {
    console.error(error, jwt);

    return;
  }

  ctx.body = await youtubeClient.getStreams(channelId as string, ctx.ip);
});

router.get('/auth/klpq', async (ctx, next) => {
  const { requestId } = ctx.query;

  if (!requestId) {
    throw new Error('no_request_id');
  }

  ctx.session.requestId = requestId;

  const redirectUri = `${SERVER.CALLBACK_URL}/auth/klpq/callback?token=`;

  ctx.redirect(
    `${API.AUTH_SERVICE_URL}?redirectUri=${encodeURIComponent(redirectUri)}`,
  );
});

router.get('/auth/klpq/callback', async (ctx, next) => {
  const { token: klpqJwtToken } = ctx.query;

  await axios.get(`${new URL(API.AUTH_SERVICE_URL).origin}/users/validate`, {
    headers: { 'jwt-token': klpqJwtToken },
  });

  const jwtToken = jsonwebtoken.sign(
    { _v: 'v1', klpqJwtToken },
    SERVER.JWT_SECRET,
    {
      expiresIn: '120d',
    },
  );

  const requestId = ctx.session.requestId;

  publishKlpqUser(requestId, jwtToken);

  ctx.body = 'sign_in_successful';
});

router.get('/sync/:id', async (ctx, next) => {
  const jwt = ctx.get('jwt');

  let userId: string;

  try {
    const { _v, klpqJwtToken } = jsonwebtoken.verify(
      jwt,
      SERVER.JWT_SECRET,
      {},
    ) as {
      _v: string;
      klpqJwtToken: string;
    };

    if (_v !== 'v1') {
      throw new Error('bad_token');
    }

    const klpqJwt = jsonwebtoken.decode(klpqJwtToken) as {
      userId: string;
    };

    if (!klpqJwt.userId) {
      throw new Error('bad_klpq_token');
    }

    userId = klpqJwt.userId;
  } catch (error) {
    console.error(error.message, jwt);

    return;
  }

  const { id } = ctx.params;

  const { Sync } = MongoCollections;

  const syncRecord = await Sync.findOne({
    id,
    userId,
  });

  if (!syncRecord) {
    ctx.status = 404;

    return;
  }

  ctx.body = syncRecord;
});

router.post('/sync', async (ctx, next) => {
  const jwt = ctx.get('jwt');

  let userId: string;

  try {
    const { _v, klpqJwtToken } = jsonwebtoken.verify(
      jwt,
      SERVER.JWT_SECRET,
      {},
    ) as {
      _v: string;
      klpqJwtToken: string;
    };

    if (_v !== 'v1') {
      throw new Error('bad_token');
    }

    const klpqJwt = jsonwebtoken.decode(klpqJwtToken) as {
      userId: string;
    };

    if (!klpqJwt.userId) {
      throw new Error('bad_klpq_token');
    }

    userId = klpqJwt.userId;
  } catch (error) {
    console.error(error.message, jwt);

    return;
  }

  const { id, channels } = ctx.request.body;

  const { Sync } = MongoCollections;

  if (!id) {
    const id = uuid.v4();

    await Sync.insertOne({
      id,
      channels,
      userId,
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
  // console.log('http_not_found', ctx.method, ctx.href);

  ctx.status = 404;
});
