import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User, LoginResponse } from '../models/user.model';
import { decodeJwtPayload, isJwtExpired, isJwtMalformed } from './token.utils';

interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

interface UserSummary {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: User['role'];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'psychosim_token';
  private readonly API = '/api/auth';

  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API}/login`, { email, password })
      .pipe(tap(res => {
        this.saveSession(res.data.token, res.data.user);
      }));
  }

  loginWithGoogle(credential: string) {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API}/google`, { credential })
      .pipe(tap(res => {
        this.saveSession(res.data.token, res.data.user);
      }));
  }

  saveSession(token: string, user: User): void {
    if (!token || this.isTokenExpired(token)) {
      this.clearSession();
      return;
    }
    localStorage.setItem(this.TOKEN_KEY, token);
    this.currentUser.set(user);
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  endSession(): void {
    this.clearSession();
    this.redirectToLogin();
  }

  logout() {
    this.endSession();
  }

  syncCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      this.clearSession();
      return of(null);
    }

    return this.http.get<ApiResponse<UserSummary>>(`${this.API}/me`).pipe(
      tap(res => this.currentUser.set(this.toUser(res.data))),
      map(() => this.currentUser()),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.hasUsableToken();
  }

  hasUsableToken(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  isTokenExpired(token = this.getToken()): boolean {
    return isJwtExpired(token);
  }

  isTokenMalformed(token = this.getToken()): boolean {
    return isJwtMalformed(token);
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser() ?? this.loadUser();
    return user ? roles.includes(user.role) : false;
  }

  private saveUserFromToken(token: string): User | null {
    const payload = decodeJwtPayload(token);
    if (!payload || !this.isValidRole(payload.role)) return null;
    return {
      id: Number(payload.userId),
      email: String(payload.sub ?? ''),
      role: payload.role,
      nombre: '',
      apellido: ''
    };
  }

  private loadUser(): User | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token || this.isTokenExpired(token)) return null;
    return this.saveUserFromToken(token);
  }

  private isValidRole(role: unknown): role is User['role'] {
    return role === 'ADMIN' || role === 'PROFESOR' || role === 'ESTUDIANTE';
  }

  private toUser(summary: UserSummary): User {
    return {
      id: summary.id,
      nombre: summary.nombre,
      apellido: summary.apellido,
      email: summary.email,
      role: summary.role
    };
  }
}
