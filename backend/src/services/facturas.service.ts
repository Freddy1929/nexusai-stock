import { access, mkdir, open, readFile, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { rename } from 'fs/promises';
import { env } from '../config/env';
import * as facturasRepository from '../repositories/facturas.repository';
import { FacturaDetallada, ResultadoListaFacturas, VentaParaFactura } from '../types/facturas';
import { FacturacionProvider } from '../providers/facturacion-provider';
import { PdfLocalProvider, smtpConfigurado } from '../providers/pdf-local.provider';
import { HttpError } from '../utils/http-error';
import { calcularTotalesFactura, crearClaveAccesoSimulada, crearNumeroFactura } from '../utils/facturas';
import { withTransaction } from '../utils/transaction';
import { crearXmlFacturaSri } from '../utils/facturas-sri';
import { moneyString } from '../utils/money';
import { EstadoSri } from '../types/operaciones';

const facturacionProvider: FacturacionProvider = new PdfLocalProvider();
const carpetaFacturas = path.resolve(__dirname, '../../../storage/facturas');
const carpetaXml = path.resolve(__dirname, '../../../storage/xml');

function rutaPdf(numero: string): string {
  return path.join(carpetaFacturas, `${numero}.pdf`);
}

function validarNombrePdf(nombre: string): boolean {
  return /^\d{3}-\d{3}-\d{9}\.pdf$/.test(nombre) && path.basename(nombre) === nombre;
}

function rutaXml(numero: string): string {
  return path.join(carpetaXml, `${numero}.xml`);
}

function validarNombreXml(nombre: string): boolean {
  return /^\d{3}-\d{3}-\d{9}\.xml$/.test(nombre) && path.basename(nombre) === nombre;
}

interface DatosVentaSri {
  numero: string;
  fecha: Date;
  forma_pago: VentaParaFactura['forma_pago'];
  subtotal: string;
  iva: string;
  total: string;
  cliente: VentaParaFactura['cliente'];
  items: VentaParaFactura['items'];
}

function crearXmlSri(datos: DatosVentaSri) {
  const [establecimiento, puntoEmision, secuencial] = datos.numero.split('-');
  if (
    establecimiento !== env.EMISOR_ESTABLECIMIENTO
    || puntoEmision !== env.EMISOR_PUNTO_EMISION
  ) {
    throw new Error('El establecimiento y punto de emisión deben coincidir con la numeración configurada.');
  }
  const resultado = crearXmlFacturaSri({
    fechaEmision: datos.fecha,
    ambiente: env.SRI_AMBIENTE,
    rucEmisor: env.EMISOR_RUC,
    razonSocialEmisor: env.EMISOR_RAZON_SOCIAL,
    nombreComercial: env.EMISOR_NOMBRE_COMERCIAL,
    direccionMatriz: env.EMISOR_DIRECCION_MATRIZ || env.EMISOR_DIRECCION,
    direccionEstablecimiento: env.EMISOR_DIRECCION,
    establecimiento,
    puntoEmision,
    secuencial,
    cliente: datos.cliente,
    items: datos.items.map((item) => ({
      codigo: item.codigo,
      descripcion: item.producto_nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precio_unitario
    })),
    ivaPorcentaje: env.IVA_PORCENTAJE,
    ivaTotalEsperado: datos.iva,
    formaPago: datos.forma_pago
  });
  if (
    resultado.totales.subtotal !== moneyString(Number(datos.subtotal))
    || resultado.totales.iva !== moneyString(Number(datos.iva))
    || resultado.totales.total !== moneyString(Number(datos.total))
  ) {
    throw new Error('Los cálculos del XML no coinciden con los totales guardados de la venta.');
  }
  return resultado;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido al generar el XML SRI.';
}

interface ArchivosRegenerados {
  confirmar(): Promise<void>;
  revertir(): Promise<void>;
}

async function instalarArchivosRegenerados(numero: string, xml: string, pdf: Buffer): Promise<ArchivosRegenerados> {
  // Conserva los archivos anteriores hasta que la actualización de la factura termine.
  await Promise.all([
    mkdir(carpetaXml, { recursive: true }),
    mkdir(carpetaFacturas, { recursive: true })
  ]);
  const identificador = randomUUID();
  const archivos = [
    { ruta: rutaXml(numero), contenido: xml },
    { ruta: rutaPdf(numero), contenido: pdf }
  ].map((archivo) => ({
    ...archivo,
    temporal: `${archivo.ruta}.${identificador}.tmp`,
    respaldo: `${archivo.ruta}.${identificador}.bak`
  }));
  const instalados: typeof archivos = [];
  const respaldados: typeof archivos = [];

  try {
    for (const archivo of archivos) {
      await writeFile(archivo.temporal, archivo.contenido, { flag: 'wx' });
    }
    for (const archivo of archivos) {
      try {
        await access(archivo.ruta);
        await rename(archivo.ruta, archivo.respaldo);
        respaldados.push(archivo);
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }
    for (const archivo of archivos) {
      await rename(archivo.temporal, archivo.ruta);
      instalados.push(archivo);
    }
  } catch (error) {
    await restaurarArchivos(instalados, respaldados);
    await limpiarTemporales(archivos);
    throw error;
  }

  let finalizado = false;
  return {
    confirmar: async () => {
      if (finalizado) return;
      finalizado = true;
      await limpiarTemporales(archivos);
      for (const archivo of respaldados) {
        try {
          await unlink(archivo.respaldo);
        } catch (error) {
          if (!isMissingFile(error)) console.error('No se pudo limpiar un respaldo de factura:', error);
        }
      }
    },
    revertir: async () => {
      if (finalizado) return;
      finalizado = true;
      await restaurarArchivos(instalados, respaldados);
      await limpiarTemporales(archivos);
    }
  };
}

async function restaurarArchivos(
  instalados: Array<{ ruta: string }>,
  respaldados: Array<{ ruta: string; respaldo: string }>
): Promise<void> {
  for (const archivo of [...instalados].reverse()) {
    try {
      await unlink(archivo.ruta);
    } catch (error) {
      if (!isMissingFile(error)) console.error('No se pudo quitar el archivo nuevo de una factura:', error);
    }
  }
  for (const archivo of [...respaldados].reverse()) {
    try {
      await rename(archivo.respaldo, archivo.ruta);
    } catch (error) {
      console.error('No se pudo restaurar un archivo anterior de factura:', error);
    }
  }
}

async function limpiarTemporales(archivos: Array<{ temporal: string }>): Promise<void> {
  for (const archivo of archivos) {
    try {
      await unlink(archivo.temporal);
    } catch (error) {
      if (!isMissingFile(error)) console.error('No se pudo limpiar un archivo temporal de factura:', error);
    }
  }
}

export async function listar(page: number, limit: number): Promise<ResultadoListaFacturas> {
  return facturasRepository.listar(page, limit);
}

export async function obtener(id: string): Promise<FacturaDetallada> {
  return withTransaction(async (client) => {
    const factura = await facturasRepository.buscarPorId(client, id);
    if (!factura) throw new HttpError(404, 'Factura no encontrada.');
    return factura;
  });
}

export async function generar(ventaId: string): Promise<FacturaDetallada> {
  let archivoCreado: string | null = null;
  let xmlCreado: string | null = null;
  try {
    return await withTransaction(async (client) => {
      // La secuencia de PostgreSQL mantiene la numeración única incluso con solicitudes simultáneas.
      const venta = await facturasRepository.obtenerVentaParaFactura(client, ventaId);
      if (!venta) throw new HttpError(404, 'Venta o cliente asociado no encontrado.');
      if (venta.estado === 'anulada') throw new HttpError(409, 'No se puede generar una factura para una venta anulada.');
      if (await facturasRepository.buscarPorVenta(client, ventaId)) {
        throw new HttpError(409, 'Esta venta ya tiene una factura generada.');
      }

      const consecutivo = await client.query<{ consecutivo: string }>(
        `SELECT nextval('facturas_numero_seq')::text AS consecutivo`
      );
      const valorSecuencial = consecutivo.rows[0]?.consecutivo;
      if (!valorSecuencial) throw new Error('No se pudo reservar el consecutivo de factura.');
      let numero: string;
      try {
        numero = crearNumeroFactura(valorSecuencial);
      } catch {
        throw new HttpError(409, 'Se agotó el rango de numeración de facturas.');
      }
      const fechaEmision = new Date();
      const totales = calcularTotalesFactura(Number(venta.subtotal), Number(venta.iva));
      if (totales.total !== Number(venta.total)) {
        throw new HttpError(409, 'Los totales de la venta no coinciden y no se puede generar la factura.');
      }
      let resultadoXml: ReturnType<typeof crearXmlFacturaSri> | null = null;
      let estadoSri: EstadoSri = 'error';
      let mensajeSri: string;
      let xmlPath: string | null = null;
      let claveAcceso: string | null = null;
      try {
        resultadoXml = crearXmlSri({ ...venta, numero, fecha: fechaEmision });
        await mkdir(carpetaXml, { recursive: true });
        const archivoXml = await open(rutaXml(numero), 'wx');
        xmlCreado = rutaXml(numero);
        try {
          await archivoXml.writeFile(resultadoXml.xml, 'utf8');
        } finally {
          await archivoXml.close();
        }
        claveAcceso = resultadoXml.claveAcceso;
        xmlPath = `${numero}.xml`;
        estadoSri = 'xml_generado';
        mensajeSri = resultadoXml.estado;
      } catch (error) {
        if (xmlCreado) {
          try {
            await unlink(xmlCreado);
          } catch (limpiezaError) {
            console.error('No se pudo limpiar el XML de una factura:', limpiezaError);
          }
          xmlCreado = null;
        }
        mensajeSri = mensajeError(error);
        console.error(`No se pudo generar el XML SRI para la factura ${numero}:`, error);
      }

      const documento = {
        numero,
        claveAcceso: claveAcceso ?? crearClaveAccesoSimulada(numero, env.EMISOR_RUC, fechaEmision),
        claveAccesoReal: claveAcceso !== null,
        ambienteSri: claveAcceso ? env.SRI_AMBIENTE : null,
        estadoSri,
        fechaEmision,
        emisor: {
          razonSocial: env.EMISOR_RAZON_SOCIAL,
          ruc: env.EMISOR_RUC,
          direccion: env.EMISOR_DIRECCION
        },
        cliente: venta.cliente,
        items: venta.items,
        subtotal: totales.subtotal.toFixed(2),
        iva: totales.iva.toFixed(2),
        total: Number(venta.total).toFixed(2)
      };
      const pdf = await facturacionProvider.generarPdf(documento);
      await mkdir(carpetaFacturas, { recursive: true });
      const ruta = rutaPdf(numero);
      const archivo = await open(ruta, 'wx');
      archivoCreado = ruta;
      try {
        await archivo.writeFile(pdf);
      } finally {
        await archivo.close();
      }

      return facturasRepository.crear(client, {
        venta_id: ventaId,
        numero,
        clave_acceso: claveAcceso,
        pdf_url: `${numero}.pdf`,
        xml_path: xmlPath,
        ambiente: env.SRI_AMBIENTE,
        estado_sri: estadoSri,
        mensaje_sri: mensajeSri
      });
    });
  } catch (error) {
    if (archivoCreado) {
      try {
        await unlink(archivoCreado);
      } catch (limpiezaError) {
        console.error('No se pudo limpiar el PDF de una factura no guardada:', limpiezaError);
      }
    }
    if (xmlCreado) {
      try {
        await unlink(xmlCreado);
      } catch (limpiezaError) {
        console.error('No se pudo limpiar el XML de una factura no guardada:', limpiezaError);
      }
    }
    throw error;
  }
}

export async function regenerarXml(id: string): Promise<FacturaDetallada> {
  const archivosPendientes: { valor: ArchivosRegenerados | null } = { valor: null };
  try {
    const resultado = await withTransaction(async (client) => {
      const facturaInicial = await facturasRepository.buscarPorId(client, id);
      if (!facturaInicial) throw new HttpError(404, 'Factura no encontrada.');
      const estadoVenta = await facturasRepository.bloquearVentaParaEnvio(client, facturaInicial.venta_id);
      if (estadoVenta === null) throw new HttpError(404, 'La venta asociada a la factura no existe.');
      if (estadoVenta === 'anulada') throw new HttpError(409, 'No se puede regenerar el XML de una venta anulada.');
      const factura = await facturasRepository.buscarPorId(client, id, true);
      if (!factura) throw new HttpError(404, 'Factura no encontrada.');
      if (['firmado', 'enviado', 'autorizado', 'rechazado'].includes(factura.estado_sri)) {
        throw new HttpError(409, 'No se puede regenerar un XML que ya avanzó a firma o envío SRI.');
      }
      if (!factura.pdf_url || !validarNombrePdf(factura.pdf_url)) {
        throw new HttpError(404, 'El PDF de esta factura no está disponible.');
      }

      const resultadoXml = crearXmlSri({
        numero: factura.numero,
        fecha: factura.fecha_emision,
        forma_pago: factura.forma_pago,
        subtotal: factura.subtotal,
        iva: factura.iva,
        total: factura.total,
        cliente: factura.cliente,
        items: factura.items
      });
      const pdf = await facturacionProvider.generarPdf({
        numero: factura.numero,
        claveAcceso: resultadoXml.claveAcceso,
        claveAccesoReal: true,
        ambienteSri: env.SRI_AMBIENTE,
        estadoSri: 'xml_generado',
        fechaEmision: factura.fecha_emision,
        emisor: {
          razonSocial: env.EMISOR_RAZON_SOCIAL,
          ruc: env.EMISOR_RUC,
          direccion: env.EMISOR_DIRECCION
        },
        cliente: factura.cliente,
        items: factura.items,
        subtotal: factura.subtotal,
        iva: factura.iva,
        total: factura.total
      });

      archivosPendientes.valor = await instalarArchivosRegenerados(factura.numero, resultadoXml.xml, pdf);
      await facturasRepository.actualizarXmlSri(client, id, {
        clave_acceso: resultadoXml.claveAcceso,
        xml_path: `${factura.numero}.xml`,
        ambiente: env.SRI_AMBIENTE,
        estado_sri: 'xml_generado',
        mensaje_sri: resultadoXml.estado
      }, true);
      const actualizada = await facturasRepository.buscarPorId(client, id);
      if (!actualizada) throw new Error('No se pudo recuperar la factura actualizada.');
      return actualizada;
    });
    await archivosPendientes.valor?.confirmar();
    return resultado;
  } catch (error) {
    await archivosPendientes.valor?.revertir();
    throw error;
  }
}

export async function obtenerRutaPdf(id: string): Promise<{ ruta: string; nombre: string }> {
  const factura = await obtener(id);
  if (!factura.pdf_url || !validarNombrePdf(factura.pdf_url)) {
    throw new HttpError(404, 'El PDF de esta factura no está disponible.');
  }
  const ruta = rutaPdf(factura.numero);
  try {
    await access(ruta);
  } catch (error) {
    if (isMissingFile(error)) throw new HttpError(404, 'El archivo PDF de esta factura no está disponible.');
    throw error;
  }
  return { ruta, nombre: `factura-${factura.numero}.pdf` };
}

export async function obtenerRutaXml(id: string): Promise<{ ruta: string; nombre: string }> {
  const factura = await obtener(id);
  if (!factura.xml_path || !validarNombreXml(factura.xml_path)) {
    throw new HttpError(404, 'El XML de esta factura no está disponible.');
  }
  const ruta = rutaXml(factura.xml_path.replace(/\.xml$/, ''));
  try {
    await access(ruta);
  } catch (error) {
    if (isMissingFile(error)) throw new HttpError(404, 'El archivo XML de esta factura no está disponible.');
    throw error;
  }
  return { ruta, nombre: `factura-${factura.numero}.xml` };
}

export async function enviarCorreo(id: string): Promise<{
  factura: FacturaDetallada;
  correoConfigurado: boolean;
  mensaje: string;
}> {
  const resultado = await withTransaction(async (client) => {
    const facturaInicial = await facturasRepository.buscarPorId(client, id);
    if (!facturaInicial) throw new HttpError(404, 'Factura no encontrada.');
    const estadoVenta = await facturasRepository.bloquearVentaParaEnvio(client, facturaInicial.venta_id);
    if (estadoVenta === null) throw new HttpError(404, 'La venta asociada a la factura no existe.');
    if (estadoVenta === 'anulada') throw new HttpError(409, 'No se puede enviar una factura de una venta anulada.');
    const factura = await facturasRepository.buscarPorId(client, id, true);
    if (!factura) throw new HttpError(404, 'Factura no encontrada.');
    if (factura.estado === 'anulada') throw new HttpError(409, 'No se puede enviar una factura anulada.');
    if (factura.email_enviado) throw new HttpError(409, 'Esta factura ya fue enviada al cliente.');
    if (!factura.cliente.email) {
      const mensaje = factura.cliente.identificacion === '9999999999999'
        ? 'Consumidor Final no tiene un correo registrado. No se puede enviar la factura por correo.'
        : 'El cliente no tiene correo registrado. Agrega un correo antes de enviar la factura.';
      await facturasRepository.actualizarEnvio(client, id, mensaje);
      return { tipo: 'error' as const, status: 400, mensaje };
    }
    if (!smtpConfigurado()) {
      return {
        tipo: 'pendiente' as const,
        factura,
        correoConfigurado: false,
        mensaje: 'Factura generada. El envío por correo se activará cuando se configure el servidor de correo.'
      };
    }

    try {
      const pdf = await readFile(rutaPdf(factura.numero));
      let xml: Buffer | undefined;
      if (factura.xml_path && validarNombreXml(factura.xml_path)) {
        try {
          xml = await readFile(rutaXml(factura.numero));
        } catch (error) {
          console.error(`No se pudo leer el XML de la factura ${factura.numero}; se enviará solo el PDF:`, error);
          await facturasRepository.actualizarXmlSri(client, id, {
            clave_acceso: factura.clave_acceso,
            xml_path: null,
            ambiente: factura.ambiente,
            estado_sri: 'error',
            mensaje_sri: 'No se encontró el XML en almacenamiento. Se mantuvo el envío del PDF.'
          });
        }
      }
      await facturacionProvider.enviarCorreo({
        para: factura.cliente.email,
        nombre: factura.cliente.nombre,
        numero: factura.numero,
        fechaEmision: factura.fecha_emision,
        total: factura.total,
        pdf,
        xml
      });
      await facturasRepository.actualizarEnvio(client, id, null);
      return {
        tipo: 'enviada' as const,
        correoConfigurado: true,
        mensaje: xml
          ? 'Factura PDF y XML enviados correctamente al correo del cliente.'
          : 'Factura PDF enviada correctamente; no había un XML disponible para adjuntar.'
      };
    } catch (error) {
      let mensaje = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido al enviar el correo.';
      for (const secreto of [env.SMTP_USER, env.SMTP_PASS]) {
        if (secreto) mensaje = mensaje.replaceAll(secreto, '[oculto]');
      }
      await facturasRepository.actualizarEnvio(client, id, mensaje);
      return { tipo: 'error' as const, status: 502, mensaje };
    }
  });

  if (resultado.tipo === 'error') {
    const mensaje = resultado.status === 400
      ? resultado.mensaje
      : 'No se pudo enviar el correo. Revisa la configuración SMTP e inténtalo de nuevo.';
    throw new HttpError(resultado.status, mensaje);
  }
  const factura = resultado.tipo === 'pendiente' ? resultado.factura : await obtener(id);
  return {
    factura,
    correoConfigurado: resultado.correoConfigurado,
    mensaje: resultado.mensaje
  };
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
