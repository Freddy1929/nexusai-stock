import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const categoriasRouter = Router();

categoriasRouter.use(autenticar);
categoriasRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(categoriasController.listar));
categoriasRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(categoriasController.obtener));
categoriasRouter.post('/', autorizar('admin'), asyncHandler(categoriasController.crear));
categoriasRouter.put('/:id', autorizar('admin'), asyncHandler(categoriasController.actualizar));
categoriasRouter.delete('/:id', autorizar('admin'), asyncHandler(categoriasController.eliminar));
