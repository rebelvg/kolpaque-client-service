import * as fs from 'fs';

import { app } from './app';

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

(async () => {
  app.listen(server.port, () => {
    console.log('server is running.');

    // set unix socket rw rights for nginx
    if (typeof server.port === 'string') {
      fs.chmodSync(server.port, '777');
    }
  });
})();
