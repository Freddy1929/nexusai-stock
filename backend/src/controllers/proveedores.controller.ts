import { Request, Response } from 'express';
import * as proveedoresService from '../services/proveedores.service';
import { proveedorSchema, idSchema } from '../utils/schemas';
import { validate } from '../utils/validation';

export async function listar(_request: Request, response: Response): Promise<void> {
  const proveedores = await proveedoresService.listar();
  response.status(200).json({ proveedores });
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const proveedor = await proveedoresService.obtener(id);
  response.status(200).json({ proveedor });
}

export async function crear(request: Request, response: Response): Promise<void> {
  const input = validate(proveedorSchema, request.body);
  const proveedor = await proveedoresService.crear(input);
  response.status(201).json({ mensaje: 'Proveedor creado correctamente.', proveedor });
}

export async function actualizar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const input = validate(proveedorSchema, request.body);
  const proveedor = await proveedoresService.actualizar(id, input);
  response.status(200).json({ mensaje: 'Proveedor actualizado correctamente.', proveedor });
}

export async function eliminar(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  await proveedoresService.eliminar(id);
  response.status(200).json({ mensaje: 'Proveedor eliminado correctamente.' });
}
