import { z } from 'zod';

export const idSchema = z.string().regex(/^[1-9]\d*$/, 'El id debe ser un entero positivo.');

const nombreSchema = z.string().trim().min(1, 'El nombre es obligatorio.');
const emailSchema = z.union([z.email('El email no es válido.'), z.literal(''), z.null()]).optional();
const textoOpcionalSchema = z.union([z.string().trim(), z.null()]).optional();
const numeroNoNegativoSchema = z.number().finite().nonnegative('El valor no puede ser negativo.');
const numeroPositivoSchema = z.number().finite().positive('El valor debe ser mayor que cero.');

export const categoriaSchema = z.object({
  nombre: nombreSchema
}).strict();

export const proveedorSchema = z.object({
  nombre: nombreSchema,
  ruc: z.union([
    z.string().regex(/^\d{13}$/, 'El RUC debe contener exactamente 13 dígitos.'),
    z.literal(''),
    z.null()
  ]).optional(),
  telefono: textoOpcionalSchema,
  email: emailSchema,
  direccion: textoOpcionalSchema
}).strict();

export const productoSchema = z.object({
  nombre: nombreSchema,
  codigo: z.string().trim().min(1, 'El código es obligatorio.'),
  categoria_id: z.number().int().positive('La categoría debe ser un id positivo.'),
  proveedor_id: z.number().int().positive('El proveedor debe ser un id positivo.'),
  precio_compra: numeroPositivoSchema,
  precio_venta: numeroPositivoSchema,
  cantidad: numeroNoNegativoSchema.default(0),
  unidad: z.string().trim().min(1).default('unidad'),
  limite_minimo: numeroNoNegativoSchema.default(0),
  fecha_caducidad: z.union([z.iso.date(), z.null()]).default(null),
  imagen_url: textoOpcionalSchema,
  estado_registro: z.enum(['activo', 'inactivo']).default('activo')
}).strict();

export const productoActualizacionSchema = productoSchema.extend({
  cantidad_original: numeroNoNegativoSchema
}).strict();

const enteroQuerySchema = (minimo: number, maximo?: number) => z
  .string()
  .regex(/^\d+$/, 'Debe ser un número entero.')
  .transform(Number)
  .pipe(
    maximo === undefined
      ? z.number().int().min(minimo)
      : z.number().int().min(minimo).max(maximo)
  );

export const listaProductosQuerySchema = z.object({
  categoria_id: enteroQuerySchema(1).optional(),
  estado: z.enum(['Disponible', 'Agotado']).optional(),
  busqueda: z.string().trim().min(1).max(100).optional(),
  page: enteroQuerySchema(1).default(1),
  limit: enteroQuerySchema(1, 100).default(10)
}).strict();

export const diasQuerySchema = z.object({
  dias: enteroQuerySchema(1, 3650).default(30)
}).strict();
