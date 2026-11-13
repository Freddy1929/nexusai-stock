import { Router } from 'express';
import * as facturasController from '../controllers/facturas.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const facturasRouter = Router();

facturasRouter.use(autenticar);
facturasRouter.get('/', autorizar('admin', 'vendedor'), asyncHandler(facturasController.listar));
facturasRouter.post('/generar/:ventaId', autorizar('admin', 'vendedor'), asyncHandler(facturasController.generar));
facturasRouter.post('/:id/enviar-correo', autorizar('admin', 'vendedor'), asyncHandler(facturasController.enviarCorreo));
facturasRouter.post('/:id/regenerar-xml', autorizar('admin'), asyncHandler(facturasController.regenerarXml));
facturasRouter.get('/:id/xml', autorizar('admin', 'vendedor'), asyncHandler(facturasController.descargarXml));
facturasRouter.get('/:id/pdf', autorizar('admin', 'vendedor'), asyncHandler(facturasController.descargarPdf));
facturasRouter.get('/:id', autorizar('admin', 'vendedor'), asyncHandler(facturasController.obtener));
