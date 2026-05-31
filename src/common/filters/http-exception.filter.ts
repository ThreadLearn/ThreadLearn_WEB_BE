import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../custom-error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    if (exception instanceof AppError) {
      return res.status(exception.statusCode).json({
        success: false,
        message: exception.message,
        errors: exception.errors ?? null,
        statusCode: exception.statusCode,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body   = exception.getResponse() as any;
      return res.status(status).json({
        success: false,
        message: typeof body === 'string' ? body : (body.message ?? 'Error'),
        errors: body.errors ?? null,
        statusCode: status,
      });
    }

    this.logger.error(`Unhandled exception: ${req.method} ${req.url}`, exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal Server Error',
      statusCode: 500,
    });
  }
}
