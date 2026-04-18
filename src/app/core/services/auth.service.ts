import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, delay, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly currentUsernameSubject = new BehaviorSubject<string>('Usuario');
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly currentUsername$ = this.currentUsernameSubject.asObservable();

  constructor(private readonly router: Router) {}

  login(username: string, password: string): Observable<boolean> {
    const validCredentials = username.trim().length > 0 && password === '1234';

    return of(validCredentials).pipe(
      delay(500),
      tap((isValid) => {
        this.isAuthenticatedSubject.next(isValid);

        if (isValid) {
          this.currentUsernameSubject.next(username.trim());
          this.router.navigate(['/orders']);
        }
      })
    );
  }

  logout(): void {
    this.isAuthenticatedSubject.next(false);
    this.currentUsernameSubject.next('Usuario');
    this.router.navigate(['/login']);
  }
}
