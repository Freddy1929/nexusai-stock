import { Router } from 'express';
import * as ventasController from '../controllers/ventas.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const ventasRouter = Router();

ventasRouter.use(autenticar);
ventasRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(ventasController.listar));
ventasRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(ventasController.obtener));
ventasRouter.post('/', autorizar('admin', 'vendedor'), asyncHandler(ventasController.crear));
ventasRouter.post('/:id/anular', autorizar('admin'), asyncHandler(ventasController.anular));
