import { NextFunction, Request, Response } from 'express';
import * as facturasService from '../services/facturas.service';
import { idSchema } from '../utils/schemas';
import { listaPaginadaSchema } from '../utils/operaciones-schemas';
import { validate } from '../utils/validation';

export async function listar(request: Request, response: Response): Promise<void> {
  const query = validate(listaPaginadaSchema, request.query);
  response.status(200).json(await facturasService.listar(query.page, query.limit));
}

export async function obtener(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  response.status(200).json({ factura: await facturasService.obtener(id) });
}

export async function generar(request: Request, response: Response): Promise<void> {
  const ventaId = validate(idSchema, request.params.ventaId);
  const factura = await facturasService.generar(ventaId);
  const mensaje = factura.estado_sri === 'xml_generado'
    ? 'Factura y XML generados. El XML está pendiente de firma y autorización del SRI.'
    : 'Factura PDF generada, pero no se pudo crear el XML SRI. Revisa el mensaje SRI de la factura.';
  response.status(201).json({ mensaje, factura });
}

export async function regenerarXml(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const factura = await facturasService.regenerarXml(id);
  response.status(200).json({
    mensaje: 'XML regenerado para la misma factura. Está pendiente de firma y autorización del SRI.',
    factura
  });
}

export async function descargarPdf(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = validate(idSchema, request.params.id);
    const archivo = await facturasService.obtenerRutaPdf(id);
    response.download(archivo.ruta, archivo.nombre, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}

export async function descargarXml(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = validate(idSchema, request.params.id);
    const archivo = await facturasService.obtenerRutaXml(id);
    response.download(archivo.ruta, archivo.nombre, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}

export async function enviarCorreo(request: Request, response: Response): Promise<void> {
  const id = validate(idSchema, request.params.id);
  const resultado = await facturasService.enviarCorreo(id);
  response.status(200).json(resultado);
}
