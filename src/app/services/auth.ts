import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface UserSession {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  photo?: string;
  whatsapp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private isBrowser: boolean;
  private userSubject: BehaviorSubject<UserSession | null>;
  user$;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialUser = this.getUser();
    this.userSubject = new BehaviorSubject<UserSession | null>(initialUser);
    this.user$ = this.userSubject.asObservable();
  }

  setToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  setRefreshToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('refreshToken', token);
    }
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem('refreshToken') : null;
  }

  setUser(user: UserSession) {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    }
  }

  getUser(): UserSession | null {
    if (this.isBrowser) {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  clearSession() {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
