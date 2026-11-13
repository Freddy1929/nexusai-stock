import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { DatosEnvioFactura, DatosFacturaPdf } from '../types/facturas';
import { EstadoSri } from '../types/operaciones';
import { FacturacionProvider } from './facturacion-provider';

const moneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const colores = {
  azul: '#1a56db',
  azulOscuro: '#1e3a8a',
  azulClaro: '#e0e9ff',
  morado: '#7c3aed',
  grisClaro: '#f3f4f6',
  texto: '#111827',
  gris: '#6b7280',
  blanco: '#ffffff'
};

function fechaFormato(fecha: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(fecha);
}

function etiquetaEstadoSri(estado: EstadoSri): string {
  const etiquetas: Record<EstadoSri, string> = {
    sin_xml: 'Sin XML',
    xml_generado: 'XML generado, pendiente de firma y autorización SRI',
    firmado: 'Firmado, pendiente de envío al SRI',
    enviado: 'Enviado al SRI, pendiente de autorización',
    autorizado: 'Autorizado por el SRI',
    rechazado: 'Rechazado por el SRI',
    error: 'Error al generar o localizar el XML'
  };
  return etiquetas[estado];
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter] ?? caracter);
}

export function crearContenidoCorreo(datos: DatosEnvioFactura): { asunto: string; texto: string; html: string } {
  const nombre = escaparHtml(datos.nombre);
  const numero = escaparHtml(datos.numero);
  const fecha = fechaFormato(datos.fechaEmision);
  const total = escaparHtml(moneda.format(Number(datos.total)));
  const adjuntos = datos.xml ? 'PDF y XML adjuntos' : 'Factura adjunta en PDF';
  return {
    asunto: `Tu factura N.º ${datos.numero} · NexusAI Stock`,
    texto: `¡Hola, ${datos.nombre}! Gracias por tu compra.\n\nAdjuntamos tu factura N.º ${datos.numero} (${datos.xml ? 'PDF y XML' : 'PDF'}).\nFecha: ${fecha}\nTOTAL: ${moneda.format(Number(datos.total))}\n\n¡Gracias por confiar en NexusAI Stock!\nEste es un mensaje automático, por favor no responda.`,
    html: `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background-color:${colores.grisClaro};font-family:Arial,Helvetica,sans-serif;color:${colores.texto};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:24px 30px;background-color:${colores.azulOscuro};border-bottom:4px solid ${colores.morado};">
      <div style="font-size:28px;font-weight:700;color:#ffffff;">NexusAI Stock</div>
      <div style="margin-top:5px;font-size:14px;color:${colores.azulClaro};">Gestión inteligente de inventario</div>
    </td></tr>
    <tr><td style="padding:28px 30px 12px;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 12px;">¡Hola, <strong>${nombre}</strong>! Gracias por tu compra.</p>
      <p style="margin:0;">Adjuntamos tu factura electrónica N.º <strong>${numero}</strong>.</p>
    </td></tr>
    <tr><td style="padding:12px 30px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${colores.grisClaro};border-radius:10px;">
        <tr><td style="padding:18px 20px;color:${colores.gris};font-size:14px;">Fecha de emisión</td><td align="right" style="padding:18px 20px;color:${colores.texto};font-size:14px;font-weight:600;">${fecha}</td></tr>
        <tr><td style="padding:0 20px 18px;color:${colores.gris};font-size:14px;">Factura N.º</td><td align="right" style="padding:0 20px 18px;color:${colores.texto};font-size:14px;font-weight:600;">${numero}</td></tr>
        <tr><td style="padding:16px 20px;background-color:${colores.azulClaro};color:${colores.azulOscuro};font-size:15px;font-weight:700;">TOTAL</td><td align="right" style="padding:16px 20px;background-color:${colores.azulClaro};color:${colores.azul};font-size:21px;font-weight:700;">${total}</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:4px 30px 28px;">
      <span style="display:inline-block;padding:13px 22px;background-color:${colores.azul};border-radius:7px;color:#ffffff;font-size:14px;font-weight:700;">${adjuntos}</span>
    </td></tr>
    <tr><td style="padding:20px 30px;background-color:${colores.grisClaro};text-align:center;">
      <div style="color:${colores.azulOscuro};font-size:15px;font-weight:700;">¡Gracias por confiar en NexusAI Stock!</div>
      <div style="margin-top:8px;color:${colores.gris};font-size:12px;">Este es un mensaje automático, por favor no responda.</div>
    </td></tr>
  </table>
</body>
</html>`
  };
}

export function smtpConfigurado(
  configuracion: Pick<typeof env, 'SMTP_HOST' | 'SMTP_USER' | 'SMTP_PASS' | 'SMTP_FROM'> = env
): boolean {
  return Boolean(
    configuracion.SMTP_HOST.trim()
    && configuracion.SMTP_USER.trim()
    && configuracion.SMTP_PASS.trim()
    && configuracion.SMTP_FROM.trim()
  );
}

export function crearAdjuntosFactura(datos: Pick<DatosEnvioFactura, 'numero' | 'pdf' | 'xml'>): Array<{
  filename: string;
  content: Buffer;
  contentType: string;
}> {
  return [
    {
      filename: `factura-${datos.numero}.pdf`,
      content: datos.pdf,
      contentType: 'application/pdf'
    },
    ...(datos.xml ? [{
      filename: `factura-${datos.numero}.xml`,
      content: datos.xml,
      contentType: 'application/xml'
    }] : [])
  ];
}

export class PdfLocalProvider implements FacturacionProvider {
  async generarPdf(datos: DatosFacturaPdf): Promise<Buffer> {
    const documento = new PDFDocument({ size: 'A4', margin: 0 });
    const partes: Buffer[] = [];
    const finalizado = new Promise<Buffer>((resolve, reject) => {
      documento.on('data', (parte: Buffer) => partes.push(parte));
      documento.on('end', () => resolve(Buffer.concat(partes)));
      documento.on('error', reject);
    });

    const ancho = documento.page.width;
    const alto = documento.page.height;
    const margen = 42;
    const anchoTabla = ancho - margen * 2;
    const pieY = alto - 98;
    const columnas = [
      { titulo: 'Código', x: margen, ancho: 66, align: 'left' as const },
      { titulo: 'Descripción', x: margen + 66, ancho: 194, align: 'left' as const },
      { titulo: 'Cantidad', x: margen + 260, ancho: 62, align: 'right' as const },
      { titulo: 'P. Unitario', x: margen + 322, ancho: 91, align: 'right' as const },
      { titulo: 'Subtotal', x: margen + 413, ancho: anchoTabla - 413, align: 'right' as const }
    ];

    const dibujarEncabezado = (): void => {
      documento.rect(0, 0, ancho, 122).fill(colores.azulOscuro);
      documento.rect(0, 120, ancho, 4).fill(colores.morado);
      documento.font('Helvetica-Bold').fontSize(25).fillColor(colores.blanco)
        .text('NexusAI Stock', 42, 30, { width: 300, lineBreak: false });
      documento.font('Helvetica').fontSize(11).fillColor(colores.azulClaro)
        .text('Gestión inteligente de inventario', 44, 66, { width: 300, lineBreak: false });
      documento.roundedRect(ancho - 194, 17, 166, 88, 9).fill(colores.blanco);
      documento.font('Helvetica-Bold').fontSize(15).fillColor(colores.azulOscuro)
        .text('FACTURA', ancho - 180, 26, { width: 138, align: 'right', lineBreak: false });
      documento.font('Helvetica-Bold').fontSize(10).fillColor(colores.texto)
        .text(datos.numero, ancho - 180, 52, { width: 138, align: 'right', lineBreak: false });
      documento.font('Helvetica').fontSize(9).fillColor(colores.gris)
        .text(`Emisión: ${fechaFormato(datos.fechaEmision)}`, ancho - 180, 72, {
          width: 138,
          align: 'right',
          lineBreak: false
        });
    };

    const dibujarTarjeta = (
      x: number,
      titulo: string,
      lineas: string[]
    ): void => {
      documento.roundedRect(x, 142, 247, 106, 8).fill(colores.grisClaro);
      documento.font('Helvetica-Bold').fontSize(11).fillColor(colores.azul)
        .text(titulo, x + 13, 153, { width: 220, lineBreak: false });
      documento.font('Helvetica').fontSize(8.5).fillColor(colores.texto);
      let y = 172;
      for (const linea of lineas) {
        const altura = documento.heightOfString(linea, { width: 220 });
        documento.text(linea, x + 13, y, { width: 220, height: Math.max(11, altura) });
        y += Math.max(13, altura + 2);
      }
    };

    const dibujarEncabezadoTabla = (y: number): number => {
      documento.roundedRect(margen, y, anchoTabla, 28, 5).fill(colores.azul);
      documento.font('Helvetica-Bold').fontSize(8).fillColor(colores.blanco);
      for (const columna of columnas) {
        documento.text(columna.titulo, columna.x + 5, y + 9, {
          width: columna.ancho - 10,
          align: columna.align,
          lineBreak: false
        });
      }
      return y + 28;
    };

    const dibujarPaginaContinuacion = (): number => {
      documento.addPage({ size: 'A4', margin: 0 });
      documento.rect(0, 0, ancho, 4).fill(colores.morado);
      documento.font('Helvetica-Bold').fontSize(13).fillColor(colores.azulOscuro)
        .text('NexusAI Stock', margen, 23, { lineBreak: false });
      documento.font('Helvetica').fontSize(9).fillColor(colores.gris)
        .text(`Continuación de la factura ${datos.numero}`, margen, 43, { lineBreak: false });
      return dibujarEncabezadoTabla(65);
    };

    dibujarEncabezado();
    dibujarTarjeta(margen, 'Emisor', [
      datos.emisor.razonSocial || 'Razón social no especificada',
      `RUC: ${datos.emisor.ruc || 'No especificado'}`,
      `Dirección: ${datos.emisor.direccion || 'No especificada'}`
    ]);
    dibujarTarjeta(margen + 264, 'Facturado a', [
      `Identificación: ${datos.cliente.identificacion}`,
      `Nombre: ${datos.cliente.nombre}`,
      `Correo: ${datos.cliente.email || 'No registrado'}`,
      `Dirección: ${datos.cliente.direccion || 'No registrada'}`
    ]);
    documento.font('Helvetica').fontSize(7).fillColor(colores.gris)
      .text(`${datos.claveAccesoReal ? 'Clave de acceso' : 'Clave de acceso simulada'}: ${datos.claveAcceso}`, margen, 258, {
        width: anchoTabla,
        lineBreak: false
      });
    if (datos.claveAccesoReal) {
      documento.text(`Ambiente: ${datos.ambienteSri === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}`, margen, 268, {
        width: anchoTabla,
        lineBreak: false
      });
    }
    documento.text(
      `Estado SRI: ${etiquetaEstadoSri(datos.estadoSri)}`,
      margen,
      datos.claveAccesoReal ? 278 : 268,
      { width: anchoTabla, lineBreak: false }
    );

    let y = dibujarEncabezadoTabla(290);
    const limiteTabla = pieY - 12;

    for (let indice = 0; indice < datos.items.length; indice += 1) {
      const item = datos.items[indice];
      documento.font('Helvetica').fontSize(8);
      const alturaDescripcion = documento.heightOfString(item.producto_nombre, {
        width: columnas[1].ancho - 10
      });
      const alturaFila = Math.max(29, alturaDescripcion + 12);
      if (y + alturaFila > limiteTabla) y = dibujarPaginaContinuacion();

      documento.rect(margen, y, anchoTabla, alturaFila)
        .fill(indice % 2 === 0 ? colores.blanco : colores.grisClaro);
      documento.font('Helvetica').fontSize(8).fillColor(colores.texto);
      const celdas = [
        item.codigo,
        item.producto_nombre,
        item.cantidad,
        moneda.format(Number(item.precio_unitario)),
        moneda.format(Number(item.subtotal))
      ];
      for (let columna = 0; columna < columnas.length; columna += 1) {
        const definicion = columnas[columna];
        documento.text(celdas[columna], definicion.x + 5, y + 6, {
          width: definicion.ancho - 10,
          height: alturaFila - 9,
          align: definicion.align,
          lineBreak: columna === 1,
          ellipsis: columna !== 1
        });
      }
      documento.moveTo(margen, y + alturaFila).lineTo(margen + anchoTabla, y + alturaFila)
        .lineWidth(0.4).strokeColor('#d1d5db').stroke();
      y += alturaFila;
    }

    if (y + 96 > pieY - 12) y = dibujarPaginaContinuacion();
    const anchoTotales = 225;
    const xTotales = ancho - margen - anchoTotales;
    documento.font('Helvetica').fontSize(9).fillColor(colores.gris);
    documento.text(`Subtotal: ${moneda.format(Number(datos.subtotal))}`, xTotales, y + 12, {
      width: anchoTotales,
      align: 'right',
      lineBreak: false
    });
    const porcentajeIva = Number(datos.subtotal) > 0
      ? (Number(datos.iva) / Number(datos.subtotal) * 100).toFixed(0)
      : '0';
    documento.text(`IVA (${porcentajeIva}%): ${moneda.format(Number(datos.iva))}`, xTotales, y + 30, {
      width: anchoTotales,
      align: 'right',
      lineBreak: false
    });
    documento.roundedRect(xTotales, y + 51, anchoTotales, 38, 6).fill(colores.azul);
    documento.font('Helvetica-Bold').fontSize(12).fillColor(colores.blanco)
      .text(`TOTAL  ${moneda.format(Number(datos.total))}`, xTotales + 12, y + 63, {
        width: anchoTotales - 24,
        align: 'right',
        lineBreak: false
      });

    documento.roundedRect(margen, pieY, anchoTabla, 60, 8).fill(colores.azulClaro);
    documento.font('Helvetica-Bold').fontSize(15).fillColor(colores.azulOscuro)
      .text('¡Gracias por su compra!', margen + 12, pieY + 10, {
        width: anchoTabla - 24,
        align: 'center',
        lineBreak: false
      });
    documento.font('Helvetica').fontSize(9).fillColor(colores.azulOscuro)
      .text('Esperamos verte pronto · NexusAI Stock', margen + 12, pieY + 36, {
        width: anchoTabla - 24,
        align: 'center',
        lineBreak: false
      });
    documento.font('Helvetica').fontSize(7).fillColor(colores.gris)
      .text(
        datos.estadoSri === 'autorizado'
          ? 'Comprobante autorizado por el SRI'
          : 'Documento de prueba sin autorización del SRI',
        margen,
        alto - 25,
        {
        width: anchoTabla,
        align: 'center',
        lineBreak: false
        }
      );
    documento.end();
    return finalizado;
  }

  async enviarCorreo(datos: DatosEnvioFactura): Promise<void> {
    if (!smtpConfigurado()) {
      throw new Error('Falta configurar SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM.');
    }

    const transporte = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
    const contenido = crearContenidoCorreo(datos);
    await transporte.sendMail({
      from: env.SMTP_FROM,
      to: datos.para,
      subject: contenido.asunto,
      text: contenido.texto,
      html: contenido.html,
      attachments: crearAdjuntosFactura(datos)
    });
  }
}
