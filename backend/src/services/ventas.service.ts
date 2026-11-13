import { env } from '../config/env';
import { smtpConfigurado } from '../providers/pdf-local.provider';
import * as ventasRepository from '../repositories/ventas.repository';
import { CrearVentaInput, Venta, VentaDetallada } from '../types/operaciones';
import { HttpError } from '../utils/http-error';

export async function crear(input: CrearVentaInput): Promise<VentaDetallada> {
  return ventasRepository.crear(input, env.IVA_PORCENTAJE);
}

export async function listar(
  desde: string | undefined,
  hasta: string | undefined,
  clienteId: string | undefined,
  page: number,
  limit: number
): Promise<{ ventas: Venta[]; paginacion: { page: number; limit: number; total: number; total_pages: number } }> {
  if (desde && hasta && desde > hasta) {
    throw new HttpError(400, 'La fecha desde no puede ser posterior a hasta.');
  }
  const { ventas, total } = await ventasRepository.listar(
    desde,
    hasta,
    clienteId,
    page,
    limit
  );
  return {
    ventas: ventas.map((venta) => venta.factura
      ? { ...venta, factura: { ...venta.factura, correo_configurado: smtpConfigurado() } }
      : venta),
    paginacion: { page, limit, total, total_pages: Math.ceil(total / limit) }
  };
}

export async function obtener(id: string): Promise<VentaDetallada> {
  const venta = await ventasRepository.buscarPorId(id);
  if (!venta) {
    throw new HttpError(404, 'Venta no encontrada.');
  }
  return venta;
}

export async function anular(id: string): Promise<VentaDetallada> {
  return ventasRepository.anular(id);
}
