import { io } from 'socket.io-client';

import { SERVER } from '../src/config';

const client = io(`http://localhost:${SERVER.PORT}`);

client.on('twitch_user', (user: any) => {
  console.log(user);
});

client.on('klpq_user', (user: any) => {
  console.log(user);
});

client.on('connect', () => {
  client.emit('request_id', 'test');
});

console.log('client started...');
