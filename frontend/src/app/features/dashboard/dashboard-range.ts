import { ChartData } from 'chart.js';
import { SeriePrediccion } from '../../core/models/api.models';

export type PeriodoDashboard = '7d' | '30d' | '6m';
export type AgrupacionHistorica = 'semana' | 'mes';

export interface RangoDashboard {
  desde: string;
  hasta: string;
}

export function calcularRangoDashboard(
  periodo: PeriodoDashboard,
  fechaActual = new Date()
): RangoDashboard {
  const hasta = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
  const desde = new Date(hasta);

  if (periodo === '7d') {
    desde.setDate(desde.getDate() - 6);
  } else if (periodo === '30d') {
    desde.setDate(desde.getDate() - 29);
  } else {
    const diaDelMes = desde.getDate();
    desde.setDate(1);
    desde.setMonth(desde.getMonth() - 6);
    const ultimoDiaDelMes = new Date(desde.getFullYear(), desde.getMonth() + 1, 0).getDate();
    desde.setDate(Math.min(diaDelMes, ultimoDiaDelMes));
  }

  return {
    desde: formatoFechaLocal(desde),
    hasta: formatoFechaLocal(hasta)
  };
}

export function crearDatosGrafico(
  registros: SeriePrediccion[],
  agrupar: AgrupacionHistorica
): ChartData<'bar'> {
  return {
    labels: registros.map(({ periodo }) => {
      const [anio, mes, dia] = periodo.split('-');
      return agrupar === 'mes' ? `${mes}/${anio}` : `${dia}/${mes}`;
    }),
    datasets: [
      {
        label: 'Ventas históricas',
        data: registros.map(({ ventas_reales }) => ventas_reales),
        backgroundColor: '#1a56db',
        borderRadius: 6
      },
      {
        label: 'Proyección de demanda (IA)',
        data: registros.map(({ proyeccion }) => proyeccion),
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
        borderRadius: 6
      }
    ]
  };
}

function formatoFechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
