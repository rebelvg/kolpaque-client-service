import * as SocketClient from 'socket.io-client';

import { SERVER } from '../config';

const io = SocketClient(`http://localhost:${SERVER.PORT}`);

io.on('twitch_user', (user) => {
  console.log(user);
});

io.on('klpq_user', (user) => {
  console.log(user);
});

io.on('connect', () => {
  io.emit('request_id', 'test');
});

console.log('client started...');
