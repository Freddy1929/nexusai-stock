import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const productosRouter = Router();

productosRouter.use(autenticar);
productosRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(productosController.listar));
productosRouter.get('/bajo-stock', autorizar('admin', 'vendedor'), asyncHandler(productosController.listarBajoStock));
productosRouter.get('/por-caducar', autorizar('admin', 'vendedor'), asyncHandler(productosController.listarPorCaducar));
productosRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(productosController.obtener));
productosRouter.post('/', autorizar('admin'), asyncHandler(productosController.crear));
productosRouter.put('/:id', autorizar('admin'), asyncHandler(productosController.actualizar));
productosRouter.delete('/:id', autorizar('admin'), asyncHandler(productosController.eliminar));
