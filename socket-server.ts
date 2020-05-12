import * as SocketServer from 'socket.io';
import * as _ from 'lodash';
import { IUser } from './app';

export const io = SocketServer();

const CLIENTS: {
  [key: string]: SocketServer.Socket;
} = {};

export function publishTwitchUser(requestId: string, user: IUser) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('twitch_user', user);
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
  console.log('connection');

  socket.on('request_id', (requestId) => {
    console.log(requestId);

    CLIENTS[requestId] = socket;
  });

  socket.on('disconnect', () => {
    console.log('disconnect');

    _.forEach(CLIENTS, (client, id) => {
      if (client === socket) {
        delete CLIENTS[id];
      }
    });
  });
});
