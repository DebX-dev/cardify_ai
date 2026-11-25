import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      let message = 'Request failed. Please check your connection and try again.';

      if (err instanceof HttpErrorResponse) {
        const body = err.error as { message?: string | string[] } | null;
        if (err.status === 0) {
          message = 'Cannot reach Cardify backend API. Ensure NestJS server is running on port 3000.';
        } else if (err.status === 429) {
          message = 'Rate limit reached. Please wait a few seconds before trying again.';
        } else if (body?.message) {
          message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        } else if (err.message) {
          message = err.message;
        }
      } else if (err instanceof Error && err.name === 'TimeoutError') {
        message = 'AI request timed out. Please retry.';
      }

      // Skip toast on background history/analytics fetches
      if (!req.url.includes('/analytics/') && req.method !== 'GET') {
        toast.show(message, 'error');
      }

      return throwError(() => err);
    }),
  );
};
