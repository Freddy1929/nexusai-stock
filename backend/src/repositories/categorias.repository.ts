import { pool } from '../config/database';
import { Categoria } from '../types/entities';

export async function listarCategorias(): Promise<Categoria[]> {
  const result = await pool.query<Categoria>(
    'SELECT id, nombre, creado_en FROM categorias ORDER BY nombre ASC'
  );
  return result.rows;
}

export async function buscarCategoriaPorId(id: string): Promise<Categoria | null> {
  const result = await pool.query<Categoria>(
    'SELECT id, nombre, creado_en FROM categorias WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const result = await pool.query<Categoria>(
    'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre, creado_en',
    [nombre]
  );
  return result.rows[0];
}

export async function actualizarCategoria(id: string, nombre: string): Promise<Categoria | null> {
  const result = await pool.query<Categoria>(
    'UPDATE categorias SET nombre = $2 WHERE id = $1 RETURNING id, nombre, creado_en',
    [id, nombre]
  );
  return result.rows[0] ?? null;
}

export async function eliminarCategoria(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
  return result.rowCount === 1;
}
