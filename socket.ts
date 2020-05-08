import * as SocketServer from 'socket.io';
import * as _ from 'lodash';
import { IUser } from './app';

export const io = SocketServer();

const CLIENTS: {
  [key: string]: SocketServer.Socket;
} = {};

export function publishToken(requestId: string, user: IUser) {
  const client = CLIENTS[requestId];

  if (client) {
    client.emit('user', user);
  }
}

io.on('connection', (socket) => {
  socket.on('request_id', (requestId) => {
    socket.join('request_id', () => {
      CLIENTS[requestId] = socket;
    });
  });
});
