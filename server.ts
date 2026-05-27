import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './src/socket';
import { logger } from './src/configs/logger';
import dotenv from 'dotenv';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  const allowAll = corsOrigins.includes('*');

  if (allowAll) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      if (req.url?.startsWith('/api/')) {
        applyCors(req, res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
      }

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
