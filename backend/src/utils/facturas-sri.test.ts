import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import {
  calcularDigitoVerificadorModulo11,
  crearClaveAccesoSri,
  crearXmlFacturaSri,
  mapearIdentificacionCompradorSri
} from './facturas-sri';

const datosBase = {
  fechaEmision: new Date('2026-11-12T12:00:00Z'),
  ambiente: '1' as const,
  rucEmisor: '1790012345001',
  razonSocialEmisor: 'Comercial & Asociados',
  nombreComercial: 'Tienda <Central>',
  direccionMatriz: 'Av. Principal & Calle 2',
  direccionEstablecimiento: 'Quito',
  establecimiento: '001',
  puntoEmision: '001',
  secuencial: '27',
  codigoNumerico: '12345678',
  cliente: {
    tipo_identificacion: 'cedula' as const,
    identificacion: '3012345678',
    nombre: 'Cliente & Comprador',
    email: 'cliente@example.test',
    direccion: 'Calle <Uno>'
  },
  items: [
    { codigo: 'ARR-001', descripcion: 'Arroz & azúcar', cantidad: '2', precioUnitario: '1.25' }
  ],
  ivaPorcentaje: 15,
  formaPago: '01' as const
};

describe('clave de acceso SRI', () => {
  it('genera una clave conocida de 49 dígitos con ambiente de pruebas', () => {
    const clave = crearClaveAccesoSri(datosBase);

    expect(clave).toBe('1211202601179001234500110010010000000271234567813');
    expect(clave).toMatch(/^\d{49}$/);
    expect(clave).toContain('001001000000027');
  });

  it('genera una clave conocida con ceros a la izquierda y ambiente de producción', () => {
    const clave = crearClaveAccesoSri({
      ...datosBase,
      fechaEmision: new Date('2026-01-01T12:00:00Z'),
      ambiente: '2',
      secuencial: '1',
      codigoNumerico: '0'
    });

    expect(clave).toBe('0101202601179001234500120010010000000010000000018');
    expect(clave).toMatch(/^\d{49}$/);
  });

  it('genera códigos numéricos aleatorios al crear XML de facturas', () => {
    const primera = crearXmlFacturaSri(datosBase).claveAcceso;
    const segunda = crearXmlFacturaSri(datosBase).claveAcceso;

    expect(primera).not.toBe(segunda);
    expect(primera.slice(39, 47)).toMatch(/^\d{8}$/);
    expect(segunda.slice(39, 47)).toMatch(/^\d{8}$/);
  });

  it('rechaza un RUC de emisor que no tenga 13 dígitos y termine en 001', () => {
    expect(() => crearClaveAccesoSri({ ...datosBase, rucEmisor: '1790012345' })).toThrow(/13 dígitos/);
    expect(() => crearClaveAccesoSri({ ...datosBase, rucEmisor: '1790012345002' })).toThrow(/13 dígitos/);
  });

  it('calcula el dígito verificador módulo 11 para una cadena de 48 dígitos', () => {
    expect(calcularDigitoVerificadorModulo11('121120260117900123450011001001000000027123456781')).toBe('3');
    expect(calcularDigitoVerificadorModulo11('0'.repeat(48))).toBe('0');
    expect(calcularDigitoVerificadorModulo11(`${'0'.repeat(47)}6`)).toBe('1');
  });
});

describe('identificación del comprador SRI', () => {
  it.each([
    ['cedula', '3012345678', '05'],
    ['ruc', '1790012345001', '04'],
    ['pasaporte', 'AB123456', '06']
  ] as const)('mapea %s al código %s', (tipo_identificacion, identificacion, codigo) => {
    expect(mapearIdentificacionCompradorSri({
      tipo_identificacion,
      identificacion,
      nombre: 'Cliente de prueba'
    })).toEqual({
      tipoIdentificacionComprador: codigo,
      identificacionComprador: identificacion,
      razonSocialComprador: 'Cliente de prueba'
    });
  });

  it('reconoce al consumidor final y normaliza su nombre', () => {
    expect(mapearIdentificacionCompradorSri({
      tipo_identificacion: 'cedula',
      identificacion: '9999999999999',
      nombre: 'Nombre local'
    })).toEqual({
      tipoIdentificacionComprador: '07',
      identificacionComprador: '9999999999999',
      razonSocialComprador: 'CONSUMIDOR FINAL'
    });
  });
});

describe('XML de factura SRI', () => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false
  });

  it('genera el XML 2.1.0 con detalle, cálculos, pagos y campos adicionales en orden', () => {
    const resultado = crearXmlFacturaSri(datosBase);
    const documento = parser.parse(resultado.xml).factura;

    expect(resultado.estado).toBe('XML generado, pendiente de firma y autorización SRI');
    expect(documento['@_version']).toBe('2.1.0');
    expect(documento.infoTributaria.codDoc).toBe('01');
    expect(documento.infoFactura.tipoIdentificacionComprador).toBe('05');
    expect(documento.infoFactura.totalConImpuestos.totalImpuesto.codigo).toBe('2');
    expect(documento.infoFactura.totalConImpuestos.totalImpuesto.codigoPorcentaje).toBe('4');
    expect(documento.infoFactura.totalConImpuestos.totalImpuesto.baseImponible).toBe('2.50');
    expect(documento.infoFactura.totalConImpuestos.totalImpuesto.valor).toBe('0.38');
    expect(documento.infoFactura.pagos.pago.formaPago).toBe('01');
    expect(documento.infoFactura.pagos.pago.total).toBe('2.88');
    expect(documento.detalles.detalle.impuestos.impuesto.valor).toBe('0.38');
    expect(resultado.totales).toEqual({
      subtotal: '2.50',
      iva: '0.38',
      descuento: '0.00',
      propina: '0.00',
      total: '2.88'
    });
  });

  it('escapa texto y agrupa bases de IVA 0% y 15%', () => {
    const resultado = crearXmlFacturaSri({
      ...datosBase,
      items: [
        { codigo: 'A', descripcion: 'Producto <uno> & "dos"', cantidad: 1, precioUnitario: 10, ivaPorcentaje: 0 },
        { codigo: 'B', descripcion: 'Producto gravado', cantidad: 1, precioUnitario: 10, ivaPorcentaje: 15 }
      ]
    });
    const documento = parser.parse(resultado.xml).factura;
    const impuestos = documento.infoFactura.totalConImpuestos.totalImpuesto;

    expect(resultado.xml).toContain('Producto &lt;uno&gt; &amp; &quot;dos&quot;');
    expect(Array.isArray(impuestos)).toBe(true);
    expect(impuestos.map((impuesto: { codigoPorcentaje: string }) => impuesto.codigoPorcentaje)).toEqual(['0', '4']);
    expect(resultado.totales).toMatchObject({ subtotal: '20.00', iva: '1.50', total: '21.50' });
  });

  it('conserva hasta seis decimales en cantidad y precio antes de redondear los importes', () => {
    const resultado = crearXmlFacturaSri({
      ...datosBase,
      items: [{ codigo: 'A', descripcion: 'Producto fraccionado', cantidad: '1.2345678', precioUnitario: '1.1234567' }]
    });
    const detalle = parser.parse(resultado.xml).factura.detalles.detalle;

    expect(detalle.cantidad).toBe('1.234568');
    expect(detalle.precioUnitario).toBe('1.123457');
    expect(detalle.precioTotalSinImpuesto).toBe('1.39');
    expect(detalle.impuestos.impuesto.valor).toBe('0.21');
    expect(resultado.totales.total).toBe('1.60');
  });

  it('ajusta centavos de IVA por redondeo para coincidir con el total guardado de la venta', () => {
    const resultado = crearXmlFacturaSri({
      ...datosBase,
      items: [
        { codigo: 'A', descripcion: 'Primero', cantidad: 1, precioUnitario: 0.05 },
        { codigo: 'B', descripcion: 'Segundo', cantidad: 1, precioUnitario: 0.05 },
        { codigo: 'C', descripcion: 'Tercero', cantidad: 1, precioUnitario: 0.05 }
      ],
      ivaTotalEsperado: '0.02'
    });

    expect(resultado.totales).toMatchObject({ subtotal: '0.15', iva: '0.02', total: '0.17' });
  });

  it('acepta los códigos oficiales de formas de pago y rechaza códigos no listados', () => {
    expect(() => crearXmlFacturaSri({ ...datosBase, formaPago: '21' })).not.toThrow();
    expect(() => crearXmlFacturaSri({ ...datosBase, formaPago: '02' })).toThrow(/forma de pago/);
  });

  it('usa identificación y nombre oficiales para consumidor final', () => {
    const resultado = crearXmlFacturaSri({
      ...datosBase,
      cliente: {
        ...datosBase.cliente,
        identificacion: '9999999999999',
        nombre: 'Cliente genérico'
      }
    });
    const comprador = parser.parse(resultado.xml).factura.infoFactura;

    expect(comprador.tipoIdentificacionComprador).toBe('07');
    expect(comprador.identificacionComprador).toBe('9999999999999');
    expect(comprador.razonSocialComprador).toBe('CONSUMIDOR FINAL');
  });
});
