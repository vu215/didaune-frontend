import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { BACKEND_API_CONFIG } from '../../config/backend-api.config';

export type AdminRole = 'moderator' | 'content_admin' | 'super_admin';
export type AdminCapability =
  | 'dashboard.view'
  | 'locations.manage'
  | 'reviews.manage'
  | 'users.manage'
  | 'partners.manage'
  | 'imports.manage'
  | 'taxonomy.manage'
  | 'collections.manage'
  | 'reports.view';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar: string;
}

interface BackendAdminUser {
  id: number | string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role?: string | null;
}

interface BackendAdminAuthPayload {
  user: BackendAdminUser;
  token: string;
}

interface BackendApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const ADMIN_STORAGE_KEY = 'didaune_admin_session';
const ADMIN_TOKEN_STORAGE_KEY = 'didaune_admin_token';

const ROLE_CAPABILITIES: Record<AdminRole, AdminCapability[]> = {
  moderator: ['dashboard.view', 'reviews.manage'],
  content_admin: [
    'dashboard.view',
    'locations.manage',
    'reviews.manage',
    'partners.manage',
    'imports.manage',
    'taxonomy.manage',
    'collections.manage',
    'reports.view',
  ],
  super_admin: [
    'dashboard.view',
    'locations.manage',
    'reviews.manage',
    'users.manage',
    'partners.manage',
    'imports.manage',
    'taxonomy.manage',
    'collections.manage',
    'reports.view',
  ],
};

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private http = inject(HttpClient);
  private apiBaseUrl = BACKEND_API_CONFIG.baseUrl;

  adminSession = signal<AdminSession | null>(this.readSession());
  adminToken = signal<string>(this.readToken());

  isAuthenticated(): boolean {
    return this.adminSession() !== null && !!this.adminToken();
  }

  login(email: string, password: string): Observable<{ ok: true }> {
    return this.http
      .post<BackendApiEnvelope<BackendAdminAuthPayload>>(`${this.apiBaseUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(
        map((response) => response.data),
        map(({ user, token }) => {
          const role = (user.role ?? 'user') as AdminRole | 'user';

          if (!['moderator', 'content_admin', 'super_admin'].includes(role)) {
            throw new Error('Tai khoan nay khong co quyen truy cap admin.');
          }

          const session: AdminSession = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: role as AdminRole,
            avatar:
              user.avatar_url?.trim() ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name
              )}&background=0f172a&color=fff&size=128`,
          };

          return { session, token };
        }),
        tap(({ session, token }) => {
          this.adminSession.set(session);
          this.adminToken.set(token);
          this.writeSession(session);
          this.writeToken(token);
        }),
        map(() => ({ ok: true as const }))
      );
  }

  logout() {
    const token = this.adminToken();

    if (token) {
        this.http
          .post(
            `${this.apiBaseUrl}/auth/logout`,
            {},
            {
            headers: this.buildAuthHeaders(token),
            }
          )
        .subscribe({ error: () => undefined });
    }

    this.adminSession.set(null);
    this.adminToken.set('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  }

  hasRole(roles: AdminRole[]): boolean {
    const session = this.adminSession();
    return !!session && roles.includes(session.role);
  }

  hasCapability(capability: AdminCapability): boolean {
    const session = this.adminSession();
    return !!session && ROLE_CAPABILITIES[session.role].includes(capability);
  }

  authHeaders(): HttpHeaders {
    return this.buildAuthHeaders(this.adminToken());
  }

  private readSession(): AdminSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as AdminSession;
    } catch {
      return null;
    }
  }

  private readToken(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '';
  }

  private writeSession(session: AdminSession) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  }

  private writeToken(token: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
