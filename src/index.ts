import * as fs from 'fs';

import { httpServer } from './app';
import { io } from './socket-server';

import { SERVER } from './config';
import { connectMongoDriver } from './mongo';

process.on('unhandledRejection', (reason, p) => {
  throw reason;
});

// remove previous unix socket
if (typeof SERVER.PORT === 'string') {
  if (fs.existsSync(SERVER.PORT)) {
    fs.unlinkSync(SERVER.PORT);
  }
}

(async () => {
  await connectMongoDriver();

  httpServer.listen(SERVER.PORT, () => {
    console.log('http_server_running');

    // set unix socket rw rights for nginx
    if (typeof SERVER.PORT === 'string') {
      fs.chmodSync(SERVER.PORT, '777');
    }
  });
})();

(() => {
  io.listen(httpServer);

  console.log('socket_server_running');
})();
