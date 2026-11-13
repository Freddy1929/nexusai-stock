import { Request, Response } from 'express';
import * as productosService from '../services/productos.service';
import {
  diasQuerySchema,
  idSchema,
  listaProductosQuerySchema,
  productoActualizacionSchema,
  productoSchema
} from '../utils/schemas';
import { validate } from '../utils/validation';

export async function listar(request: Request, response: Response): Promise<void> {
  const filtros = validate(listaProductosQuerySchema, request.query);
  const resultado = await productosService.listar(filtros);
  response.status(200).json(resultado);
}

export async function listarBajoStock(_request: Request, response: Response): Promise<void> {
  const productos = await productosService.listarBajoStock();
  response.status(200).json({ productos });
}

export async function listarPorCaducar(request: Request, response: Response): Promise<void> {
  const { dias } = validate(diasQuerySchema, request.query);
  const productos = await productosService.listarPorCaducar(dias);
  response.status(200).json({ dias, productos });
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const producto = await productosService.obtener(id);
  response.status(200).json({ producto });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(productoSchema, request.body);
  const producto = await productosService.crear(input);
  response.status(201).json({ mensaje: 'Producto creado correctamente.', producto });
}

export async function actualizar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const input = validate(productoActualizacionSchema, request.body);
  const producto = await productosService.actualizar(id, input);
  response.status(200).json({ mensaje: 'Producto actualizado correctamente.', producto });
}

export async function eliminar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  await productosService.eliminar(id);
  response.status(200).json({ mensaje: 'Producto eliminado correctamente.' });
}
