import { z } from 'zod';
import { listaPaginadaSchema } from './operaciones-schemas';

export const nivelAlertaSchema = z.enum(['critico', 'advertencia', 'normal']);

export const listaPrediccionesSchema = listaPaginadaSchema.extend({
  nivel: nivelAlertaSchema.optional(),
  busqueda: z.string().trim().min(1).max(160).optional()
}).strict();

export const seriePrediccionSchema = z.object({
  agrupar: z.enum(['semana', 'mes']).default('semana')
}).strict();

export const configuracionIaSchema = z.object({
  ventana_dias: z.number().int().min(30).max(180),
  dias_recientes: z.number().int().min(1).max(30),
  dias_intermedios: z.number().int().min(8).max(90),
  peso_reciente: z.number().int().positive().max(20),
  peso_intermedio: z.number().int().positive().max(20),
  peso_antiguo: z.number().int().positive().max(20),
  umbral_critico: z.number().int().positive().max(60),
  umbral_advertencia: z.number().int().positive().max(90)
}).strict().superRefine((configuracion, context) => {
  if (configuracion.dias_intermedios <= configuracion.dias_recientes) {
    context.addIssue({
      code: 'custom',
      path: ['dias_intermedios'],
      message: 'El periodo intermedio debe ser mayor que los días recientes.'
    });
  }
  if (configuracion.ventana_dias < configuracion.dias_intermedios) {
    context.addIssue({
      code: 'custom',
      path: ['ventana_dias'],
      message: 'La ventana debe cubrir el periodo intermedio.'
    });
  }
  if (configuracion.umbral_advertencia <= configuracion.umbral_critico) {
    context.addIssue({
      code: 'custom',
      path: ['umbral_advertencia'],
      message: 'El umbral de advertencia debe ser mayor que el crítico.'
    });
  }
});
