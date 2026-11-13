import { describe, expect, it } from 'vitest';
import { crearVentaSchema } from './operaciones-schemas';

describe('crearVentaSchema', () => {
  it('usa la forma de pago 01 si una integración anterior no la envía', () => {
    const resultado = crearVentaSchema.safeParse({
      cliente_id: 1,
      items: [{ producto_id: 2, cantidad: 1 }]
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.forma_pago).toBe('01');
  });

  it('rechaza formas de pago que no están en la tabla aceptada del SRI', () => {
    const resultado = crearVentaSchema.safeParse({
      cliente_id: 1,
      forma_pago: '02',
      items: [{ producto_id: 2, cantidad: 1 }]
    });

    expect(resultado.success).toBe(false);
  });
});
