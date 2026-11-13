import * as productosRepository from '../repositories/productos.repository';
import { Producto } from '../types/entities';
import { ListaProductosFiltros, Paginacion } from '../types/inputs';
import { HttpError } from '../utils/http-error';
import { ProductoActualizacionInput, ProductoInput } from '../repositories/productos.repository';

export async function listar(filtros: ListaProductosFiltros): Promise<{
  productos: Producto[];
  paginacion: Paginacion;
}> {
  const { productos, total } = await productosRepository.listarProductos(filtros);
  return {
    productos,
    paginacion: {
      page: filtros.page,
      limit: filtros.limit,
      total,
      total_pages: Math.ceil(total / filtros.limit)
    }
  };
}

export async function listarBajoStock(): Promise<Producto[]> {
  return productosRepository.listarProductosBajoStock();
}

export async function listarPorCaducar(dias: number): Promise<Producto[]> {
  return productosRepository.listarProductosPorCaducar(dias);
}

export async function obtener(id: string): Promise<Producto> {
  const producto = await productosRepository.buscarProductoPorId(id);
  if (!producto) {
    throw new HttpError(404, 'Producto no encontrado.');
  }
  return producto;
}

export async function crear(input: ProductoInput): Promise<Producto> {
  return productosRepository.crearProducto(input);
}

export async function actualizar(id: string, input: ProductoActualizacionInput): Promise<Producto> {
  const producto = await productosRepository.actualizarProducto(id, input);
  if (!producto) {
    throw new HttpError(404, 'Producto no encontrado.');
  }
  return producto;
}

export async function eliminar(id: string): Promise<void> {
  const eliminado = await productosRepository.eliminarProducto(id);
  if (!eliminado) {
    throw new HttpError(404, 'Producto no encontrado.');
  }
}
