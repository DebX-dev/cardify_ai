import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { RequestWithContext } from './request-id.interceptor';

/** Logs request metadata and latency without ever logging sensitive payloads or prompts. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log({
            requestId: request.requestId,
            method: request.method,
            path: request.originalUrl,
            statusCode: response.statusCode,
            durationMs,
          });
        },
        error: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.warn({
            requestId: request.requestId,
            method: request.method,
            path: request.originalUrl,
            durationMs,
          });
        },
      }),
    );
  }
}
