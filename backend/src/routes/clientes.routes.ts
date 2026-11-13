import { Router } from 'express';
import * as clientesController from '../controllers/clientes.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const clientesRouter = Router();

clientesRouter.use(autenticar);
clientesRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(clientesController.listar));
clientesRouter.get('/buscar', autorizar('admin', 'vendedor'), asyncHandler(clientesController.buscarPorIdentificacion));
clientesRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(clientesController.obtener));
clientesRouter.post('/', autorizar('admin', 'vendedor'), asyncHandler(clientesController.crear));
clientesRouter.put('/:id', autorizar('admin'), asyncHandler(clientesController.actualizar));
clientesRouter.delete('/:id', autorizar('admin'), asyncHandler(clientesController.eliminar));
