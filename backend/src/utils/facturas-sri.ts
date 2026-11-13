import { randomInt } from 'crypto';
import { XMLBuilder } from 'fast-xml-parser';
import { TipoIdentificacion } from '../types/operaciones';
import { validarIdentificacion } from './identificacion-ecuatoriana';
import { moneyString, roundMoney } from './money';

export type AmbienteSri = '1' | '2';
const CODIGO_FACTURA = '01';
const TIPO_EMISION_NORMAL = '1';
const VERSION_XML_FACTURA = '2.1.0';
const CODIGO_IVA = '2';
const FORMAS_PAGO_VALIDAS = ['01', '15', '16', '17', '18', '19', '20', '21'];
const CODIGOS_POR_TARIFA_IVA = new Map<number, string>([
  [0, '0'],
  [5, '5'],
  [12, '2'],
  [13, '10'],
  [14, '3'],
  [15, '4']
]);

const constructorXml = new XMLBuilder({
  attributeNamePrefix: '@_',
  ignoreAttributes: false,
  format: true,
  processEntities: true
});

export interface DatosClaveAccesoSri {
  fechaEmision: Date;
  rucEmisor: string;
  ambiente: AmbienteSri;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  codigoNumerico?: string | number;
}

export interface ClienteFacturaSri {
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  nombre: string;
  email?: string | null;
  direccion?: string | null;
}

export interface ItemFacturaSri {
  codigo: string;
  descripcion: string;
  cantidad: number | string;
  precioUnitario: number | string;
  descuento?: number | string;
  ivaPorcentaje?: number;
}

export interface DatosFacturaSri extends Omit<DatosClaveAccesoSri, 'codigoNumerico'> {
  razonSocialEmisor: string;
  nombreComercial?: string;
  direccionMatriz: string;
  direccionEstablecimiento?: string;
  cliente: ClienteFacturaSri;
  items: ItemFacturaSri[];
  ivaPorcentaje: number;
  ivaTotalEsperado?: number | string;
  formaPago: string;
  propina?: number | string;
}

export interface ResultadoXmlFacturaSri {
  claveAcceso: string;
  xml: string;
  estado: 'XML generado, pendiente de firma y autorización SRI';
  totales: {
    subtotal: string;
    iva: string;
    descuento: string;
    propina: string;
    total: string;
  };
}

export interface IdentificacionCompradorSri {
  tipoIdentificacionComprador: '04' | '05' | '06' | '07';
  identificacionComprador: string;
  razonSocialComprador: string;
}

function fechaUtc(fecha: Date): { clave: string; xml: string } {
  if (!Number.isFinite(fecha.getTime())) {
    throw new RangeError('La fecha de emisión no es válida.');
  }
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getUTCFullYear());
  if (!/^\d{4}$/.test(anio) || Number(anio) < 2000) {
    throw new RangeError('El año de emisión debe estar entre 2000 y 9999.');
  }
  return { clave: `${dia}${mes}${anio}`, xml: `${dia}/${mes}/${anio}` };
}

function validarRucEmisor(ruc: string): void {
  if (!/^\d{13}$/.test(ruc) || !ruc.endsWith('001')) {
    throw new RangeError('El RUC del emisor debe tener 13 dígitos y terminar en 001.');
  }
}

function rellenarDigitos(valor: string, longitud: number, etiqueta: string): string {
  if (!/^\d+$/.test(valor) || valor.length > longitud) {
    throw new RangeError(`${etiqueta} debe contener hasta ${longitud} dígitos.`);
  }
  return valor.padStart(longitud, '0');
}

function normalizarCodigoNumerico(valor: string | number | undefined): string {
  if (valor === undefined) return String(randomInt(0, 100_000_000)).padStart(8, '0');
  const texto = String(valor);
  if (!/^\d{1,8}$/.test(texto)) {
    throw new RangeError('El código numérico debe tener entre 1 y 8 dígitos.');
  }
  return texto.padStart(8, '0');
}

export function calcularDigitoVerificadorModulo11(cadena: string): string {
  if (!/^\d+$/.test(cadena)) {
    throw new RangeError('La cadena para el módulo 11 debe contener solo dígitos.');
  }

  let suma = 0;
  let peso = 2;
  for (let indice = cadena.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cadena[indice]) * peso;
    peso = peso === 7 ? 2 : peso + 1;
  }

  const resultado = 11 - (suma % 11);
  // El módulo 11 usa pesos 2 a 7 de derecha a izquierda; 11 se convierte en 0 y 10 en 1.
  if (resultado === 11) return '0';
  if (resultado === 10) return '1';
  return String(resultado);
}

export function crearClaveAccesoSri(datos: DatosClaveAccesoSri): string {
  validarRucEmisor(datos.rucEmisor);
  if (datos.ambiente !== '1' && datos.ambiente !== '2') {
    throw new RangeError('El ambiente SRI debe ser 1 (pruebas) o 2 (producción).');
  }

  const fecha = fechaUtc(datos.fechaEmision).clave;
  const establecimiento = rellenarDigitos(datos.establecimiento, 3, 'El establecimiento');
  const puntoEmision = rellenarDigitos(datos.puntoEmision, 3, 'El punto de emisión');
  const secuencial = rellenarDigitos(datos.secuencial, 9, 'El secuencial');
  const codigoNumerico = normalizarCodigoNumerico(datos.codigoNumerico);
  const base = [
    fecha,
    CODIGO_FACTURA,
    datos.rucEmisor,
    datos.ambiente,
    establecimiento,
    puntoEmision,
    secuencial,
    codigoNumerico,
    TIPO_EMISION_NORMAL
  ].join('');

  return `${base}${calcularDigitoVerificadorModulo11(base)}`;
}

export function mapearIdentificacionCompradorSri(
  cliente: ClienteFacturaSri
): IdentificacionCompradorSri {
  if (cliente.identificacion === '9999999999999') {
    return {
      tipoIdentificacionComprador: '07',
      identificacionComprador: '9999999999999',
      razonSocialComprador: 'CONSUMIDOR FINAL'
    };
  }
  if (!validarIdentificacion(cliente.tipo_identificacion, cliente.identificacion)) {
    throw new RangeError('La identificación del comprador no es válida para el tipo indicado.');
  }

  const tipos: Record<TipoIdentificacion, IdentificacionCompradorSri['tipoIdentificacionComprador']> = {
    cedula: '05',
    ruc: '04',
    pasaporte: '06'
  };
  return {
    tipoIdentificacionComprador: tipos[cliente.tipo_identificacion],
    identificacionComprador: cliente.identificacion,
    razonSocialComprador: cliente.nombre
  };
}

function numeroFinito(valor: number | string, etiqueta: string): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    throw new RangeError(`${etiqueta} debe ser un número válido.`);
  }
  return numero;
}

function decimalSri(valor: number | string, etiqueta: string): number {
  const numero = numeroFinito(valor, etiqueta);
  if (Math.abs(numero) >= 1_000_000_000_000) {
    throw new RangeError(`${etiqueta} supera los dígitos permitidos por el esquema SRI.`);
  }
  return Number(numero.toFixed(6));
}

function decimalSriString(valor: number): string {
  return valor.toFixed(6).replace(/\.?0+$/, '');
}

function codigoPorcentajeIva(porcentaje: number): string {
  const codigo = CODIGOS_POR_TARIFA_IVA.get(porcentaje);
  if (codigo === undefined) {
    throw new RangeError(`La tarifa de IVA ${porcentaje}% no tiene un código vigente verificado en la ficha SRI.`);
  }
  return codigo;
}

function formatoFechaXml(fecha: Date): string {
  return fechaUtc(fecha).xml;
}

export function crearXmlFacturaSri(datos: DatosFacturaSri): ResultadoXmlFacturaSri {
  validarRucEmisor(datos.rucEmisor);
  if (datos.items.length === 0) {
    throw new RangeError('La factura debe tener al menos un detalle.');
  }
  if (!FORMAS_PAGO_VALIDAS.some((codigo) => codigo === datos.formaPago)) {
    throw new RangeError('La forma de pago no corresponde a un código de la tabla 24 del SRI.');
  }
  if (!datos.razonSocialEmisor.trim() || !datos.direccionMatriz.trim()) {
    throw new RangeError('La razón social y la dirección matriz del emisor son obligatorias.');
  }

  const fecha = fechaUtc(datos.fechaEmision);
  const establecimiento = rellenarDigitos(datos.establecimiento, 3, 'El establecimiento');
  const puntoEmision = rellenarDigitos(datos.puntoEmision, 3, 'El punto de emisión');
  const secuencial = rellenarDigitos(datos.secuencial, 9, 'El secuencial');
  const claveAcceso = crearClaveAccesoSri({ ...datos, codigoNumerico: undefined });
  const comprador = mapearIdentificacionCompradorSri(datos.cliente);
  const lineas = datos.items.map((item) => {
    const cantidad = decimalSri(item.cantidad, 'La cantidad');
    const precioUnitario = decimalSri(item.precioUnitario, 'El precio unitario');
    const descuento = roundMoney(numeroFinito(item.descuento ?? 0, 'El descuento'));
    if (cantidad <= 0 || precioUnitario < 0 || descuento < 0) {
      throw new RangeError('La cantidad debe ser positiva; el precio y el descuento no pueden ser negativos.');
    }

    const bruto = roundMoney(cantidad * precioUnitario);
    if (descuento > bruto) {
      throw new RangeError('El descuento no puede superar el subtotal del detalle.');
    }
    const base = roundMoney(bruto - descuento);
    const tarifa = item.ivaPorcentaje ?? datos.ivaPorcentaje;
    const codigoPorcentaje = codigoPorcentajeIva(tarifa);
    const impuesto = roundMoney(base * tarifa / 100);
    return { item, cantidad, precioUnitario, descuento, base, tarifa, codigoPorcentaje, impuesto };
  });

  if (datos.ivaTotalEsperado !== undefined) {
    let diferencia = roundMoney(
      numeroFinito(datos.ivaTotalEsperado, 'El IVA esperado')
      - lineas.reduce((suma, linea) => suma + linea.impuesto, 0)
    );
    if (diferencia > 0) {
      const ultimaLineaGravada = [...lineas].reverse().find((linea) => linea.tarifa > 0);
      if (!ultimaLineaGravada) throw new RangeError('El IVA esperado no coincide con los detalles sin impuesto.');
      ultimaLineaGravada.impuesto = roundMoney(ultimaLineaGravada.impuesto + diferencia);
      diferencia = 0;
    } else if (diferencia < 0) {
      for (const linea of [...lineas].reverse()) {
        const reduccion = Math.min(linea.impuesto, Math.abs(diferencia));
        linea.impuesto = roundMoney(linea.impuesto - reduccion);
        diferencia = roundMoney(diferencia + reduccion);
        if (diferencia === 0) break;
      }
    }
    if (diferencia !== 0) {
      throw new RangeError('El IVA esperado no coincide con los impuestos de los detalles.');
    }
  }

  const tasas = new Map<string, { tarifa: number; base: number; valor: number }>();
  for (const linea of lineas) {
    const total = tasas.get(linea.codigoPorcentaje) ?? { tarifa: linea.tarifa, base: 0, valor: 0 };
    total.base = roundMoney(total.base + linea.base);
    total.valor = roundMoney(total.valor + linea.impuesto);
    tasas.set(linea.codigoPorcentaje, total);
  }

  const subtotal = roundMoney(lineas.reduce((suma, linea) => suma + linea.base, 0));
  const iva = roundMoney(lineas.reduce((suma, linea) => suma + linea.impuesto, 0));
  const descuento = roundMoney(lineas.reduce((suma, linea) => suma + linea.descuento, 0));
  const propina = roundMoney(numeroFinito(datos.propina ?? 0, 'La propina'));
  if (propina < 0) throw new RangeError('La propina no puede ser negativa.');
  const total = roundMoney(subtotal + iva + propina);

  const infoTributaria: Record<string, unknown> = {
    ambiente: datos.ambiente,
    tipoEmision: TIPO_EMISION_NORMAL,
    razonSocial: datos.razonSocialEmisor.trim(),
    ...(datos.nombreComercial?.trim() ? { nombreComercial: datos.nombreComercial.trim() } : {}),
    ruc: datos.rucEmisor,
    claveAcceso,
    codDoc: CODIGO_FACTURA,
    estab: establecimiento,
    ptoEmi: puntoEmision,
    secuencial,
    dirMatriz: datos.direccionMatriz.trim()
  };
  const infoFactura: Record<string, unknown> = {
    fechaEmision: fecha.xml,
    ...(datos.direccionEstablecimiento?.trim()
      ? { dirEstablecimiento: datos.direccionEstablecimiento.trim() }
      : {}),
    tipoIdentificacionComprador: comprador.tipoIdentificacionComprador,
    razonSocialComprador: comprador.razonSocialComprador,
    identificacionComprador: comprador.identificacionComprador,
    ...(datos.cliente.direccion?.trim() ? { direccionComprador: datos.cliente.direccion.trim() } : {}),
    totalSinImpuestos: moneyString(subtotal),
    totalDescuento: moneyString(descuento),
    totalConImpuestos: {
      totalImpuesto: [...tasas.entries()]
        .sort(([codigoA], [codigoB]) => Number(codigoA) - Number(codigoB))
        .map(([codigoPorcentaje, totalTasa]) => ({
          codigo: CODIGO_IVA,
          codigoPorcentaje,
          baseImponible: moneyString(totalTasa.base),
          tarifa: moneyString(totalTasa.tarifa),
          valor: moneyString(totalTasa.valor)
        }))
    },
    propina: moneyString(propina),
    importeTotal: moneyString(total),
    moneda: 'DOLAR',
    pagos: { pago: { formaPago: datos.formaPago, total: moneyString(total) } }
  };
  const detalles = {
    detalle: lineas.map((linea) => ({
      codigoPrincipal: linea.item.codigo,
      descripcion: linea.item.descripcion,
      cantidad: decimalSriString(linea.cantidad),
      precioUnitario: decimalSriString(linea.precioUnitario),
      descuento: moneyString(linea.descuento),
      precioTotalSinImpuesto: moneyString(linea.base),
      impuestos: {
        impuesto: {
          codigo: CODIGO_IVA,
          codigoPorcentaje: linea.codigoPorcentaje,
          tarifa: moneyString(linea.tarifa),
          baseImponible: moneyString(linea.base),
          valor: moneyString(linea.impuesto)
        }
      }
    }))
  };
  const camposAdicionales = [
    ...(datos.cliente.email?.trim()
      ? [{ '@_nombre': 'Email', '#text': datos.cliente.email.trim() }]
      : []),
    ...(datos.cliente.direccion?.trim()
      ? [{ '@_nombre': 'Dirección', '#text': datos.cliente.direccion.trim() }]
      : [])
  ];
  const documento = {
    factura: {
      '@_id': 'comprobante',
      '@_version': VERSION_XML_FACTURA,
      infoTributaria,
      infoFactura,
      detalles,
      ...(camposAdicionales.length ? { infoAdicional: { campoAdicional: camposAdicionales } } : {})
    }
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${constructorXml.build(documento)}`;

  return {
    claveAcceso,
    xml,
    estado: 'XML generado, pendiente de firma y autorización SRI',
    totales: {
      subtotal: moneyString(subtotal),
      iva: moneyString(iva),
      descuento: moneyString(descuento),
      propina: moneyString(propina),
      total: moneyString(total)
    }
  };
}
