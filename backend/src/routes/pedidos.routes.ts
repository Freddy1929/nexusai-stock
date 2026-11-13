import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const pedidosRouter = Router();

pedidosRouter.use(autenticar);
pedidosRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(pedidosController.listar));
pedidosRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(pedidosController.obtener));
pedidosRouter.post('/', autorizar('admin'), asyncHandler(pedidosController.crear));
pedidosRouter.put('/:id', autorizar('admin'), asyncHandler(pedidosController.actualizar));
pedidosRouter.delete('/:id', autorizar('admin'), asyncHandler(pedidosController.eliminar));
pedidosRouter.patch('/:id/recibir', autorizar('admin'), asyncHandler(pedidosController.recibir));
pedidosRouter.patch('/:id/cancelar', autorizar('admin'), asyncHandler(pedidosController.cancelar));
