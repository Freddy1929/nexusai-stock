import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { rangoDashboardSchema, ventasHistoricasQuerySchema } from '../utils/operaciones-schemas';
import { validate } from '../utils/validation';

export async function resumenVentas(request: Request, response: Response): Promise<void> {
  const rango = validate(rangoDashboardSchema, request.query);
  response.status(200).json(await dashboardService.resumenVentas(rango.desde, rango.hasta));
}

export async function resumenCompras(request: Request, response: Response): Promise<void> {
  const rango = validate(rangoDashboardSchema, request.query);
  response.status(200).json(await dashboardService.resumenCompras(rango.desde, rango.hasta));
}

export async function resumenInventario(request: Request, response: Response): Promise<void> {
  const rango = validate(rangoDashboardSchema, request.query);
  response.status(200).json(await dashboardService.resumenInventario(rango.desde, rango.hasta));
}

export async function resumenProductos(request: Request, response: Response): Promise<void> {
  const rango = validate(rangoDashboardSchema, request.query);
  response.status(200).json(await dashboardService.resumenProductos(rango.desde, rango.hasta));
}

export async function ventasHistoricas(request: Request, response: Response): Promise<void> {
  const query = validate(ventasHistoricasQuerySchema, request.query);
  response.status(200).json(
    await dashboardService.ventasHistoricas(query.desde, query.hasta, query.agrupar)
  );
}
