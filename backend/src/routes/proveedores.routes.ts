import { Router } from 'express';
import * as proveedoresController from '../controllers/proveedores.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const proveedoresRouter = Router();

proveedoresRouter.use(autenticar);
proveedoresRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(proveedoresController.listar));
proveedoresRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(proveedoresController.obtener));
proveedoresRouter.post('/', autorizar('admin'), asyncHandler(proveedoresController.crear));
proveedoresRouter.put('/:id', autorizar('admin'), asyncHandler(proveedoresController.actualizar));
proveedoresRouter.delete('/:id', autorizar('admin'), asyncHandler(proveedoresController.eliminar));
