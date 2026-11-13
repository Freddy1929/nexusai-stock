import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RolUsuario } from '../types/auth';
import { HttpError } from '../utils/http-error';

function isRolUsuario(value: unknown): value is RolUsuario {
  return value === 'admin' || value === 'vendedor';
}

function errorNoAutorizado(): HttpError {
  return new HttpError(401, 'Token inválido o expirado.', undefined, {
    'WWW-Authenticate': 'Bearer'
  });
}

export function autenticar(request: Request, _response: Response, next: NextFunction): void {
  const authorization = request.header('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    next(new HttpError(401, 'Token de autenticación requerido.', undefined, {
      'WWW-Authenticate': 'Bearer'
    }));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string') {
      next(errorNoAutorizado());
      return;
    }

    const claims = payload;
    if (
      typeof claims.sub !== 'string'
      || typeof claims.nombre !== 'string'
      || typeof claims.email !== 'string'
      || !isRolUsuario(claims.rol)
    ) {
      next(errorNoAutorizado());
      return;
    }

    request.usuario = {
      id: claims.sub,
      nombre: claims.nombre,
      email: claims.email,
      rol: claims.rol
    };
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      next(errorNoAutorizado());
      return;
    }
    next(error);
  }
}
