import { NextFunction, Request, Response } from 'express';
import { RolUsuario } from '../types/auth';
import { HttpError } from '../utils/http-error';

export function autorizar(...roles: RolUsuario[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.usuario) {
      next(new HttpError(401, 'Se requiere autenticación.'));
      return;
    }
    if (!roles.includes(request.usuario.rol)) {
      next(new HttpError(403, 'No tienes permisos para realizar esta acción.'));
      return;
    }
    next();
  };
}
