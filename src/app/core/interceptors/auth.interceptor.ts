import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Observable, catchError, finalize, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);
export const HAS_REFRESH_RETRY = new HttpContextToken<boolean>(() => false);
let activeRequests = 0;

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const loaderService = inject(NgxUiLoaderService);
  const isPublicRequest = isPublicSecurityRequest(request);
  const accessToken = authService.getAccessToken();
  const shouldSkipAuth = request.context.get(SKIP_AUTH);
  const shouldSkipRefresh = request.context.get(SKIP_REFRESH) || isPublicRequest;
  const hasRetry = request.context.get(HAS_REFRESH_RETRY);
  const shouldAttachAuth = shouldUseBearerToken(request, shouldSkipAuth, isPublicRequest);
  const authenticatedRequest = shouldAttachAuth && accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  activeRequests += 1;
  if (activeRequests === 1) {
    loaderService.start();
  }

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      const isConnectivityError = isNetworkError(error);

      if (isConnectivityError) {
        toastService.showErrorToast('No hay conectividad. Verifica tu conexión a internet.');
      }

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
    }),
    finalize(() => {
      activeRequests = Math.max(0, activeRequests - 1);

      if (activeRequests === 0) {
        loaderService.stop();
      }
    })
  );
};

function shouldUseBearerToken(
  request: HttpRequest<unknown>,
  shouldSkipAuth: boolean,
  isPublicRequest: boolean
): boolean {
  if (shouldSkipAuth || isPublicRequest) {
    return false;
  }

  return isApiRequest(request.url);
}

function isPublicSecurityRequest(request: HttpRequest<unknown>): boolean {
  const method = request.method.toUpperCase();
  const path = normalizeRequestPath(request.url);

  if (method === 'GET' && path.startsWith('/media/')) {
    return true;
  }

  return (
    method === 'POST' &&
    (path === '/api/auth/login' || path === '/api/auth/refresh' || path === '/api/auth/logout')
  );
}

function isApiRequest(url: string): boolean {
  const path = normalizeRequestPath(url);
  return path.startsWith('/api/');
}

function normalizeRequestPath(url: string): string {
  try {
    const baseUrl = environment.apiBaseUrl || window.location.origin;
    const parsedUrl = new URL(url, baseUrl);
    return parsedUrl.pathname;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return error.status === 0;
  }
  return true;
}