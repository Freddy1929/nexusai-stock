import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).getToken();
  if (!token || request.url.endsWith('/auth/login')) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const apiMessage = typeof error.error?.error === 'string'
          ? error.error.error
          : `Ocurrió un error al comunicarse con el servidor (${error.status}).`;

        if (error.status === 401 && !request.url.endsWith('/auth/login')) {
          auth.limpiarSesion();
          void router.navigateByUrl('/login');
          toast.mostrar('Tu sesión ha expirado. Vuelve a iniciar sesión.', 'error');
        } else {
          toast.mostrar(apiMessage, 'error');
        }
      } else {
        toast.mostrar('Ocurrió un error inesperado.', 'error');
      }
      return throwError(() => error);
    })
  );
};
