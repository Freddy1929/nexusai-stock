import { z } from 'zod';
import { validarIdentificacion } from './identificacion-ecuatoriana';

const emailOpcionalSchema = z.union([
  z.email('El email no es válido.'),
  z.literal(''),
  z.null()
]).optional();

export const clienteSchema = z.object({
  tipo_identificacion: z.enum(['cedula', 'ruc', 'pasaporte']),
  identificacion: z.string().trim().min(1, 'La identificación es obligatoria.').max(20),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(160),
  email: emailOpcionalSchema,
  telefono: z.union([z.string().trim().max(30), z.null()]).optional(),
  direccion: z.union([z.string().trim(), z.null()]).optional()
}).strict().superRefine((cliente, context) => {
  if (cliente.identificacion === '9999999999999') {
    return;
  }
  if (!validarIdentificacion(cliente.tipo_identificacion, cliente.identificacion)) {
    context.addIssue({
      code: 'custom',
      path: ['identificacion'],
      message: `La identificación no es válida para el tipo ${cliente.tipo_identificacion}.`
    });
  }
});

const itemVentaSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().finite().positive('La cantidad debe ser mayor que cero.')
}).strict();

export const crearVentaSchema = z.object({
  cliente_id: z.number().int().positive(),
  items: z.array(itemVentaSchema).min(1, 'La venta debe incluir al menos un producto.'),
  forma_pago: z.enum(['01', '15', '16', '17', '18', '19', '20', '21']).default('01')
}).strict().superRefine((venta, context) => {
  const productos = new Set<number>();
  venta.items.forEach((item, index) => {
    if (productos.has(item.producto_id)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'producto_id'],
        message: 'No se permiten productos repetidos en una venta.'
      });
    }
    productos.add(item.producto_id);
  });
});

const itemPedidoSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().finite().positive('La cantidad debe ser mayor que cero.'),
  costo_unitario: z.number().finite().nonnegative('El costo no puede ser negativo.')
}).strict();

function validarItemsPedido(items: Array<z.infer<typeof itemPedidoSchema>>, context: z.RefinementCtx): void {
  const productos = new Set<number>();
  items.forEach((item, index) => {
    if (productos.has(item.producto_id)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'producto_id'],
        message: 'No se permiten productos repetidos en un pedido.'
      });
    }
    productos.add(item.producto_id);
  });
}

export const crearPedidoSchema = z.object({
  proveedor_id: z.number().int().positive(),
  items: z.array(itemPedidoSchema).min(1, 'El pedido debe incluir al menos un producto.')
}).strict().superRefine((pedido, context) => validarItemsPedido(pedido.items, context));

export const actualizarPedidoSchema = crearPedidoSchema;

const pageSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).default(1);
const limitSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(10);
const fechaQuerySchema = z.iso.date();

export const listaPaginadaSchema = z.object({
  page: pageSchema,
  limit: limitSchema
}).strict();

export const listaClientesQuerySchema = listaPaginadaSchema.extend({
  busqueda: z.string().trim().min(1).max(160).optional()
}).strict();

export const buscarIdentificacionSchema = z.object({
  identificacion: z.string().trim().min(1, 'La identificación es obligatoria.').max(20)
}).strict();

export const listaVentasQuerySchema = listaPaginadaSchema.extend({
  desde: fechaQuerySchema.optional(),
  hasta: fechaQuerySchema.optional(),
  cliente_id: z.string().regex(/^[1-9]\d*$/, 'El cliente debe ser un id positivo.').optional()
}).strict();

export const rangoDashboardSchema = z.object({
  desde: fechaQuerySchema.optional(),
  hasta: fechaQuerySchema.optional()
}).strict();

export const ventasHistoricasQuerySchema = rangoDashboardSchema.extend({
  agrupar: z.enum(['semana', 'mes']).default('semana')
}).strict();
