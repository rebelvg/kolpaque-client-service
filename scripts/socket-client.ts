import * as SocketClient from 'socket.io-client';

import { SERVER } from '../src/config';

const io = SocketClient(`http://localhost:${SERVER.PORT}`);

io.on('twitch_user', (user: any) => {
  console.log(user);
});

io.on('klpq_user', (user: any) => {
  console.log(user);
});

io.on('connect', () => {
  io.emit('request_id', 'test');
});

console.log('client started...');
