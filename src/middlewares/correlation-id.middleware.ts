import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Tags every incoming request with a stable `X-Correlation-Id` so logs can be
 * stitched across services / threads. If the client supplies the header (eg.
 * propagated from an upstream gateway) we honour it; otherwise we mint a
 * fresh UUIDv4.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existing = req.headers['x-correlation-id'];
    const id =
      (typeof existing === 'string' && /^[\w-]{8,64}$/.test(existing) ? existing : null) ||
      randomUUID();
    req.correlationId = id;
    res.setHeader('X-Correlation-Id', id);
    next();
  }
}
