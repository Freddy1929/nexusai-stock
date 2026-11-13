import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const rutaEnv = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rutaEnv });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio. Configura una clave aleatoria de al menos 32 caracteres en el archivo .env.');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api'),
  CORS_ORIGIN: z.string().url().default('http://localhost:4200'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default('nexusai_stock'),
  DB_USER: z.string().min(1).default('nexusai'),
  DB_PASSWORD: z.string().min(1).default('nexusai_dev'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres.'),
  JWT_EXPIRES_IN: z.string()
    .regex(/^[1-9]\d*(s|m|h|d)$/, 'JWT_EXPIRES_IN debe tener un formato como 8h, 30m o 1d.')
    .default('8h'),
  IVA_PORCENTAJE: z.coerce.number().finite().min(0).max(100).default(15),
  EMISOR_RAZON_SOCIAL: z.string().default(''),
  EMISOR_RUC: z.string().default(''),
  EMISOR_DIRECCION: z.string().default(''),
  EMISOR_NOMBRE_COMERCIAL: z.string().default(''),
  EMISOR_DIRECCION_MATRIZ: z.string().default(''),
  EMISOR_ESTABLECIMIENTO: z.string().regex(/^\d{3}$/).default('001'),
  EMISOR_PUNTO_EMISION: z.string().regex(/^\d{3}$/).default('001'),
  SRI_AMBIENTE: z.enum(['1', '2']).default('1'),
  SRI_CERT_PATH: z.string().default(''),
  SRI_CERT_PASSWORD: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('La configuración del entorno no es válida:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Revisa las variables de entorno del backend.');
}

export const env = parsedEnv.data;
