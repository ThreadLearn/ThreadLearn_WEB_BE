import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '../../configs/logger';
import { ApiResponse } from '../api-response';
import { AppError } from '../custom-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Streaming responses (SSE) already flushed headers before the body finished —
    // res.status()/json() would throw ERR_HTTP_HEADERS_SENT and crash the process.
    if (response.headersSent) {
      logger.error(`[${request.method}] ${request.url} - Error after headers sent`, exception);
      if (!response.writableEnded) response.end();
      return;
    }

    if (exception instanceof AppError) {
      logger.warn(
        `[${request.method}] ${request.url} - AppError: ${exception.message} (Status ${exception.statusCode})`
      );
      return response.status(exception.statusCode).json(
        ApiResponse.error({
          message: exception.message,
          errors: exception.errors,
          code: exception.code,
          statusCode: exception.statusCode,
        })
      );
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();
      const message =
        typeof errorResponse === 'object' && errorResponse && 'message' in errorResponse
          ? (errorResponse as any).message
          : exception.message;

      return response.status(statusCode).json(
        ApiResponse.error({
          message: Array.isArray(message) ? 'Validation failed.' : message,
          errors: Array.isArray(message) ? message : null,
          statusCode,
        })
      );
    }

    logger.error(`[${request.method}] ${request.url} - Fatal Error`, exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      ApiResponse.error({
        message: 'Internal Server Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    );
  }
}
