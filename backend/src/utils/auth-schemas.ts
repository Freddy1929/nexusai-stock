import { z } from 'zod';
import { RolUsuario } from '../types/auth';

const emailSchema = z.email('El email no es válido.')
  .max(255, 'El email no puede superar 255 caracteres.')
  .transform((email) => email.toLowerCase());

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/\p{L}/u, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.')
  .refine(
    (password) => Buffer.byteLength(password, 'utf8') <= 72,
    'La contraseña no puede superar 72 bytes.'
  );

const credencialesSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120),
  email: emailSchema,
  password: passwordSchema
}).strict();

export const registroSchema = credencialesSchema;
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria.')
}).strict();
export const crearUsuarioAdminSchema = credencialesSchema.extend({
  rol: z.enum(['admin', 'vendedor'] satisfies [RolUsuario, ...RolUsuario[]])
});
