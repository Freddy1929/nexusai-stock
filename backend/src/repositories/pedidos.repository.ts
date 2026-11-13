import { PoolClient } from 'pg';
import { pool } from '../config/database';
import { CrearPedidoInput, DetallePedido, Pedido, PedidoDetallado } from '../types/operaciones';
import { HttpError } from '../utils/http-error';
import { moneyString, roundMoney } from '../utils/money';
import { withTransaction } from '../utils/transaction';

async function obtenerDetallado(client: PoolClient, id: string): Promise<PedidoDetallado> {
  const pedidoResult = await client.query<Pedido>(
    `SELECT pe.id, pe.proveedor_id, pr.nombre AS proveedor_nombre,
            pe.fecha, pe.estado, pe.total
     FROM pedidos pe
     INNER JOIN proveedores pr ON pr.id = pe.proveedor_id
     WHERE pe.id = $1`,
    [id]
  );
  const pedido = pedidoResult.rows[0];
  if (!pedido) {
    throw new HttpError(500, 'No se pudo recuperar el pedido recién creado.');
  }
  const detalles = await client.query<DetallePedido>(
    `SELECT dp.id, dp.producto_id, p.nombre AS producto_nombre, p.codigo,
            dp.cantidad, dp.costo_unitario
     FROM detalle_pedido dp
     INNER JOIN productos p ON p.id = dp.producto_id
     WHERE dp.pedido_id = $1
     ORDER BY dp.id ASC`,
    [id]
  );
  return { ...pedido, items: detalles.rows };
}

async function validarProveedor(client: PoolClient, proveedorId: number): Promise<void> {
  const result = await client.query('SELECT id FROM proveedores WHERE id = $1', [proveedorId]);
  if (result.rowCount !== 1) {
    throw new HttpError(404, 'Proveedor no encontrado.');
  }
}

async function validarProductos(client: PoolClient, items: CrearPedidoInput['items']): Promise<void> {
  const ids = [...new Set(items.map((item) => item.producto_id))].sort((a, b) => a - b);
  const result = await client.query<{ id: string }>(
    'SELECT id FROM productos WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE',
    [ids]
  );
  const existentes = new Set(result.rows.map((row) => Number(row.id)));
  const inexistente = items.find((item) => !existentes.has(item.producto_id));
  if (inexistente) {
    throw new HttpError(404, `No existe el producto con id ${inexistente.producto_id}.`);
  }
}

function calcularTotal(items: CrearPedidoInput['items']): string {
  const total = items.reduce(
    (suma, item) => suma + roundMoney(item.cantidad * roundMoney(item.costo_unitario)),
    0
  );
  return moneyString(total);
}

async function insertarDetalles(
  client: PoolClient,
  pedidoId: string,
  items: CrearPedidoInput['items']
): Promise<void> {
  for (const item of items) {
    await client.query(
      `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, costo_unitario)
       VALUES ($1, $2, $3, $4)`,
      [pedidoId, item.producto_id, item.cantidad, moneyString(item.costo_unitario)]
    );
  }
}

export async function crear(input: CrearPedidoInput): Promise<PedidoDetallado> {
  return withTransaction(async (client) => {
    await validarProveedor(client, input.proveedor_id);
    await validarProductos(client, input.items);
    const result = await client.query<{ id: string }>(
      `INSERT INTO pedidos (proveedor_id, total)
       VALUES ($1, $2)
       RETURNING id`,
      [input.proveedor_id, calcularTotal(input.items)]
    );
    const pedidoId = result.rows[0].id;
    await insertarDetalles(client, pedidoId, input.items);
    return obtenerDetallado(client, pedidoId);
  });
}

export async function listar(
  page: number,
  limit: number
): Promise<{ pedidos: Pedido[]; total: number }> {
  const count = await pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM pedidos');
  const result = await pool.query<Pedido>(
    `SELECT pe.id, pe.proveedor_id, pr.nombre AS proveedor_nombre,
            pe.fecha, pe.estado, pe.total
     FROM pedidos pe
     INNER JOIN proveedores pr ON pr.id = pe.proveedor_id
     ORDER BY pe.fecha DESC, pe.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  return { pedidos: result.rows, total: Number(count.rows[0]?.total ?? 0) };
}

export async function buscarPorId(id: string): Promise<PedidoDetallado | null> {
  const pedidoResult = await pool.query<Pedido>(
    `SELECT pe.id, pe.proveedor_id, pr.nombre AS proveedor_nombre,
            pe.fecha, pe.estado, pe.total
     FROM pedidos pe
     INNER JOIN proveedores pr ON pr.id = pe.proveedor_id
     WHERE pe.id = $1`,
    [id]
  );
  const pedido = pedidoResult.rows[0];
  if (!pedido) {
    return null;
  }
  const details = await pool.query<DetallePedido>(
    `SELECT dp.id, dp.producto_id, p.nombre AS producto_nombre, p.codigo,
            dp.cantidad, dp.costo_unitario
     FROM detalle_pedido dp
     INNER JOIN productos p ON p.id = dp.producto_id
     WHERE dp.pedido_id = $1
     ORDER BY dp.id ASC`,
    [id]
  );
  return { ...pedido, items: details.rows };
}

export async function actualizar(id: string, input: CrearPedidoInput): Promise<PedidoDetallado> {
  return withTransaction(async (client) => {
    const pedidoResult = await client.query<{ estado: string }>(
      'SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE',
      [id]
    );
    const pedido = pedidoResult.rows[0];
    if (!pedido) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    if (pedido.estado !== 'pendiente') {
      throw new HttpError(409, 'Solo se pueden modificar pedidos pendientes.');
    }
    await validarProveedor(client, input.proveedor_id);
    await validarProductos(client, input.items);
    await client.query(
      'UPDATE pedidos SET proveedor_id = $2, total = $3 WHERE id = $1',
      [id, input.proveedor_id, calcularTotal(input.items)]
    );
    await client.query('DELETE FROM detalle_pedido WHERE pedido_id = $1', [id]);
    await insertarDetalles(client, id, input.items);
    return obtenerDetallado(client, id);
  });
}

export async function eliminar(id: string): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query<{ estado: string }>(
      'SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!result.rows[0]) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    if (result.rows[0].estado !== 'pendiente') {
      throw new HttpError(409, 'Solo se pueden borrar pedidos pendientes.');
    }
    await client.query('DELETE FROM pedidos WHERE id = $1', [id]);
  });
}

export async function recibir(id: string): Promise<PedidoDetallado> {
  return withTransaction(async (client) => {
    const pedidoResult = await client.query<{ id: string; estado: string }>(
      'SELECT id, estado FROM pedidos WHERE id = $1 FOR UPDATE',
      [id]
    );
    const pedido = pedidoResult.rows[0];
    if (!pedido) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    if (pedido.estado !== 'pendiente') {
      throw new HttpError(409, 'Solo se pueden recibir pedidos pendientes.');
    }
    const detalles = await client.query<{ producto_id: string; cantidad: string }>(
      `SELECT producto_id, cantidad
       FROM detalle_pedido
       WHERE pedido_id = $1
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
        throw new HttpError(409, 'No se pudo recibir el pedido porque un producto ya no existe.');
      }
      const stockNuevo = roundMoney(
        Number(productoResult.rows[0].cantidad) + Number(detalle.cantidad)
      );
      await client.query(
        `UPDATE productos
         SET cantidad = $2,
             estado = CASE WHEN $2::numeric > 0 THEN 'activo' ELSE estado END
         WHERE id = $1`,
        [detalle.producto_id, moneyString(stockNuevo)]
      );
    }
    await client.query("UPDATE pedidos SET estado = 'recibido' WHERE id = $1", [id]);
    return obtenerDetallado(client, id);
  });
}

export async function cancelar(id: string): Promise<Pedido> {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string; estado: string }>(
      'SELECT id, estado FROM pedidos WHERE id = $1 FOR UPDATE',
      [id]
    );
    const pedido = result.rows[0];
    if (!pedido) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    if (pedido.estado !== 'pendiente') {
      throw new HttpError(409, 'Solo se pueden cancelar pedidos pendientes.');
    }
    await client.query("UPDATE pedidos SET estado = 'cancelado' WHERE id = $1", [id]);
    const updated = await client.query<Pedido>(
      `SELECT pe.id, pe.proveedor_id, pr.nombre AS proveedor_nombre,
              pe.fecha, pe.estado, pe.total
       FROM pedidos pe
       INNER JOIN proveedores pr ON pr.id = pe.proveedor_id
       WHERE pe.id = $1`,
      [id]
    );
    return updated.rows[0];
  });
}
