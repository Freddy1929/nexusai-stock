import { pool } from '../config/database';
import { RolUsuario, UsuarioConHash, UsuarioPublico } from '../types/auth';

type DatosUsuario = Pick<UsuarioPublico, 'nombre' | 'email'>;

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioConHash | null> {
  const result = await pool.query<UsuarioConHash>(
    `SELECT id, nombre, email, password_hash, rol, creado_en
     FROM usuarios
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function buscarUsuarioPorId(id: string): Promise<UsuarioPublico | null> {
  const result = await pool.query<UsuarioPublico>(
    'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function crearUsuario(
  input: DatosUsuario,
  passwordHash: string,
  rol: RolUsuario
): Promise<UsuarioPublico> {
  const result = await pool.query<UsuarioPublico>(
    `INSERT INTO usuarios (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, rol, creado_en`,
    [input.nombre, input.email, passwordHash, rol]
  );
  return result.rows[0];
}

export async function crearAdminSiNoExiste(
  input: DatosUsuario,
  passwordHash: string
): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [input.nombre, input.email, passwordHash]
  );
  return result.rowCount === 1;
}
