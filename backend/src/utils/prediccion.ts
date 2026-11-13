import { ConfiguracionIA, NivelAlerta, NivelConfianza } from '../types/prediccion';

export interface ProductoParaCalculo {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
  cantidad: number;
  limite_minimo: number;
}

export interface ResultadoCalculoPrediccion {
  demanda_diaria: number;
  demanda_7_dias: number;
  demanda_15_dias: number;
  demanda_30_dias: number;
  dias_restantes_stock: number | null;
  nivel_alerta: NivelAlerta;
  sugerencia_reposicion: number;
  confianza: NivelConfianza;
  dias_con_ventas: number;
  ventana_dias: number;
}

export function calcularPrediccion(
  producto: ProductoParaCalculo,
  ventasPorDia: Map<string, number>,
  configuracion: ConfiguracionIA,
  fechaFinal: Date
): ResultadoCalculoPrediccion {
  let sumaPonderada = 0;
  let sumaPesos = 0;
  let diasConVentas = 0;

  // Se recorren también los días en cero: así el promedio representa el consumo diario real.
  for (let antiguedad = 0; antiguedad < configuracion.ventana_dias; antiguedad += 1) {
    const fecha = new Date(Date.UTC(
      fechaFinal.getUTCFullYear(),
      fechaFinal.getUTCMonth(),
      fechaFinal.getUTCDate() - antiguedad
    )).toISOString().slice(0, 10);
    const cantidadVendida = ventasPorDia.get(fecha) ?? 0;
    const peso = antiguedad < configuracion.dias_recientes
      ? configuracion.peso_reciente
      : antiguedad < configuracion.dias_intermedios
        ? configuracion.peso_intermedio
        : configuracion.peso_antiguo;
    sumaPonderada += cantidadVendida * peso;
    sumaPesos += peso;
    if (cantidadVendida > 0) diasConVentas += 1;
  }

  const demandaDiaria = sumaPesos > 0 ? sumaPonderada / sumaPesos : 0;
  const stock = Math.max(0, producto.cantidad);
  const diasRestantes = demandaDiaria > 0 ? stock / demandaDiaria : null;
  let nivel: NivelAlerta = 'normal';
  if (diasRestantes !== null && diasRestantes < configuracion.umbral_critico) {
    nivel = 'critico';
  } else if (diasRestantes !== null && diasRestantes < configuracion.umbral_advertencia) {
    nivel = 'advertencia';
  }

  const confianza: NivelConfianza = diasConVentas >= 21
    ? 'alta'
    : diasConVentas >= 8
      ? 'media'
      : 'baja';

  return {
    demanda_diaria: redondear(demandaDiaria),
    demanda_7_dias: redondear(demandaDiaria * 7),
    demanda_15_dias: redondear(demandaDiaria * 15),
    demanda_30_dias: redondear(demandaDiaria * 30),
    dias_restantes_stock: diasRestantes === null ? null : redondear(diasRestantes),
    nivel_alerta: nivel,
    sugerencia_reposicion: Math.ceil(Math.max(
      0,
      demandaDiaria * 30 - stock + producto.limite_minimo
    )),
    confianza,
    dias_con_ventas: diasConVentas,
    ventana_dias: configuracion.ventana_dias
  };
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
