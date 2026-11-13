import * as clientesRepository from '../repositories/clientes.repository';
import { Cliente, ClienteInput } from '../types/operaciones';
import { HttpError } from '../utils/http-error';

const identificacionConsumidorFinal = '9999999999999';

export async function listar(busqueda: string | undefined, page: number, limit: number) {
  const { clientes, total } = await clientesRepository.listar(busqueda, page, limit);
  return {
    clientes,
    paginacion: { page, limit, total, total_pages: Math.ceil(total / limit) }
  };
}

export async function obtener(id: string): Promise<Cliente> {
  const cliente = await clientesRepository.buscarPorId(id);
  if (!cliente) {
    throw new HttpError(404, 'Cliente no encontrado.');
  }
  return cliente;
}

export async function buscarPorIdentificacion(identificacion: string): Promise<Cliente> {
  const cliente = await clientesRepository.buscarPorIdentificacion(identificacion);
  if (!cliente) {
    throw new HttpError(404, 'Cliente no encontrado.');
  }
  return cliente;
}

export async function crear(input: ClienteInput): Promise<Cliente> {
  if (input.identificacion === identificacionConsumidorFinal) {
    throw new HttpError(409, 'La identificación está reservada para Consumidor Final.');
  }
  return clientesRepository.crear(input);
}

export async function actualizar(id: string, input: ClienteInput): Promise<Cliente> {
  const existente = await obtener(id);
  if (existente.identificacion === identificacionConsumidorFinal) {
    throw new HttpError(409, 'El cliente Consumidor Final no se puede editar.');
  }
  if (input.identificacion === identificacionConsumidorFinal) {
    throw new HttpError(409, 'La identificación está reservada para Consumidor Final.');
  }
  const cliente = await clientesRepository.actualizar(id, input);
  if (!cliente) {
    throw new HttpError(404, 'Cliente no encontrado.');
  }
  return cliente;
}

export async function eliminar(id: string): Promise<void> {
  const existente = await obtener(id);
  if (existente.identificacion === identificacionConsumidorFinal) {
    throw new HttpError(409, 'El cliente Consumidor Final no se puede borrar.');
  }
  const eliminado = await clientesRepository.eliminar(id);
  if (!eliminado) {
    throw new HttpError(404, 'Cliente no encontrado.');
  }
}
