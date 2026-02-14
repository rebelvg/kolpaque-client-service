import { Server, Socket } from 'socket.io';
import * as _ from 'lodash';

import { IUser } from './app';

export const io = new Server();

const CLIENTS: {
  [key: string]: Socket;
} = {};

export function publishTwitchUser(requestId: string, user: IUser) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('twitch_user', user);
  }
}

export function publishKickUser(requestId: string, user: IUser) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('kick_user', user);
  }
}

export function publishYoutubeUser(requestId: string, user: IUser) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('youtube_user', user);
  }
}

export function publishKlpqUser(requestId: string, signedJwt: string) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('klpq_user', signedJwt);
  }
}

io.on('connection', (socket) => {
  console.log('connection', socket.client.conn.remoteAddress);

  socket.on('request_id', (requestId) => {
    console.log('request_id', requestId);

    CLIENTS[requestId] = socket;
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.client.conn.remoteAddress);

    _.forEach(CLIENTS, (client, id) => {
      if (client === socket) {
        delete CLIENTS[id];
      }
    });
  });
});
