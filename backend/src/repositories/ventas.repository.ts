import { PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  CrearVentaInput,
  DetalleVenta,
  RangoFechas,
  Venta,
  VentaDetallada
} from '../types/operaciones';
import { withTransaction } from '../utils/transaction';
import { roundMoney } from '../utils/money';
import { HttpError } from '../utils/http-error';

interface ProductoBloqueado {
  id: string;
  nombre: string;
  codigo: string;
  cantidad: string;
  precio_venta: string;
}

function formatMoney(value: number): string {
  return roundMoney(value).toFixed(2);
}

async function obtenerVentaDetallada(client: PoolClient, id: string): Promise<VentaDetallada> {
  const ventaResult = await client.query<Venta>(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre,
            c.identificacion AS identificacion_cliente, v.fecha, v.subtotal,
            v.iva, v.total, v.estado, v.forma_pago,
            (SELECT json_build_object(
              'id', f.id, 'numero', f.numero, 'estado', f.estado,
              'email_enviado', f.email_enviado,
              'email_error', to_jsonb(f)->>'email_error',
              'clave_acceso', f.clave_acceso, 'estado_sri', f.estado_sri,
              'mensaje_sri', f.mensaje_sri
            ) FROM facturas f WHERE f.venta_id = v.id) AS factura
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.id = $1`,
    [id]
  );
  const venta = ventaResult.rows[0];
  if (!venta) {
    throw new HttpError(500, 'No se pudo recuperar la venta recién creada.');
  }
  const items = await client.query<DetalleVenta>(
    `SELECT dv.id, dv.producto_id, p.nombre AS producto_nombre, p.codigo,
            dv.cantidad, dv.precio_unitario, dv.subtotal
     FROM detalle_venta dv
     INNER JOIN productos p ON p.id = dv.producto_id
     WHERE dv.venta_id = $1
     ORDER BY dv.id ASC`,
    [id]
  );
  return { ...venta, items: items.rows };
}

export async function crear(
  input: CrearVentaInput,
  ivaPorcentaje: number
): Promise<VentaDetallada> {
  return withTransaction(async (client) => {
    const cliente = await client.query('SELECT id FROM clientes WHERE id = $1', [input.cliente_id]);
    if (cliente.rowCount !== 1) {
      throw new HttpError(404, 'Cliente no encontrado.');
    }

    const idsOrdenados = input.items.map((item) => item.producto_id).sort((a, b) => a - b);
    const productosResult = await client.query<ProductoBloqueado>(
      `SELECT id, nombre, codigo, cantidad, precio_venta
       FROM productos
       WHERE id = ANY($1::bigint[])
       ORDER BY id
       FOR UPDATE`,
      [idsOrdenados]
    );
    const productos = new Map(productosResult.rows.map((producto) => [Number(producto.id), producto]));

    for (const item of input.items) {
      const producto = productos.get(item.producto_id);
      if (!producto) {
        throw new HttpError(404, `No existe el producto con id ${item.producto_id}.`);
      }
      const stockActual = Number(producto.cantidad);
      if (stockActual < item.cantidad) {
        throw new HttpError(
          400,
          `Stock insuficiente para ${producto.nombre} (${producto.codigo}). Disponible: ${stockActual}; solicitado: ${item.cantidad}.`,
          [{ campo: 'items', mensaje: `El producto ${producto.codigo} tiene ${stockActual} unidades disponibles.` }]
        );
      }
    }

    const detalle = input.items.map((item) => {
      const producto = productos.get(item.producto_id)!;
      const unitario = roundMoney(Number(producto.precio_venta));
      return {
        item,
        producto,
        precioUnitario: unitario,
        subtotal: roundMoney(unitario * item.cantidad)
      };
    });
    const subtotal = roundMoney(detalle.reduce((total, item) => total + item.subtotal, 0));
    const iva = roundMoney(subtotal * ivaPorcentaje / 100);
    const total = roundMoney(subtotal + iva);

    const ventaResult = await client.query<{ id: string }>(
      `INSERT INTO ventas (cliente_id, subtotal, iva, total, estado, forma_pago)
       VALUES ($1, $2, $3, $4, 'pagada', $5)
       RETURNING id`,
      [input.cliente_id, formatMoney(subtotal), formatMoney(iva), formatMoney(total), input.forma_pago]
    );
    const ventaId = ventaResult.rows[0].id;

    for (const line of detalle) {
      await client.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ventaId,
          line.item.producto_id,
          line.item.cantidad,
          formatMoney(line.precioUnitario),
          formatMoney(line.subtotal)
        ]
      );
      const stockNuevo = roundMoney(Number(line.producto.cantidad) - line.item.cantidad);
      await client.query(
        `UPDATE productos
         SET cantidad = $2,
             estado = CASE WHEN $2::numeric = 0 THEN 'inactivo' ELSE estado END
         WHERE id = $1`,
        [line.item.producto_id, formatMoney(stockNuevo)]
      );
    }

    return obtenerVentaDetallada(client, ventaId);
  });
}

export async function listar(
  desde: string | undefined,
  hasta: string | undefined,
  clienteId: string | undefined,
  page: number,
  limit: number
): Promise<{ ventas: Venta[]; total: number }> {
  const values = [desde ?? null, hasta ?? null, clienteId ?? null];
  const where = `WHERE ($1::date IS NULL OR v.fecha >= $1::date)
                   AND ($2::date IS NULL OR v.fecha < $2::date + INTERVAL '1 day')
                   AND ($3::bigint IS NULL OR v.cliente_id = $3)`;
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM ventas v ${where}`,
    values
  );
  const result = await pool.query<Venta>(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre,
            c.identificacion AS identificacion_cliente, v.fecha, v.subtotal,
            v.iva, v.total, v.estado, v.forma_pago,
            (SELECT json_build_object(
              'id', f.id, 'numero', f.numero, 'estado', f.estado,
              'email_enviado', f.email_enviado,
              'email_error', to_jsonb(f)->>'email_error',
              'clave_acceso', f.clave_acceso, 'estado_sri', f.estado_sri,
              'mensaje_sri', f.mensaje_sri
            ) FROM facturas f WHERE f.venta_id = v.id) AS factura
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     ${where}
     ORDER BY v.fecha DESC, v.id DESC
     LIMIT $4 OFFSET $5`,
    [...values, limit, (page - 1) * limit]
  );
  return { ventas: result.rows, total: Number(count.rows[0]?.total ?? 0) };
}

export async function buscarPorId(id: string): Promise<VentaDetallada | null> {
  const ventaResult = await pool.query<Venta>(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre,
            c.identificacion AS identificacion_cliente, v.fecha, v.subtotal,
            v.iva, v.total, v.estado, v.forma_pago,
            (SELECT json_build_object(
              'id', f.id, 'numero', f.numero, 'estado', f.estado,
              'email_enviado', f.email_enviado,
              'email_error', to_jsonb(f)->>'email_error',
              'clave_acceso', f.clave_acceso, 'estado_sri', f.estado_sri,
              'mensaje_sri', f.mensaje_sri
            ) FROM facturas f WHERE f.venta_id = v.id) AS factura
     FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.id = $1`,
    [id]
  );
  const venta = ventaResult.rows[0];
  if (!venta) {
    return null;
  }
  const itemsResult = await pool.query<DetalleVenta>(
    `SELECT dv.id, dv.producto_id, p.nombre AS producto_nombre, p.codigo,
            dv.cantidad, dv.precio_unitario, dv.subtotal
     FROM detalle_venta dv
     INNER JOIN productos p ON p.id = dv.producto_id
     WHERE dv.venta_id = $1
     ORDER BY dv.id ASC`,
    [id]
  );
  return { ...venta, items: itemsResult.rows };
}

export async function anular(id: string): Promise<VentaDetallada> {
  return withTransaction(async (client) => {
    const ventaResult = await client.query<{ id: string; estado: string }>(
      'SELECT id, estado FROM ventas WHERE id = $1 FOR UPDATE',
      [id]
    );
    const venta = ventaResult.rows[0];
    if (!venta) {
      throw new HttpError(404, 'Venta no encontrada.');
    }
    if (venta.estado !== 'pagada') {
      throw new HttpError(409, 'Solo se pueden anular ventas pagadas.');
    }

    const detalles = await client.query<{ producto_id: string; cantidad: string }>(
      `SELECT producto_id, cantidad
       FROM detalle_venta
       WHERE venta_id = $1
       ORDER BY producto_id
       FOR UPDATE`,
      [id]
    );
    for (const detalle of detalles.rows) {
      const productoResult = await client.query<{ cantidad: string }>(
        'SELECT cantidad FROM productos WHERE id = $1 FOR UPDATE',
        [detalle.producto_id]
      );
      if (!productoResult.rows[0]) {
        throw new HttpError(409, 'No se pudo devolver el stock de un producto eliminado.');
      }
      const stockRestaurado = roundMoney(
        Number(productoResult.rows[0].cantidad) + Number(detalle.cantidad)
      );
      await client.query(
        `UPDATE productos SET cantidad = $2, estado = 'activo' WHERE id = $1`,
        [detalle.producto_id, formatMoney(stockRestaurado)]
      );
    }
    await client.query("UPDATE ventas SET estado = 'anulada' WHERE id = $1", [id]);
    await client.query("UPDATE facturas SET estado = 'anulada' WHERE venta_id = $1", [id]);
    return obtenerVentaDetallada(client, id);
  });
}
