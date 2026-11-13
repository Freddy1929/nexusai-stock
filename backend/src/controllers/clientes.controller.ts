import { Request, Response } from 'express';
import * as clientesService from '../services/clientes.service';
import { idSchema } from '../utils/schemas';
import {
  buscarIdentificacionSchema,
  clienteSchema,
  listaClientesQuerySchema
} from '../utils/operaciones-schemas';
import { validate } from '../utils/validation';

export async function listar(request: Request, response: Response): Promise<void> {
  const query = validate(listaClientesQuerySchema, request.query);
  response.status(200).json(await clientesService.listar(query.busqueda, query.page, query.limit));
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  response.status(200).json({ cliente: await clientesService.obtener(id) });
}

export async function buscarPorIdentificacion(request: Request, response: Response): Promise<void> {
  const query = validate(buscarIdentificacionSchema, request.query);
  response.status(200).json({ cliente: await clientesService.buscarPorIdentificacion(query.identificacion) });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(clienteSchema, request.body);
  const cliente = await clientesService.crear(input);
  response.status(201).json({ mensaje: 'Cliente creado correctamente.', cliente });
}

export async function actualizar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const input = validate(clienteSchema, request.body);
  const cliente = await clientesService.actualizar(id, input);
  response.status(200).json({ mensaje: 'Cliente actualizado correctamente.', cliente });
}

export async function eliminar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  await clientesService.eliminar(id);
  response.status(200).json({ mensaje: 'Cliente eliminado correctamente.' });
}
