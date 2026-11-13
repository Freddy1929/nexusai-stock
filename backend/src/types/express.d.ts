import { UsuarioAutenticado } from './auth';

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export {};
