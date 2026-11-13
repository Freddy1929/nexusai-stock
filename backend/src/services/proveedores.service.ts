import * as proveedoresRepository from '../repositories/proveedores.repository';
import { Proveedor } from '../types/entities';
import { HttpError } from '../utils/http-error';
import { ProveedorInput } from '../repositories/proveedores.repository';

export async function listar(): Promise<Proveedor[]> {
  return proveedoresRepository.listarProveedores();
}

export async function obtener(id: string): Promise<Proveedor> {
  const proveedor = await proveedoresRepository.buscarProveedorPorId(id);
  if (!proveedor) {
    throw new HttpError(404, 'Proveedor no encontrado.');
  }
  return proveedor;
}

export async function crear(input: ProveedorInput): Promise<Proveedor> {
  return proveedoresRepository.crearProveedor(input);
}

export async function actualizar(id: string, input: ProveedorInput): Promise<Proveedor> {
  const proveedor = await proveedoresRepository.actualizarProveedor(id, input);
  if (!proveedor) {
    throw new HttpError(404, 'Proveedor no encontrado.');
  }
  return proveedor;
}

export async function eliminar(id: string): Promise<void> {
  const eliminado = await proveedoresRepository.eliminarProveedor(id);
  if (!eliminado) {
    throw new HttpError(404, 'Proveedor no encontrado.');
  }
}
