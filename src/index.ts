import * as fs from 'fs';

import { httpServer } from './app';
import { io } from './socket-server';

import { SERVER } from '../config';
import { connectMongoDriver } from './mongo';

process.on('unhandledRejection', (reason, p) => {
  throw reason;
});

// remove previous unix socket
if (typeof SERVER.port === 'string') {
  if (fs.existsSync(SERVER.port)) {
    fs.unlinkSync(SERVER.port);
  }
}

(async () => {
  await connectMongoDriver();

  httpServer.listen(SERVER.port, () => {
    console.log('http server running...');

    // set unix socket rw rights for nginx
    if (typeof SERVER.port === 'string') {
      fs.chmodSync(SERVER.port, '777');
    }
  });
})();

(() => {
  io.listen(httpServer);

  console.log('socket server running...');
})();
