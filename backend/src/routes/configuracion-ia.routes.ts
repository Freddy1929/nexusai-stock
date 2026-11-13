import { Router } from 'express';
import * as prediccionController from '../controllers/prediccion.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const configuracionIaRouter = Router();

configuracionIaRouter.use(autenticar, autorizar('admin', 'vendedor'));
configuracionIaRouter.get('/', asyncHandler(prediccionController.obtenerConfiguracion));
configuracionIaRouter.put('/', autorizar('admin'), asyncHandler(prediccionController.actualizarConfiguracion));
