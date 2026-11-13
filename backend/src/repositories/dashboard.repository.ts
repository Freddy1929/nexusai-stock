import { pool } from '../config/database';
import { RangoFechas } from '../types/operaciones';

export async function resumenVentas(rango: RangoFechas) {
  const result = await pool.query<{
    cantidad_ventas: string;
    ingresos: string;
    costo: string;
    ganancia: string;
  }>(
    `WITH ventas_periodo AS (
       SELECT id, total
       FROM ventas
       WHERE fecha >= $1::date
         AND fecha < $2::date + INTERVAL '1 day'
         AND estado <> 'anulada'
     ),
     costos AS (
       SELECT dv.venta_id, SUM(dv.cantidad * p.precio_compra) AS costo
       FROM detalle_venta dv
       INNER JOIN productos p ON p.id = dv.producto_id
       INNER JOIN ventas_periodo vp ON vp.id = dv.venta_id
       GROUP BY dv.venta_id
     ),
     agregados AS (
       SELECT COUNT(*) AS cantidad_ventas,
              COALESCE(SUM(vp.total), 0) AS ingresos,
              COALESCE(SUM(c.costo), 0) AS costo
       FROM ventas_periodo vp
       LEFT JOIN costos c ON c.venta_id = vp.id
     )
     SELECT cantidad_ventas::text,
            ROUND(ingresos, 2)::text AS ingresos,
            ROUND(costo, 2)::text AS costo,
            ROUND(ingresos - costo, 2)::text AS ganancia
     FROM agregados`,
    [rango.desde, rango.hasta]
  );
  return result.rows[0];
}

export async function resumenCompras(rango: RangoFechas) {
  const result = await pool.query<{
    cantidad_compras: string;
    costo_total: string;
    cancelados: string;
    devoluciones_cantidad: string;
    devoluciones_valor: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE estado = 'recibido')::text AS cantidad_compras,
       COALESCE(SUM(total) FILTER (WHERE estado = 'recibido'), 0)::numeric(14, 2)::text AS costo_total,
       COUNT(*) FILTER (WHERE estado = 'cancelado')::text AS cancelados,
       (SELECT COUNT(*)::text FROM ventas
        WHERE estado = 'anulada'
          AND fecha >= $1::date
          AND fecha < $2::date + INTERVAL '1 day') AS devoluciones_cantidad,
       COALESCE((SELECT SUM(total) FROM ventas
                 WHERE estado = 'anulada'
                   AND fecha >= $1::date
                   AND fecha < $2::date + INTERVAL '1 day'), 0)::numeric(14, 2)::text AS devoluciones_valor
     FROM pedidos
     WHERE fecha >= $1::date
       AND fecha < $2::date + INTERVAL '1 day'`,
    [rango.desde, rango.hasta]
  );
  return result.rows[0];
}

export async function resumenInventario(rango: RangoFechas) {
  const result = await pool.query<{
    stock_actual_total: string;
    productos_por_recibir: string;
  }>(
    `SELECT
       (SELECT COALESCE(SUM(cantidad), 0)::numeric(14, 2)::text FROM productos) AS stock_actual_total,
       (SELECT COALESCE(SUM(dp.cantidad), 0)::numeric(14, 2)::text
        FROM detalle_pedido dp
        INNER JOIN pedidos pe ON pe.id = dp.pedido_id
        WHERE pe.estado = 'pendiente'
          AND pe.fecha >= $1::date
          AND pe.fecha < $2::date + INTERVAL '1 day') AS productos_por_recibir`,
    [rango.desde, rango.hasta]
  );
  return result.rows[0];
}

export async function resumenProductos() {
  const result = await pool.query<{
    proveedores: string;
    categorias: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM proveedores) AS proveedores,
       (SELECT COUNT(*)::text FROM categorias) AS categorias`
  );
  return result.rows[0];
}

export async function ventasHistoricas(rango: RangoFechas, agrupar: 'semana' | 'mes') {
  const trunc = agrupar === 'semana' ? 'week' : 'month';
  const result = await pool.query<{
    periodo: string;
    cantidad_ventas: string;
    ingresos: string;
  }>(
    `SELECT TO_CHAR(DATE_TRUNC($3, fecha), 'YYYY-MM-DD') AS periodo,
            COUNT(*)::text AS cantidad_ventas,
            ROUND(SUM(total), 2)::text AS ingresos
     FROM ventas
     WHERE estado <> 'anulada'
       AND fecha >= $1::date
       AND fecha < $2::date + INTERVAL '1 day'
     GROUP BY DATE_TRUNC($3, fecha)
     ORDER BY DATE_TRUNC($3, fecha) ASC`,
    [rango.desde, rango.hasta, trunc]
  );
  return result.rows;
}
