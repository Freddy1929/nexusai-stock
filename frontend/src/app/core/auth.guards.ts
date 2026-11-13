import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree(['/panel']) : true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.tieneRol('admin') ? true : inject(Router).createUrlTree(['/panel']);
};
