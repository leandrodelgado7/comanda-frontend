import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);
export const HAS_REFRESH_RETRY = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const shouldSkipAuth = request.context.get(SKIP_AUTH);
  const shouldSkipRefresh = request.context.get(SKIP_REFRESH);
  const hasRetry = request.context.get(HAS_REFRESH_RETRY);
  const authenticatedRequest = !shouldSkipAuth && accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || shouldSkipRefresh || hasRetry) {
        return throwError(() => error);
      }

      if (!authService.hasRefreshToken()) {
        authService.clearSessionAndRedirect();
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap(() => {
          const refreshedAccessToken = authService.getAccessToken();

          if (!refreshedAccessToken) {
            authService.clearSessionAndRedirect();
            return throwError(() => error);
          }

          return next(
            request.clone({
              context: request.context.set(HAS_REFRESH_RETRY, true),
              setHeaders: {
                Authorization: `Bearer ${refreshedAccessToken}`
              }
            })
          );
        }),
        catchError((refreshError) => {
          authService.clearSessionAndRedirect();
          return throwError(() => refreshError);
        })
      );
    })
  );
};