import * as pedidosRepository from '../repositories/pedidos.repository';
import { CrearPedidoInput, Pedido, PedidoDetallado } from '../types/operaciones';
import { HttpError } from '../utils/http-error';

export async function crear(input: CrearPedidoInput): Promise<PedidoDetallado> {
  return pedidosRepository.crear(input);
}

export async function listar(page: number, limit: number) {
  const { pedidos, total } = await pedidosRepository.listar(page, limit);
  return {
    pedidos,
    paginacion: { page, limit, total, total_pages: Math.ceil(total / limit) }
  };
}

export async function obtener(id: string): Promise<PedidoDetallado> {
  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido) {
    throw new HttpError(404, 'Pedido no encontrado.');
  }
  return pedido;
}

export async function actualizar(id: string, input: CrearPedidoInput): Promise<PedidoDetallado> {
  return pedidosRepository.actualizar(id, input);
}

export async function eliminar(id: string): Promise<void> {
  return pedidosRepository.eliminar(id);
}

export async function recibir(id: string): Promise<PedidoDetallado> {
  return pedidosRepository.recibir(id);
}

export async function cancelar(id: string): Promise<Pedido> {
  return pedidosRepository.cancelar(id);
}
