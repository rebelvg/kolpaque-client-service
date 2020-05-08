import * as fs from 'fs';

import { server as httpServer, app } from './app';
import { io } from './socket';

import { server } from './config';

process.on('unhandledRejection', (reason, p) => {
  throw reason;
});

// remove previous unix socket
if (typeof server.port === 'string') {
  if (fs.existsSync(server.port)) {
    fs.unlinkSync(server.port);
  }
}

(() => {
  httpServer.listen(server.port, () => {
    console.log('http server running...');

    // set unix socket rw rights for nginx
    if (typeof server.port === 'string') {
      fs.chmodSync(server.port, '777');
    }
  });
})();

(() => {
  io.listen(httpServer);

  console.log('socket server running...');
})();
