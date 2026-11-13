import { pool } from '../config/database';
import { Proveedor } from '../types/entities';

export interface ProveedorInput {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
}

const proveedorFields = 'id, nombre, ruc, telefono, email, direccion, creado_en';

export async function listarProveedores(): Promise<Proveedor[]> {
  const result = await pool.query<Proveedor>(
    `SELECT ${proveedorFields} FROM proveedores ORDER BY nombre ASC`
  );
  return result.rows;
}

export async function buscarProveedorPorId(id: string): Promise<Proveedor | null> {
  const result = await pool.query<Proveedor>(
    `SELECT ${proveedorFields} FROM proveedores WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function crearProveedor(input: ProveedorInput): Promise<Proveedor> {
  const result = await pool.query<Proveedor>(
    `INSERT INTO proveedores (nombre, ruc, telefono, email, direccion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${proveedorFields}`,
    [
      input.nombre,
      input.ruc || null,
      input.telefono ?? null,
      input.email || null,
      input.direccion ?? null
    ]
  );
  return result.rows[0];
}

export async function actualizarProveedor(
  id: string,
  input: ProveedorInput
): Promise<Proveedor | null> {
  const result = await pool.query<Proveedor>(
    `UPDATE proveedores
     SET nombre = $2, ruc = $3, telefono = $4, email = $5, direccion = $6
     WHERE id = $1
     RETURNING ${proveedorFields}`,
    [
      id,
      input.nombre,
      input.ruc || null,
      input.telefono ?? null,
      input.email || null,
      input.direccion ?? null
    ]
  );
  return result.rows[0] ?? null;
}

export async function eliminarProveedor(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM proveedores WHERE id = $1', [id]);
  return result.rowCount === 1;
}
