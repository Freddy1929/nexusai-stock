import { pool } from '../config/database';
import { Cliente, ClienteInput } from '../types/operaciones';

export async function listar(
  busqueda: string | undefined,
  page: number,
  limit: number
): Promise<{ clientes: Cliente[]; total: number }> {
  const search = busqueda ? `%${busqueda}%` : null;
  const values = [search];
  const totalResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM clientes
     WHERE $1::text IS NULL OR nombre ILIKE $1 OR identificacion ILIKE $1`,
    values
  );
  const result = await pool.query<Cliente>(
    `SELECT id, tipo_identificacion, identificacion, nombre, email, telefono, direccion, creado_en
     FROM clientes
     WHERE $1::text IS NULL OR nombre ILIKE $1 OR identificacion ILIKE $1
     ORDER BY nombre ASC
     LIMIT $2 OFFSET $3`,
    [search, limit, (page - 1) * limit]
  );
  return { clientes: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
}

export async function buscarPorId(id: string): Promise<Cliente | null> {
  const result = await pool.query<Cliente>(
    `SELECT id, tipo_identificacion, identificacion, nombre, email, telefono, direccion, creado_en
     FROM clientes WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function buscarPorIdentificacion(identificacion: string): Promise<Cliente | null> {
  const result = await pool.query<Cliente>(
    `SELECT id, tipo_identificacion, identificacion, nombre, email, telefono, direccion, creado_en
     FROM clientes WHERE identificacion = $1`,
    [identificacion]
  );
  return result.rows[0] ?? null;
}

export async function crear(input: ClienteInput): Promise<Cliente> {
  const result = await pool.query<Cliente>(
    `INSERT INTO clientes (tipo_identificacion, identificacion, nombre, email, telefono, direccion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tipo_identificacion, identificacion, nombre, email, telefono, direccion, creado_en`,
    [
      input.tipo_identificacion,
      input.identificacion,
      input.nombre,
      input.email || null,
      input.telefono ?? null,
      input.direccion ?? null
    ]
  );
  return result.rows[0];
}

export async function actualizar(id: string, input: ClienteInput): Promise<Cliente | null> {
  const result = await pool.query<Cliente>(
    `UPDATE clientes
     SET tipo_identificacion = $2, identificacion = $3, nombre = $4,
         email = $5, telefono = $6, direccion = $7
     WHERE id = $1
     RETURNING id, tipo_identificacion, identificacion, nombre, email, telefono, direccion, creado_en`,
    [
      id,
      input.tipo_identificacion,
      input.identificacion,
      input.nombre,
      input.email || null,
      input.telefono ?? null,
      input.direccion ?? null
    ]
  );
  return result.rows[0] ?? null;
}

export async function eliminar(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
  return result.rowCount === 1;
}
