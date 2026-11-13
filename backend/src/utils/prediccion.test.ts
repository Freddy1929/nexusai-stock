import { describe, expect, it } from 'vitest';
import { ConfiguracionIA } from '../types/prediccion';
import { calcularPrediccion } from './prediccion';

const config: ConfiguracionIA = {
  ventana_dias: 30,
  dias_recientes: 7,
  dias_intermedios: 30,
  peso_reciente: 3,
  peso_intermedio: 2,
  peso_antiguo: 1,
  umbral_critico: 7,
  umbral_advertencia: 15
};
const hoy = new Date('2026-11-11T12:00:00Z');
const producto = { id: '1', nombre: 'Producto', codigo: 'P-1', unidad: 'unidad', cantidad: 30, limite_minimo: 5 };

describe('calcularPrediccion', () => {
  it('devuelve demanda cero y días de stock no aplicables sin consumo', () => {
    const resultado = calcularPrediccion(producto, new Map(), config, hoy);
    expect(resultado.demanda_diaria).toBe(0);
    expect(resultado.dias_restantes_stock).toBeNull();
    expect(resultado.nivel_alerta).toBe('normal');
    expect(resultado.sugerencia_reposicion).toBe(0);
    expect(resultado.confianza).toBe('baja');
  });

  it('calcula un solo día de ventas y confianza baja', () => {
    const resultado = calcularPrediccion(producto, new Map([['2026-11-11', 6]]), config, hoy);
    expect(resultado.demanda_diaria).toBe(0.27);
    expect(resultado.dias_con_ventas).toBe(1);
    expect(resultado.demanda_7_dias).toBe(1.88);
  });

  it('calcula ventas constantes incluyendo los días sin movimiento', () => {
    const ventas = new Map<string, number>();
    for (let antiguedad = 0; antiguedad < 30; antiguedad += 1) {
      const fecha = new Date(hoy);
      fecha.setUTCDate(fecha.getUTCDate() - antiguedad);
      ventas.set(fecha.toISOString().slice(0, 10), 2);
    }
    const resultado = calcularPrediccion(producto, ventas, config, hoy);
    expect(resultado.demanda_diaria).toBe(2);
    expect(resultado.confianza).toBe('alta');
  });

  it('da más peso a las ventas recientes en una serie creciente', () => {
    const ventas = new Map<string, number>();
    for (let antiguedad = 0; antiguedad < 30; antiguedad += 1) {
      const fecha = new Date(Date.UTC(2026, 10, 11 - antiguedad)).toISOString().slice(0, 10);
      ventas.set(fecha, 30 - antiguedad);
    }
    const resultado = calcularPrediccion(producto, ventas, config, hoy);
    expect(resultado.demanda_diaria).toBeGreaterThan(15);
  });

  it('marca stock cero como crítico cuando hay demanda', () => {
    const sinStock = { ...producto, cantidad: 0 };
    const resultado = calcularPrediccion(sinStock, new Map([['2026-11-11', 10]]), config, hoy);
    expect(resultado.dias_restantes_stock).toBe(0);
    expect(resultado.nivel_alerta).toBe('critico');
    expect(resultado.sugerencia_reposicion).toBeGreaterThan(0);
  });

  it('evita dividir entre cero cuando la demanda es nula', () => {
    const resultado = calcularPrediccion({ ...producto, cantidad: 0 }, new Map(), config, hoy);
    expect(Number.isFinite(resultado.demanda_diaria)).toBe(true);
    expect(resultado.dias_restantes_stock).toBeNull();
  });
});
