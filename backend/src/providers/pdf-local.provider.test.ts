import { describe, expect, it } from 'vitest';
import { crearAdjuntosFactura, crearContenidoCorreo, PdfLocalProvider, smtpConfigurado } from './pdf-local.provider';

const datosEjemplo = {
  numero: '001-001-000000001',
  claveAcceso: '1'.repeat(49),
  claveAccesoReal: true,
  ambienteSri: '1' as const,
  estadoSri: 'xml_generado' as const,
  fechaEmision: new Date('2026-11-11T12:00:00Z'),
  emisor: { razonSocial: 'Tienda de prueba', ruc: '1790012345001', direccion: 'Quito' },
  cliente: {
    tipo_identificacion: 'cedula' as const,
    identificacion: '1712345678',
    nombre: 'Cliente de prueba',
    email: 'cliente@example.test',
    direccion: 'Quito'
  },
  items: [{
    producto_nombre: 'Arroz',
    codigo: 'ARR-001',
    cantidad: '2',
    precio_unitario: '1.25',
    subtotal: '2.50'
  }],
  subtotal: '2.50',
  iva: '0.38',
  total: '2.88'
};

describe('PdfLocalProvider', () => {
  it('crea un PDF con información de la factura y el aviso de prueba', async () => {
    const proveedor = new PdfLocalProvider();
    const pdf = await proveedor.generarPdf(datosEjemplo);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('%%EOF');
    expect(pdf.toString('latin1')).toContain('/Type /Page');
  });

  it('continúa el detalle en otra página cuando hay muchas filas', async () => {
    const proveedor = new PdfLocalProvider();
    const pdf = await proveedor.generarPdf({
      ...datosEjemplo,
      items: Array.from({ length: 60 }, (_, indice) => ({
        ...datosEjemplo.items[0],
        codigo: `ARR-${String(indice + 1).padStart(3, '0')}`,
        producto_nombre: `Producto de prueba ${indice + 1}`
      }))
    });
    const paginas = pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? [];

    expect(paginas.length).toBeGreaterThan(1);
  });

  it('prepara correo HTML y texto plano con datos escapados y total', () => {
    const contenido = crearContenidoCorreo({
      para: 'cliente@example.test',
      nombre: '<Cliente>',
      numero: '001-001-000000001',
      fechaEmision: new Date('2026-11-11T12:00:00Z'),
      total: '2.88',
      pdf: Buffer.from('PDF')
    });

    expect(contenido.asunto).toBe('Tu factura N.º 001-001-000000001 · NexusAI Stock');
    expect(contenido.html).toContain('Hola, <strong>&lt;Cliente&gt;</strong>');
    expect(contenido.html).toContain('Factura adjunta en PDF');
    expect(contenido.html).toContain('2,88');
    expect(contenido.texto).toContain('TOTAL:');
    expect(contenido.texto).toContain('2,88');
    expect(contenido.texto).toContain('PDF');
  });

  it('incluye el XML en el texto del correo cuando existe el adjunto', () => {
    const contenido = crearContenidoCorreo({
      para: 'cliente@example.test',
      nombre: 'Cliente',
      numero: '001-001-000000001',
      fechaEmision: new Date('2026-11-11T12:00:00Z'),
      total: '2.88',
      pdf: Buffer.from('PDF'),
      xml: Buffer.from('<factura/>')
    });

    expect(contenido.texto).toContain('PDF y XML');
    expect(contenido.html).toContain('PDF y XML adjuntos');
  });

  it('adjunta PDF siempre y XML cuando se encuentra disponible', () => {
    const adjuntos = crearAdjuntosFactura({
      numero: '001-001-000000001',
      pdf: Buffer.from('PDF'),
      xml: Buffer.from('<factura/>')
    });

    expect(adjuntos.map((adjunto) => adjunto.filename)).toEqual([
      'factura-001-001-000000001.pdf',
      'factura-001-001-000000001.xml'
    ]);
    expect(adjuntos[1].contentType).toBe('application/xml');
    expect(crearAdjuntosFactura({
      numero: '001-001-000000001',
      pdf: Buffer.from('PDF')
    })).toHaveLength(1);
  });

  it('solo considera configurado el correo cuando están presentes todos los datos SMTP', () => {
    expect(smtpConfigurado({
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'usuario',
      SMTP_PASS: 'clave',
      SMTP_FROM: 'ventas@example.test'
    })).toBe(true);
    expect(smtpConfigurado({
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
      SMTP_FROM: ''
    })).toBe(false);
  });
});
