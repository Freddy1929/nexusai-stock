import * as dashboardRepository from '../repositories/dashboard.repository';
import { RangoFechas } from '../types/operaciones';
import { resolveDateRange } from '../utils/money';

export async function resumenVentas(desde?: string, hasta?: string) {
  const rango = resolveDateRange(desde, hasta);
  return { rango, resumen: await dashboardRepository.resumenVentas(rango) };
}

export async function resumenCompras(desde?: string, hasta?: string) {
  const rango = resolveDateRange(desde, hasta);
  return { rango, resumen: await dashboardRepository.resumenCompras(rango) };
}

export async function resumenInventario(desde?: string, hasta?: string) {
  const rango = resolveDateRange(desde, hasta);
  return { rango, resumen: await dashboardRepository.resumenInventario(rango) };
}

export async function resumenProductos(desde?: string, hasta?: string) {
  const rango: RangoFechas = resolveDateRange(desde, hasta);
  return { rango, resumen: await dashboardRepository.resumenProductos() };
}

export async function ventasHistoricas(
  desde: string | undefined,
  hasta: string | undefined,
  agrupar: 'semana' | 'mes'
) {
  const rango = resolveDateRange(desde, hasta);
  return { rango, agrupar, ventas: await dashboardRepository.ventasHistoricas(rango, agrupar) };
}
