import express from 'express';
import path from 'path';

/**
 * Creates and starts Express static server serving ./tmp folder under /media
 * @param {number} port - Port number (default 3000)
 * @returns {import('express').Express}
 */
export function startStaticServer(port = 3000) {
  const app = express();
  const tmpPath = path.resolve('./tmp');

  app.use('/media', express.static(tmpPath));

  app.listen(port, () => {
    console.log(`🌐 Local Public Static Media Server running on port ${port}`);
    console.log(`📁 Serving directory: ${tmpPath} at /media`);
  });

  return app;
}
