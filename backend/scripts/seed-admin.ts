import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../src/config/database';
import * as usuariosRepository from '../src/repositories/usuarios.repository';

const credentialsSchema = z.object({
  ADMIN_EMAIL: z.email('ADMIN_EMAIL debe ser un email válido.').transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string()
    .min(8, 'ADMIN_PASSWORD debe tener al menos 8 caracteres.')
    .max(72, 'ADMIN_PASSWORD no puede superar 72 caracteres.')
    .regex(/\p{L}/u, 'ADMIN_PASSWORD debe incluir al menos una letra.')
    .regex(/\d/, 'ADMIN_PASSWORD debe incluir al menos un número.')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72,
      'ADMIN_PASSWORD no puede superar 72 bytes.')
});

async function seedAdmin(): Promise<void> {
  const credentials = credentialsSchema.safeParse(process.env);
  if (!credentials.success) {
    console.error('No se pudo crear el administrador:', credentials.error.flatten().fieldErrors);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(credentials.data.ADMIN_PASSWORD, 12);
  const inserted = await usuariosRepository.crearAdminSiNoExiste({
    nombre: 'Administrador',
    email: credentials.data.ADMIN_EMAIL
  }, passwordHash);

  console.log(inserted
    ? 'Usuario administrador creado correctamente.'
    : 'El usuario administrador ya existía; no se realizaron cambios.');
}

seedAdmin()
  .catch((error: unknown) => {
    console.error('No se pudo completar la carga del administrador:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
