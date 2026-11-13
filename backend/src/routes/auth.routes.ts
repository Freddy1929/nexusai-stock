import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { loginLimiter, registrationLimiter } from '../middlewares/login-limiter';
import { asyncHandler } from '../utils/async-handler';

export const authRouter = Router();

authRouter.post('/register', registrationLimiter, asyncHandler(authController.registrar));
authRouter.post('/login', loginLimiter, asyncHandler(authController.iniciarSesion));
authRouter.get('/me', autenticar, asyncHandler(authController.obtenerUsuario));
authRouter.post(
  '/usuarios',
  autenticar,
  autorizar('admin'),
  asyncHandler(authController.crearUsuario)
);
