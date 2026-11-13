import { describe, expect, it } from 'vitest';
import { calcularRangoDashboard, crearDatosGrafico } from './dashboard-range';

describe('rango del panel', () => {
  const fechaActual = new Date(2026, 10, 10);

  it('usa los últimos seis meses por defecto y limita días que no existen', () => {
    expect(calcularRangoDashboard('6m', fechaActual)).toEqual({
      desde: '2026-05-10',
      hasta: '2026-11-10'
    });
    expect(calcularRangoDashboard('6m', new Date(2026, 7, 31)).desde).toBe('2026-02-28');
  });

  it('calcula períodos inclusivos de siete y treinta días', () => {
    expect(calcularRangoDashboard('7d', fechaActual)).toEqual({
      desde: '2026-11-04',
      hasta: '2026-11-10'
    });
    expect(calcularRangoDashboard('30d', fechaActual)).toEqual({
      desde: '2026-10-12',
      hasta: '2026-11-10'
    });
  });
});

describe('gráfico de ventas históricas', () => {
  it('convierte períodos mensuales y demanda proyectada en conjuntos del gráfico', () => {
    const resultado = crearDatosGrafico([
      { periodo: '2026-06-01', ventas_reales: 3, proyeccion: null },
      { periodo: '2026-07-01', ventas_reales: 2, proyeccion: 8.5 }
    ], 'mes');

    expect(resultado.labels).toEqual(['06/2026', '07/2026']);
    expect(resultado.datasets[0].data).toEqual([3, 2]);
    expect(resultado.datasets[1].data).toEqual([null, 8.5]);
  });
});
