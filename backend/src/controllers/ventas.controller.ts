import { Request, Response } from 'express';
import * as ventasService from '../services/ventas.service';
import { idSchema } from '../utils/schemas';
import { crearVentaSchema, listaVentasQuerySchema } from '../utils/operaciones-schemas';
import { validate } from '../utils/validation';

export async function listar(request: Request, response: Response): Promise<void> {
  const query = validate(listaVentasQuerySchema, request.query);
  const resultado = await ventasService.listar(
    query.desde,
    query.hasta,
    query.cliente_id,
    query.page,
    query.limit
  );
  response.status(200).json(resultado);
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  response.status(200).json({ venta: await ventasService.obtener(id) });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(crearVentaSchema, request.body);
  const venta = await ventasService.crear(input);
  response.status(201).json({ mensaje: 'Venta creada correctamente.', venta });
}

export async function anular(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const venta = await ventasService.anular(id);
  response.status(200).json({ mensaje: 'Venta anulada y stock devuelto correctamente.', venta });
}
