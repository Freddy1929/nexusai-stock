import { HttpError } from '../utils/http-error';
import { withTransaction } from '../utils/transaction';
import { calcularPrediccion } from '../utils/prediccion';
import {
  ConfiguracionIA,
  NivelAlerta,
  ProductoPrediccion,
  VentaDiariaProducto
} from '../types/prediccion';
import * as prediccionRepository from '../repositories/prediccion.repository';

function fechaHoy(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

function mapaVentasDiarias(ventas: VentaDiariaProducto[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const venta of ventas) {
    mapa.set(venta.producto_id + '|' + venta.fecha,
      (mapa.get(venta.producto_id + '|' + venta.fecha) ?? 0) + venta.cantidad);
  }
  return mapa;
}

export class PrediccionService {
  async obtenerConfiguracion(): Promise<ConfiguracionIA> {
    return prediccionRepository.leerConfiguracion();
  }

  async actualizarConfiguracion(configuracion: ConfiguracionIA): Promise<ConfiguracionIA> {
    return prediccionRepository.guardarConfiguracion(configuracion);
  }

  async listar(opciones: {
    page: number;
    limit: number;
    nivel?: NivelAlerta;
    busqueda?: string;
  }): Promise<{
    predicciones: ProductoPrediccion[];
    resumen: { criticos: number; advertencia: number; normales: number };
    paginacion: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const predicciones = await this.calcularTodas();
    const termino = opciones.busqueda?.toLocaleLowerCase('es') ?? '';
    const filtradas = predicciones.filter((prediccion) =>
      (!opciones.nivel || prediccion.nivel_alerta === opciones.nivel)
      && (!termino || prediccion.nombre.toLocaleLowerCase('es').includes(termino)
        || prediccion.codigo.toLocaleLowerCase('es').includes(termino))
    );
    const inicio = (opciones.page - 1) * opciones.limit;
    return {
      predicciones: filtradas.slice(inicio, inicio + opciones.limit),
      resumen: {
        criticos: predicciones.filter((fila) => fila.nivel_alerta === 'critico').length,
        advertencia: predicciones.filter((fila) => fila.nivel_alerta === 'advertencia').length,
        normales: predicciones.filter((fila) => fila.nivel_alerta === 'normal').length
      },
      paginacion: {
        page: opciones.page,
        limit: opciones.limit,
        total: filtradas.length,
        total_pages: Math.ceil(filtradas.length / opciones.limit)
      }
    };
  }

  async porProducto(id: string): Promise<ProductoPrediccion> {
    const producto = (await this.calcularTodas()).find((fila) => fila.producto_id === id);
    if (!producto) throw new HttpError(404, 'Producto no encontrado o inactivo.');
    return producto;
  }

  async alertas(): Promise<ProductoPrediccion[]> {
    return (await this.calcularTodas())
      .filter((fila) => fila.nivel_alerta !== 'normal')
      .sort((a, b) => (a.dias_restantes_stock ?? Number.POSITIVE_INFINITY)
        - (b.dias_restantes_stock ?? Number.POSITIVE_INFINITY));
  }

  async recalcular(): Promise<{ cantidad: number; fecha_calculo: string }> {
    const predicciones = await this.calcularTodas();
    await withTransaction(async (client) => prediccionRepository.guardarPredicciones(client, predicciones));
    return { cantidad: predicciones.length, fecha_calculo: new Date().toISOString() };
  }

  async serie(agrupar: 'semana' | 'mes'): Promise<{
    agrupar: 'semana' | 'mes';
    serie: Array<{ periodo: string; ventas_reales: number; proyeccion: number | null }>;
  }> {
    const [ventasHistoricas, predicciones] = await Promise.all([
      prediccionRepository.ventasHistoricasPorPeriodo(agrupar),
      this.calcularTodas()
    ]);
    const mapa = new Map<string, { ventas_reales: number; proyeccion: number | null }>();
    for (const venta of ventasHistoricas) {
      mapa.set(venta.periodo, { ventas_reales: Number(venta.cantidad), proyeccion: null });
    }

    const demandaDiaria = predicciones.reduce((total, prediccion) => total + prediccion.demanda_diaria, 0);
    const hoy = fechaHoy();
    for (let dia = 1; dia <= 30; dia += 1) {
      const fecha = new Date(hoy);
      fecha.setUTCDate(fecha.getUTCDate() + dia);
      const periodo = inicioPeriodo(fecha, agrupar);
      const punto = mapa.get(periodo) ?? { ventas_reales: 0, proyeccion: 0 };
      punto.proyeccion = (punto.proyeccion ?? 0) + demandaDiaria;
      mapa.set(periodo, punto);
    }

    // Completa con cero los períodos vacíos para que el gráfico no salte fechas.
    for (let dia = 179; dia >= 0; dia -= 1) {
      const fecha = new Date(hoy);
      fecha.setUTCDate(fecha.getUTCDate() - dia);
      const periodo = inicioPeriodo(fecha, agrupar);
      if (!mapa.has(periodo)) mapa.set(periodo, { ventas_reales: 0, proyeccion: null });
    }

    return {
      agrupar,
      serie: [...mapa.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([periodo, valores]) => ({ periodo, ...valores }))
    };
  }

  private async calcularTodas(): Promise<ProductoPrediccion[]> {
    const [configuracion, productos] = await Promise.all([
      this.obtenerConfiguracion(),
      prediccionRepository.listarProductos()
    ]);
    const ventas = await prediccionRepository.ventasDiarias(configuracion.ventana_dias);
    const ventasPorDia = mapaVentasDiarias(ventas);
    const fecha = fechaHoy();
    const salidas = productos.map((producto) => {
      const historial = new Map<string, number>();
      for (let dia = 0; dia < configuracion.ventana_dias; dia += 1) {
        const fechaVenta = new Date(fecha);
        fechaVenta.setUTCDate(fechaVenta.getUTCDate() - dia);
        const clave = fechaVenta.toISOString().slice(0, 10);
        historial.set(clave, ventasPorDia.get(`${producto.id}|${clave}`) ?? 0);
      }
      const calculo = calcularPrediccion({
        ...producto,
        cantidad: Number(producto.cantidad),
        limite_minimo: Number(producto.limite_minimo)
      }, historial, configuracion, fecha);
      return {
        producto_id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        unidad: producto.unidad,
        stock_actual: Number(producto.cantidad),
        limite_minimo: Number(producto.limite_minimo),
        ...calculo
      };
    });
    return salidas;
  }
}

function inicioPeriodo(fecha: Date, agrupar: 'semana' | 'mes'): string {
  const inicio = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  if (agrupar === 'mes') {
    inicio.setUTCDate(1);
  } else {
    inicio.setUTCDate(inicio.getUTCDate() - ((inicio.getUTCDay() + 6) % 7));
  }
  return inicio.toISOString().slice(0, 10);
}

export const prediccionService = new PrediccionService();
