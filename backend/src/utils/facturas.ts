import { randomInt } from 'crypto';
import { roundMoney } from './money';

export function crearNumeroFactura(id: string | number): string {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw new RangeError('El consecutivo de factura debe ser un entero positivo.');
  }
  const secuencial = Number(id);
  if (!Number.isSafeInteger(secuencial) || secuencial < 1 || secuencial > 999_999_999) {
    throw new RangeError('El consecutivo de factura debe estar entre 1 y 999999999.');
  }
  return `001-001-${String(secuencial).padStart(9, '0')}`;
}

export function calcularTotalesFactura(subtotal: number, iva: number): {
  subtotal: number;
  iva: number;
  total: number;
} {
  const subtotalRedondeado = roundMoney(subtotal);
  const ivaRedondeado = roundMoney(iva);
  return {
    subtotal: subtotalRedondeado,
    iva: ivaRedondeado,
    total: roundMoney(subtotalRedondeado + ivaRedondeado)
  };
}

export function crearClaveAccesoSimulada(
  numero: string,
  rucEmisor: string,
  fechaEmision: Date,
  aleatorio = randomInt(0, 100_000_000)
): string {
  // Mantiene 49 dígitos para pruebas; no calcula ni representa una firma válida del SRI.
  const fecha = [
    String(fechaEmision.getDate()).padStart(2, '0'),
    String(fechaEmision.getMonth() + 1).padStart(2, '0'),
    String(fechaEmision.getFullYear())
  ].join('');
  const ruc = rucEmisor.replace(/\D/g, '').padStart(13, '0').slice(-13);
  const secuencial = numero.slice(-9);
  const codigoNumerico = String(aleatorio).padStart(8, '0');
  const base = `${fecha}01${ruc}1001001${secuencial}${codigoNumerico}1`;
  const suma = [...base].reverse().reduce((total, digito, indice) => {
    return total + Number(digito) * (indice % 6 + 2);
  }, 0);
  const digitoVerificador = (11 - (suma % 11)) % 11;
  return `${base}${digitoVerificador === 10 ? 1 : digitoVerificador}`;
}
