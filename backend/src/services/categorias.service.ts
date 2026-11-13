import * as categoriasRepository from '../repositories/categorias.repository';
import { Categoria } from '../types/entities';
import { HttpError } from '../utils/http-error';

export async function listar(): Promise<Categoria[]> {
  return categoriasRepository.listarCategorias();
}

export async function obtener(id: string): Promise<Categoria> {
  const categoria = await categoriasRepository.buscarCategoriaPorId(id);
  if (!categoria) {
    throw new HttpError(404, 'Categoría no encontrada.');
  }
  return categoria;
}

export async function crear(nombre: string): Promise<Categoria> {
  return categoriasRepository.crearCategoria(nombre);
}

export async function actualizar(id: string, nombre: string): Promise<Categoria> {
  const categoria = await categoriasRepository.actualizarCategoria(id, nombre);
  if (!categoria) {
    throw new HttpError(404, 'Categoría no encontrada.');
  }
  return categoria;
}

export async function eliminar(id: string): Promise<void> {
  const eliminada = await categoriasRepository.eliminarCategoria(id);
  if (!eliminada) {
    throw new HttpError(404, 'Categoría no encontrada.');
  }
}
