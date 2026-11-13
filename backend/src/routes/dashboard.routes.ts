import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { asyncHandler } from '../utils/async-handler';

export const dashboardRouter = Router();

dashboardRouter.use(autenticar, autorizar('admin', 'vendedor'));
dashboardRouter.get('/resumen-ventas', asyncHandler(dashboardController.resumenVentas));
dashboardRouter.get('/resumen-compras', asyncHandler(dashboardController.resumenCompras));
dashboardRouter.get('/resumen-inventario', asyncHandler(dashboardController.resumenInventario));
dashboardRouter.get('/resumen-productos', asyncHandler(dashboardController.resumenProductos));
dashboardRouter.get('/ventas-historicas', asyncHandler(dashboardController.ventasHistoricas));
