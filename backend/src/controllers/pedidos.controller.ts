import { Request, Response } from 'express';
import * as pedidosService from '../services/pedidos.service';
import { idSchema } from '../utils/schemas';
import {
  actualizarPedidoSchema,
  crearPedidoSchema,
  listaPaginadaSchema
} from '../utils/operaciones-schemas';
import { validate } from '../utils/validation';

export async function listar(request: Request, response: Response): Promise<void> {
  const query = validate(listaPaginadaSchema, request.query);
  response.status(200).json(await pedidosService.listar(query.page, query.limit));
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  response.status(200).json({ pedido: await pedidosService.obtener(id) });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(crearPedidoSchema, request.body);
  const pedido = await pedidosService.crear(input);
  response.status(201).json({ mensaje: 'Pedido creado correctamente.', pedido });
}

export async function actualizar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const input = validate(actualizarPedidoSchema, request.body);
  const pedido = await pedidosService.actualizar(id, input);
  response.status(200).json({ mensaje: 'Pedido actualizado correctamente.', pedido });
}

export async function eliminar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  await pedidosService.eliminar(id);
  response.status(200).json({ mensaje: 'Pedido eliminado correctamente.' });
}

export async function recibir(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const pedido = await pedidosService.recibir(id);
  response.status(200).json({ mensaje: 'Pedido recibido y stock actualizado correctamente.', pedido });
}

export async function cancelar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const pedido = await pedidosService.cancelar(id);
  response.status(200).json({ mensaje: 'Pedido cancelado correctamente.', pedido });
}
