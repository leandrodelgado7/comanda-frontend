import { HttpBackend, HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  shareReplay,
  tap,
  throwError
} from 'rxjs';
import {
  AuthResponse,
  AuthSession,
  ErrorResponse,
  LoginRequest,
  RefreshTokenRequest,
  User
} from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { SKIP_AUTH, SKIP_REFRESH } from '../interceptors/auth.interceptor';
import { ApiHttpService } from './api-http.service';
import { AuthStorageService } from './auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly rawHttp: HttpClient;
  private readonly authBasePath = '/api/auth';
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private refreshRequest$: Observable<AuthSession> | null = null;
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly currentUsernameSubject = new BehaviorSubject<string>('Usuario');
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly session$ = this.sessionSubject.asObservable();
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUsername$ = this.currentUsernameSubject.asObservable();

  constructor(
    private readonly router: Router,
    private readonly apiHttp: ApiHttpService,
    private readonly authStorage: AuthStorageService,
    httpBackend: HttpBackend
  ) {
    this.rawHttp = new HttpClient(httpBackend);
    this.restoreSession();
  }

  login(username: string, password: string): Observable<User> {
    const payload: LoginRequest = {
      username: username.trim(),
      password
    };

    return this.apiHttp
      .post<AuthResponse, LoginRequest>(`${this.authBasePath}/login`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true).set(SKIP_REFRESH, true)
      })
      .pipe(
        tap((response) => this.setSession(this.mapAuthResponseToSession(response))),
        map((response) => response.user)
      );
  }

  refreshSession(): Observable<AuthSession> {
    const refreshToken = this.sessionSubject.getValue()?.refreshToken;

    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible.'));
    }

    if (!this.refreshRequest$) {
      const payload: RefreshTokenRequest = { refreshToken };

      this.refreshRequest$ = this.rawHttp
        .post<AuthResponse>(this.buildAuthUrl('/refresh'), payload, {
          context: new HttpContext().set(SKIP_AUTH, true).set(SKIP_REFRESH, true)
        })
        .pipe(
          map((response) => this.mapAuthResponseToSession(response)),
          tap((session) => this.setSession(session)),
          shareReplay(1),
          finalize(() => {
            this.refreshRequest$ = null;
          })
        );
    }

    return this.refreshRequest$;
  }

  logout(): Observable<void> {
    const refreshToken = this.sessionSubject.getValue()?.refreshToken;

    this.clearSession();
    void this.router.navigate(['/login']);

    if (!refreshToken) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }

    return this.rawHttp
      .post<void>(
        this.buildAuthUrl('/logout'),
        { refreshToken },
        {
          context: new HttpContext().set(SKIP_AUTH, true).set(SKIP_REFRESH, true)
        }
      )
      .pipe(
        catchError(() => {
          return new Observable<void>((subscriber) => {
            subscriber.next();
            subscriber.complete();
          });
        })
      );
  }

  fetchMe(): Observable<User> {
    return this.apiHttp.get<User>(`${this.authBasePath}/me`).pipe(
      tap((user) => {
        const session = this.sessionSubject.getValue();

        if (!session) {
          return;
        }

        this.setSession({
          ...session,
          user
        });
      })
    );
  }

  isAuthenticated(): boolean {
    return Boolean(this.sessionSubject.getValue()?.accessToken);
  }

  hasRefreshToken(): boolean {
    return Boolean(this.sessionSubject.getValue()?.refreshToken);
  }

  getAccessToken(): string | null {
    return this.sessionSubject.getValue()?.accessToken ?? null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  hasRole(roleCode: string): boolean {
    const normalizedRole = roleCode.trim().toUpperCase();

    if (!normalizedRole) {
      return false;
    }

    return this.getCurrentUserRoles().includes(normalizedRole);
  }

  hasAnyRole(roleCodes: readonly string[]): boolean {
    if (!roleCodes.length) {
      return false;
    }

    const currentRoles = this.getCurrentUserRoles();
    return roleCodes.some((roleCode) => currentRoles.includes(roleCode.trim().toUpperCase()));
  }

  clearSessionAndRedirect(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  mapHttpError(error: HttpErrorResponse): ErrorResponse {
    const payload = error.error;

    if (payload && typeof payload === 'object') {
      return payload as ErrorResponse;
    }

    return {
      status: error.status,
      error: error.statusText,
      message: typeof payload === 'string' ? payload : 'Ocurrió un error inesperado.'
    };
  }

  private restoreSession(): void {
    const storedSession = this.authStorage.getSession();

    if (!storedSession) {
      return;
    }

    this.setSession(storedSession);
  }

  private setSession(session: AuthSession): void {
    this.sessionSubject.next(session);
    this.currentUserSubject.next(session.user);
    this.currentUsernameSubject.next(this.buildDisplayName(session.user));
    this.isAuthenticatedSubject.next(true);
    this.authStorage.setSession(session);
  }

  private clearSession(): void {
    this.sessionSubject.next(null);
    this.currentUserSubject.next(null);
    this.currentUsernameSubject.next('Usuario');
    this.isAuthenticatedSubject.next(false);
    this.authStorage.clearSession();
  }

  private mapAuthResponseToSession(response: AuthResponse): AuthSession {
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user
    };
  }

  private buildDisplayName(user: User): string {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.username;
  }

  private getCurrentUserRoles(): string[] {
    const user = this.currentUserSubject.getValue();
    return user?.roles.map((role) => role.code.toUpperCase()) ?? [];
  }

  private buildAuthUrl(path: string): string {
    const normalizedBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    return `${normalizedBaseUrl}${this.authBasePath}${path}`;
  }
}
