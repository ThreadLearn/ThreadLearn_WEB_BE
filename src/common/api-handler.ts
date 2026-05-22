import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '../configs/db';
import { logger } from '../configs/logger';
import { ApiResponse } from './api-response';
import { AppError, BadRequestError, UnauthorizedError, ForbiddenError } from './custom-error';
import { rateLimiter } from '../middlewares/rate-limit.middleware';
import jwt from 'jsonwebtoken';
import { env } from '../configs/env';

export interface AuthenticatedNextRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: 'STUDENT' | 'ADMIN';
  };
}

interface HandlerConfig {
  schema?: z.ZodSchema;
  requireAuth?: boolean;
  allowedRoles?: ('STUDENT' | 'ADMIN')[];
}

export function apiHandler(
  handler: (req: AuthenticatedNextRequest, context: any) => Promise<NextResponse>,
  config?: HandlerConfig
) {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now();
    const method = req.method;
    const url = req.nextUrl.pathname;
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';

    try {
      // 1. Enforce Rate Limiting
      await rateLimiter(ip);

      // 2. Ensure DB Connection
      await connectToDatabase();

      const authReq = req as AuthenticatedNextRequest;

      // 3. Auth Guard Check
      if (config?.requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedError('Missing or malformed Authorization header.');
        }

        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
            id: string;
            email: string;
            role: 'STUDENT' | 'ADMIN';
          };
          authReq.user = decoded;
        } catch (err) {
          throw new UnauthorizedError('Invalid or expired authentication token.');
        }

        // 4. Role Checking
        if (config.allowedRoles && config.allowedRoles.length > 0) {
          if (!authReq.user || !config.allowedRoles.includes(authReq.user.role)) {
            throw new ForbiddenError('You do not have permission to access this resource.');
          }
        }
      }

      // 5. Request Validation check (if json payload)
      if (config?.schema) {
        try {
          const contentType = req.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const clone = req.clone();
            const body = await clone.json();
            const parsedResult = config.schema.safeParse(body);
            if (!parsedResult.success) {
              const formattedErrors = parsedResult.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              }));
              throw new BadRequestError('Validation failed.', formattedErrors);
            }
          }
        } catch (err) {
          if (err instanceof AppError) throw err;
          throw new BadRequestError('Malformed JSON payload inside request body.');
        }
      }

      // 6. Execute Handler
      const response = await handler(authReq, context);
      const duration = Date.now() - startTime;
      logger.info(`[${method}] ${url} - Status ${response.status} in ${duration}ms`);
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error instanceof AppError) {
        logger.warn(`[${method}] ${url} - AppError: ${error.message} (Status ${error.statusCode}) in ${duration}ms`);
        return ApiResponse.error({
          message: error.message,
          errors: error.errors,
          statusCode: error.statusCode,
        });
      }

      logger.error(`[${method}] ${url} - Fatal Error in ${duration}ms`, error);
      return ApiResponse.error({
        message: 'Internal Server Error',
        statusCode: 500,
      });
    }
  };
}
export default apiHandler;
