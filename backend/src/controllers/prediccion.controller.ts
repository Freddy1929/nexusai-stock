import { Request, Response } from 'express';
import { prediccionService } from '../services/prediccion.service';
import { validate } from '../utils/validation';
import {
  idSchema
} from '../utils/schemas';
import {
  configuracionIaSchema,
  listaPrediccionesSchema,
  seriePrediccionSchema
} from '../utils/prediccion-schemas';

export async function listar(request: Request, response: Response): Promise<void> {
  const filtros = validate(listaPrediccionesSchema, request.query);
  response.status(200).json(await prediccionService.listar(filtros));
}

export async function porProducto(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  response.status(200).json({ prediccion: await prediccionService.porProducto(id) });
}

export async function alertas(_request: Request, response: Response): Promise<void> {
  response.status(200).json({ alertas: await prediccionService.alertas() });
}

export async function serie(request: Request, response: Response): Promise<void> {
  const query = validate(seriePrediccionSchema, request.query);
  response.status(200).json(await prediccionService.serie(query.agrupar));
}

export async function recalcular(_request: Request, response: Response): Promise<void> {
  response.status(200).json({
    mensaje: 'Predicciones recalculadas correctamente.',
    resultado: await prediccionService.recalcular()
  });
}

export async function obtenerConfiguracion(_request: Request, response: Response): Promise<void> {
  response.status(200).json({ configuracion: await prediccionService.obtenerConfiguracion() });
}

export async function actualizarConfiguracion(request: Request, response: Response): Promise<void> {
  const datos = validate(configuracionIaSchema, request.body);
  response.status(200).json({
    mensaje: 'Configuración de IA guardada correctamente.',
    configuracion: await prediccionService.actualizarConfiguracion(datos)
  });
}
