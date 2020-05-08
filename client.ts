import * as SocketClient from 'socket.io-client';

import { server } from './config';

const io = SocketClient(`http://localhost:${server.port}`);

io.on('user', (user) => {
  console.log(user);
});

io.on('connect', () => {
  io.emit('request_id', 'test');
});

console.log('client started...');
