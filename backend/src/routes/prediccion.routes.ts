import { Router } from 'express';
import * as prediccionController from '../controllers/prediccion.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const prediccionRouter = Router();

prediccionRouter.use(autenticar, autorizar('admin', 'vendedor'));
prediccionRouter.get('/alertas', asyncHandler(prediccionController.alertas));
prediccionRouter.get('/serie', asyncHandler(prediccionController.serie));
prediccionRouter.get('/producto/:id', asyncHandler(prediccionController.porProducto));
prediccionRouter.get('/', asyncHandler(prediccionController.listar));
prediccionRouter.post('/recalcular', autorizar('admin'), asyncHandler(prediccionController.recalcular));
