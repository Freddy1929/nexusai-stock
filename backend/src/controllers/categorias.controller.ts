import { Request, Response } from 'express';
import * as categoriasService from '../services/categorias.service';
import { categoriaSchema, idSchema } from '../utils/schemas';
import { validate } from '../utils/validation';

export async function listar(_request: Request, response: Response): Promise<void> {
  const categorias = await categoriasService.listar();
  response.status(200).json({ categorias });
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const categoria = await categoriasService.obtener(id);
  response.status(200).json({ categoria });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(categoriaSchema, request.body);
  const categoria = await categoriasService.crear(input.nombre);
  response.status(201).json({ mensaje: 'Categoría creada correctamente.', categoria });
}

export async function actualizar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const input = validate(categoriaSchema, request.body);
  const categoria = await categoriasService.actualizar(id, input.nombre);
  response.status(200).json({ mensaje: 'Categoría actualizada correctamente.', categoria });
}

export async function eliminar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  await categoriasService.eliminar(id);
  response.status(200).json({ mensaje: 'Categoría eliminada correctamente.' });
}
