import { describe, expect, it } from 'vitest';
import { calcularTotalesFactura, crearClaveAccesoSimulada, crearNumeroFactura } from './facturas';

describe('utilidades de facturación', () => {
  it('genera números secuenciales con el formato de establecimiento y punto de emisión', () => {
    expect(crearNumeroFactura(1)).toBe('001-001-000000001');
    expect(crearNumeroFactura(27)).toBe('001-001-000000027');
    expect(() => crearNumeroFactura(1_000_000_000)).toThrow(RangeError);
  });

  it('calcula el total sumando subtotal e IVA ya calculados por la venta', () => {
    expect(calcularTotalesFactura(10.105, 1.505)).toEqual({
      subtotal: 10.11,
      iva: 1.51,
      total: 11.62
    });
  });

  it('crea una clave simulada de 49 dígitos', () => {
    const clave = crearClaveAccesoSimulada(
      '001-001-000000027',
      '1790012345001',
      new Date('2026-11-11T12:00:00'),
      12345678
    );

    expect(clave).toMatch(/^\d{49}$/);
  });
});
