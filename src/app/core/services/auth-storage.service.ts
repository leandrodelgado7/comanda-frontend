import { Injectable } from '@angular/core';
import { AuthSession } from '../models/auth.model';

const AUTH_STORAGE_KEY = 'comanda.auth.session';

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  getSession(): AuthSession | null {
    const serializedSession = this.getStorage()?.getItem(AUTH_STORAGE_KEY);

    if (!serializedSession) {
      return null;
    }

    try {
      return JSON.parse(serializedSession) as AuthSession;
    } catch {
      this.clearSession();
      return null;
    }
  }

  setSession(session: AuthSession): void {
    this.getStorage()?.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    this.getStorage()?.removeItem(AUTH_STORAGE_KEY);
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}