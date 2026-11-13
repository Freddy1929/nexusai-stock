import { PoolClient } from 'pg';
import { ConfiguracionIA, ProductoPrediccion, VentaDiariaProducto } from '../types/prediccion';
import { pool } from '../config/database';

export const configuracionPredeterminada: ConfiguracionIA = {
  ventana_dias: 90,
  dias_recientes: 7,
  dias_intermedios: 30,
  peso_reciente: 3,
  peso_intermedio: 2,
  peso_antiguo: 1,
  umbral_critico: 7,
  umbral_advertencia: 15
};

interface ProductoRow {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
  cantidad: string;
  limite_minimo: string;
}

export async function leerConfiguracion(): Promise<ConfiguracionIA> {
  const result = await pool.query<ConfiguracionIA>(
    `SELECT ventana_dias, dias_recientes, dias_intermedios,
            peso_reciente, peso_intermedio, peso_antiguo,
            umbral_critico, umbral_advertencia
     FROM configuracion_ia WHERE id = 1`
  );
  return result.rows[0] ?? configuracionPredeterminada;
}

export async function guardarConfiguracion(configuracion: ConfiguracionIA): Promise<ConfiguracionIA> {
  const result = await pool.query<ConfiguracionIA>(
    `INSERT INTO configuracion_ia (
       id, ventana_dias, dias_recientes, dias_intermedios,
       peso_reciente, peso_intermedio, peso_antiguo,
       umbral_critico, umbral_advertencia
     ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       ventana_dias = EXCLUDED.ventana_dias,
       dias_recientes = EXCLUDED.dias_recientes,
       dias_intermedios = EXCLUDED.dias_intermedios,
       peso_reciente = EXCLUDED.peso_reciente,
       peso_intermedio = EXCLUDED.peso_intermedio,
       peso_antiguo = EXCLUDED.peso_antiguo,
       umbral_critico = EXCLUDED.umbral_critico,
       umbral_advertencia = EXCLUDED.umbral_advertencia,
       actualizado_en = NOW()
     RETURNING ventana_dias, dias_recientes, dias_intermedios,
               peso_reciente, peso_intermedio, peso_antiguo,
               umbral_critico, umbral_advertencia`,
    [
      configuracion.ventana_dias,
      configuracion.dias_recientes,
      configuracion.dias_intermedios,
      configuracion.peso_reciente,
      configuracion.peso_intermedio,
      configuracion.peso_antiguo,
      configuracion.umbral_critico,
      configuracion.umbral_advertencia
    ]
  );
  return result.rows[0];
}

export async function listarProductos(): Promise<ProductoRow[]> {
  const result = await pool.query<ProductoRow>(
    `SELECT id, nombre, codigo, unidad, cantidad::text, limite_minimo::text
     FROM productos
     WHERE estado = 'activo'
     ORDER BY nombre ASC, id ASC`
  );
  return result.rows;
}

export async function ventasDiarias(ventanaDias: number): Promise<VentaDiariaProducto[]> {
  const result = await pool.query<VentaDiariaProducto>(
    `SELECT dv.producto_id::text,
            TO_CHAR(v.fecha::date, 'YYYY-MM-DD') AS fecha,
            SUM(dv.cantidad)::text AS cantidad
     FROM detalle_venta dv
     INNER JOIN ventas v ON v.id = dv.venta_id
     WHERE v.estado <> 'anulada'
       AND v.fecha >= CURRENT_DATE - ($1::int - 1)
       AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
     GROUP BY dv.producto_id, v.fecha::date`,
    [ventanaDias]
  );
  return result.rows.map((row) => ({ ...row, cantidad: Number(row.cantidad) }));
}

export async function guardarPredicciones(
  client: PoolClient,
  predicciones: ProductoPrediccion[]
): Promise<void> {
  for (const prediccion of predicciones) {
    await client.query(
      `INSERT INTO predicciones (
         producto_id, fecha_calculo, demanda_estimada, dias_restantes_stock,
         nivel_alerta, demanda_7_dias, demanda_15_dias, demanda_30_dias,
         stock_actual, sugerencia_reposicion, confianza, dias_con_ventas, ventana_dias
       ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (producto_id) DO UPDATE SET
         fecha_calculo = EXCLUDED.fecha_calculo,
         demanda_estimada = EXCLUDED.demanda_estimada,
         dias_restantes_stock = EXCLUDED.dias_restantes_stock,
         nivel_alerta = EXCLUDED.nivel_alerta,
         demanda_7_dias = EXCLUDED.demanda_7_dias,
         demanda_15_dias = EXCLUDED.demanda_15_dias,
         demanda_30_dias = EXCLUDED.demanda_30_dias,
         stock_actual = EXCLUDED.stock_actual,
         sugerencia_reposicion = EXCLUDED.sugerencia_reposicion,
         confianza = EXCLUDED.confianza,
         dias_con_ventas = EXCLUDED.dias_con_ventas,
         ventana_dias = EXCLUDED.ventana_dias`,
      [
        prediccion.producto_id,
        prediccion.demanda_diaria,
        prediccion.dias_restantes_stock,
        prediccion.nivel_alerta,
        prediccion.demanda_7_dias,
        prediccion.demanda_15_dias,
        prediccion.demanda_30_dias,
        prediccion.stock_actual,
        prediccion.sugerencia_reposicion,
        prediccion.confianza,
        prediccion.dias_con_ventas,
        prediccion.ventana_dias
      ]
    );
  }
}

export async function ventasHistoricasPorPeriodo(agrupar: 'semana' | 'mes'): Promise<Array<{ periodo: string; cantidad: string }>> {
  const periodoSql = agrupar === 'semana' ? 'week' : 'month';
  const result = await pool.query<{ periodo: string; cantidad: string }>(
    `SELECT TO_CHAR(DATE_TRUNC($1, v.fecha), 'YYYY-MM-DD') AS periodo,
            COALESCE(SUM(dv.cantidad), 0)::text AS cantidad
     FROM ventas v
     INNER JOIN detalle_venta dv ON dv.venta_id = v.id
     WHERE v.estado <> 'anulada'
       AND v.fecha >= CURRENT_DATE - INTERVAL '179 days'
       AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
     GROUP BY DATE_TRUNC($1, v.fecha)
     ORDER BY DATE_TRUNC($1, v.fecha)`,
    [periodoSql]
  );
  return result.rows;
}
