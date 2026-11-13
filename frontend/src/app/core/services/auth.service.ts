import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RolUsuario, Usuario } from '../models/api.models';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'nexusai_token';
  private readonly userKey = 'nexusai_usuario';
  private readonly currentToken = signal<string | null>(localStorage.getItem(this.tokenKey));
  private readonly currentUser = signal<Usuario | null>(this.readCachedUser());
  readonly usuario = this.currentUser.asReadonly();
  readonly autenticado = computed(() => Boolean(this.currentToken()));

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  iniciarSesion(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((respuesta) => {
        localStorage.setItem(this.tokenKey, respuesta.token);
        localStorage.setItem(this.userKey, JSON.stringify(respuesta.usuario));
        this.currentToken.set(respuesta.token);
        this.currentUser.set(respuesta.usuario);
      })
    );
  }

  obtenerUsuario(): Observable<{ usuario: Usuario }> {
    return this.http.get<{ usuario: Usuario }>(`${environment.apiUrl}/auth/me`).pipe(
      tap(({ usuario }) => {
        localStorage.setItem(this.userKey, JSON.stringify(usuario));
        this.currentUser.set(usuario);
      })
    );
  }

  getToken(): string | null {
    return this.currentToken();
  }

  tieneRol(...roles: RolUsuario[]): boolean {
    const rol = this.currentUser()?.rol;
    return Boolean(rol && roles.includes(rol));
  }

  cerrarSesion(): void {
    this.limpiarSesion();
    void this.router.navigateByUrl('/login');
  }

  limpiarSesion(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentToken.set(null);
    this.currentUser.set(null);
  }

  private readCachedUser(): Usuario | null {
    const cached = localStorage.getItem(this.userKey);
    if (!cached) return null;

    try {
      const usuario: unknown = JSON.parse(cached);
      if (
        typeof usuario === 'object' &&
        usuario !== null &&
        'id' in usuario &&
        'nombre' in usuario &&
        'email' in usuario &&
        'creado_en' in usuario &&
        'rol' in usuario &&
        typeof usuario.id === 'string' &&
        typeof usuario.nombre === 'string' &&
        typeof usuario.email === 'string' &&
        typeof usuario.creado_en === 'string' &&
        (usuario.rol === 'admin' || usuario.rol === 'vendedor')
      ) {
        return {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          creado_en: usuario.creado_en
        };
      }
    } catch {
      this.limpiarSesion();
      return null;
    }

    this.limpiarSesion();
    return null;
  }
}
