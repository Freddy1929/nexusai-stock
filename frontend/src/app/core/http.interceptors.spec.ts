import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorInterceptor, authInterceptor } from './http.interceptors';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({ standalone: true, template: '' })
class LoginTestComponent {}

describe('HTTP interceptors', () => {
  let http: HttpTestingController;
  const limpiarSesion = vi.fn();
  const mostrar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: LoginTestComponent }]),
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'token-vencido', limpiarSesion } },
        { provide: ToastService, useValue: { mostrar } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('limpia la sesión y redirige al login cuando un endpoint protegido devuelve 401', async () => {
    const router = TestBed.inject(Router);
    let mensajeError = '';
    TestBed.inject(HttpClient).get('/api/protegido').subscribe({
      error: (error: { status: number }) => mensajeError = String(error.status)
    });
    const request = http.expectOne('/api/protegido');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-vencido');
    request.flush({ error: 'Token inválido.' }, { status: 401, statusText: 'Unauthorized' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mensajeError).toBe('401');
    expect(limpiarSesion).toHaveBeenCalledOnce();
    expect(mostrar).toHaveBeenCalledWith('Tu sesión ha expirado. Vuelve a iniciar sesión.', 'error');
    expect(router.url).toBe('/login');
  });

  it('muestra el mensaje de la API cuando la respuesta es 403', () => {
    let mensajeError = '';
    TestBed.inject(HttpClient).get('/api/administracion').subscribe({
      error: (error: { status: number }) => mensajeError = String(error.status)
    });
    http.expectOne('/api/administracion').flush(
      { error: 'No tienes permisos para realizar esta acción.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(mensajeError).toBe('403');
    expect(limpiarSesion).not.toHaveBeenCalled();
    expect(mostrar).toHaveBeenCalledWith('No tienes permisos para realizar esta acción.', 'error');
  });
});
