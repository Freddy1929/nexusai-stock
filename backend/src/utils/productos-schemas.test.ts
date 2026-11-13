import { describe, expect, it } from 'vitest';
import { productoActualizacionSchema, productoSchema } from './schemas';

const datosProducto = {
  nombre: 'Arroz',
  codigo: 'ARR-001',
  categoria_id: 1,
  proveedor_id: 1,
  precio_compra: 1,
  precio_venta: 1.25,
  cantidad: 5,
  cantidad_original: 4,
  unidad: 'unidad',
  limite_minimo: 1,
  fecha_caducidad: null,
  estado_registro: 'activo'
};

describe('productoActualizacionSchema', () => {
  it('requiere la cantidad original para evitar sobrescribir cambios concurrentes de stock', () => {
    expect(productoActualizacionSchema.safeParse(datosProducto).success).toBe(true);
    const { cantidad_original: _cantidadOriginal, ...sinCantidadOriginal } = datosProducto;
    expect(productoActualizacionSchema.safeParse(sinCantidadOriginal).success).toBe(false);
  });

  it('no permite cantidad_original al crear productos', () => {
    expect(productoSchema.safeParse(datosProducto).success).toBe(false);
  });
});
