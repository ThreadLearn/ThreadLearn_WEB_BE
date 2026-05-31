import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => ({
        success: true,
        message:    payload?.message    ?? 'OK',
        data:       payload?.data       ?? null,
        meta:       payload?.meta       ?? undefined,
        statusCode: payload?.statusCode ?? 200,
      })),
    );
  }
}
