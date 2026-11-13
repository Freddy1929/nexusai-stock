import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { Usuario } from '../models/api.models';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('guarda el token y actualiza la sesión luego del inicio de sesión', () => {
    const usuario: Usuario = {
      id: '1',
      nombre: 'Administradora',
      email: 'admin@nexusai.local',
      rol: 'admin',
      creado_en: '2026-11-10T00:00:00.000Z'
    };

    service.iniciarSesion(usuario.email, 'clave-segura').subscribe();
    http.expectOne('http://localhost:4000/api/auth/login').flush({ token: 'token-demo', usuario });

    expect(service.autenticado()).toBe(true);
    expect(service.usuario()).toEqual(usuario);
    expect(localStorage.getItem('nexusai_token')).toBe('token-demo');
  });
});
