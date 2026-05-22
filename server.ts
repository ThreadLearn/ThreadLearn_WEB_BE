import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './src/socket';
import { logger } from './src/configs/logger';
import dotenv from 'dotenv';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach Socket.IO to the HTTP server
  initializeSocketServer(server);

  server.listen(port, () => {
    logger.info(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 ThreadLearn Backend Server                      ║
║                                                      ║
║   HTTP:      http://localhost:${port}                ║
║   Socket.IO: ws://localhost:${port}                  ║
║   Mode:      ${dev ? 'Development' : 'Production'}   ║
║   Swagger:   http://localhost:${port}/api/v1/docs    ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
  });
});
