import { PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  FacturaDetallada,
  FacturaListado,
  FacturaResumen,
  ItemFactura,
  ResultadoListaFacturas,
  VentaParaFactura
} from '../types/facturas';
interface VentaFacturaRow {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  identificacion_cliente: string | null;
  fecha: Date;
  subtotal: string;
  iva: string;
  total: string;
  estado: VentaParaFactura['estado'];
  forma_pago: VentaParaFactura['forma_pago'];
  tipo_identificacion: VentaParaFactura['cliente']['tipo_identificacion'];
  email: string | null;
  direccion: string | null;
}

interface FacturaDetalleRow extends FacturaResumen {
  cliente_tipo_identificacion: VentaParaFactura['cliente']['tipo_identificacion'];
  cliente_identificacion: string;
  cliente_nombre: string;
  cliente_email: string | null;
  cliente_direccion: string | null;
  forma_pago: VentaParaFactura['forma_pago'];
  subtotal: string;
  iva: string;
  total: string;
}

const consultaFacturaDetalle = `
  SELECT f.id, f.venta_id, f.numero, f.clave_acceso, f.xml_path, f.ambiente,
         f.estado_sri, f.mensaje_sri, f.numero_autorizacion, f.fecha_autorizacion,
         f.fecha_emision,
         f.estado, f.pdf_url, f.email_enviado, f.email_error,
         c.tipo_identificacion AS cliente_tipo_identificacion,
         c.identificacion AS cliente_identificacion,
         c.nombre AS cliente_nombre, c.email AS cliente_email, c.direccion AS cliente_direccion,
         v.subtotal, v.iva, v.total, v.forma_pago
  FROM facturas f
  INNER JOIN ventas v ON v.id = f.venta_id
  INNER JOIN clientes c ON c.id = v.cliente_id
`;

async function obtenerItems(client: PoolClient, ventaId: string): Promise<ItemFactura[]> {
  const result = await client.query<ItemFactura>(
    `SELECT p.nombre AS producto_nombre, p.codigo, dv.cantidad,
            dv.precio_unitario, dv.subtotal
     FROM detalle_venta dv
     INNER JOIN productos p ON p.id = dv.producto_id
     WHERE dv.venta_id = $1
     ORDER BY dv.id ASC`,
    [ventaId]
  );
  return result.rows;
}

function mapearFactura(row: FacturaDetalleRow, items: ItemFactura[]): FacturaDetallada {
  return {
    id: row.id,
    venta_id: row.venta_id,
    numero: row.numero,
    clave_acceso: row.clave_acceso,
    xml_path: row.xml_path,
    ambiente: row.ambiente,
    estado_sri: row.estado_sri,
    mensaje_sri: row.mensaje_sri,
    numero_autorizacion: row.numero_autorizacion,
    fecha_autorizacion: row.fecha_autorizacion,
    fecha_emision: row.fecha_emision,
    estado: row.estado,
    pdf_url: row.pdf_url,
    email_enviado: row.email_enviado,
    email_error: row.email_error,
    cliente: {
      tipo_identificacion: row.cliente_tipo_identificacion,
      identificacion: row.cliente_identificacion,
      nombre: row.cliente_nombre,
      email: row.cliente_email,
      direccion: row.cliente_direccion
    },
    subtotal: row.subtotal,
    iva: row.iva,
    total: row.total,
    forma_pago: row.forma_pago,
    items
  };
}

export async function obtenerVentaParaFactura(client: PoolClient, id: string): Promise<VentaParaFactura | null> {
  // Bloquear la venta serializa la emisión y evita facturar dos veces el mismo registro.
  const ventaResult = await client.query<VentaFacturaRow>(
    `SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre,
            c.identificacion AS identificacion_cliente, v.fecha,
            v.subtotal, v.iva, v.total, v.estado, v.forma_pago,
            c.tipo_identificacion, c.email, c.direccion
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.id = $1
     FOR UPDATE OF v`,
    [id]
  );
  const venta = ventaResult.rows[0];
  if (!venta || !venta.cliente_id || !venta.cliente_nombre || !venta.identificacion_cliente || !venta.tipo_identificacion) {
    return null;
  }
  const items = await obtenerItems(client, id);
  return {
    id: venta.id,
    cliente_id: venta.cliente_id,
    cliente_nombre: venta.cliente_nombre,
    identificacion_cliente: venta.identificacion_cliente,
    fecha: venta.fecha,
    subtotal: venta.subtotal,
    iva: venta.iva,
    total: venta.total,
    forma_pago: venta.forma_pago,
    estado: venta.estado,
    items,
    cliente: {
      tipo_identificacion: venta.tipo_identificacion,
      identificacion: venta.identificacion_cliente,
      nombre: venta.cliente_nombre,
      email: venta.email,
      direccion: venta.direccion
    }
  };
}

export async function buscarPorVenta(client: PoolClient, ventaId: string): Promise<FacturaResumen | null> {
  const result = await client.query<FacturaResumen>(
    `SELECT id, venta_id, numero, clave_acceso, xml_path, ambiente,
            estado_sri, mensaje_sri, numero_autorizacion, fecha_autorizacion,
            fecha_emision, estado,
            pdf_url, email_enviado, email_error
     FROM facturas WHERE venta_id = $1`,
    [ventaId]
  );
  return result.rows[0] ?? null;
}

export async function bloquearVentaParaEnvio(client: PoolClient, ventaId: string): Promise<string | null> {
  const result = await client.query<{ estado: string }>(
    'SELECT estado FROM ventas WHERE id = $1 FOR UPDATE',
    [ventaId]
  );
  return result.rows[0]?.estado ?? null;
}

export async function crear(
  client: PoolClient,
  factura: Pick<FacturaResumen,
    'venta_id' | 'numero' | 'clave_acceso' | 'pdf_url' | 'xml_path' | 'ambiente' |
    'estado_sri' | 'mensaje_sri'>
): Promise<FacturaDetallada> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO facturas
       (venta_id, numero, clave_acceso, estado, pdf_url, xml_path, ambiente, estado_sri, mensaje_sri)
     VALUES ($1, $2, $3, 'generada', $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      factura.venta_id, factura.numero, factura.clave_acceso, factura.pdf_url,
      factura.xml_path, factura.ambiente, factura.estado_sri, factura.mensaje_sri
    ]
  );
  const creada = result.rows[0];
  const detalle = await client.query<FacturaDetalleRow>(
    `${consultaFacturaDetalle} WHERE f.id = $1`,
    [creada.id]
  );
  return mapearFactura(detalle.rows[0], await obtenerItems(client, factura.venta_id));
}

export async function listar(page: number, limit: number): Promise<ResultadoListaFacturas> {
  const count = await pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM facturas');
  const result = await pool.query<FacturaListado>(
    `SELECT f.id, f.venta_id, f.numero, f.clave_acceso, f.xml_path, f.ambiente,
            f.estado_sri, f.mensaje_sri, f.numero_autorizacion, f.fecha_autorizacion,
            f.fecha_emision,
            f.estado, f.pdf_url, f.email_enviado, f.email_error,
            c.nombre AS cliente_nombre, c.identificacion AS identificacion_cliente,
            c.email AS cliente_email, v.total
     FROM facturas f
     INNER JOIN ventas v ON v.id = f.venta_id
     INNER JOIN clientes c ON c.id = v.cliente_id
     ORDER BY f.fecha_emision DESC, f.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const total = Number(count.rows[0]?.total ?? 0);
  return {
    facturas: result.rows,
    paginacion: { page, limit, total, total_pages: Math.ceil(total / limit) }
  };
}

export async function buscarPorId(client: PoolClient, id: string, bloquear = false): Promise<FacturaDetallada | null> {
  const result = await client.query<FacturaDetalleRow>(
    `${consultaFacturaDetalle} WHERE f.id = $1 ${bloquear ? 'FOR UPDATE OF f' : ''}`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return mapearFactura(row, await obtenerItems(client, row.venta_id));
}

export async function actualizarEnvio(
  client: PoolClient,
  id: string,
  error: string | null
): Promise<void> {
  await client.query(
    `UPDATE facturas
     SET email_enviado = $2,
         email_error = $3,
         estado = $4
     WHERE id = $1`,
    [id, error === null, error, error === null ? 'enviada' : 'error']
  );
}

export async function actualizarXmlSri(
  client: PoolClient,
  id: string,
  datos: Pick<FacturaResumen, 'clave_acceso' | 'xml_path' | 'ambiente' | 'estado_sri' | 'mensaje_sri'>,
  reiniciarAutorizacion = false
): Promise<void> {
  await client.query(
    `UPDATE facturas
     SET clave_acceso = $2,
         xml_path = $3,
         ambiente = $4,
         estado_sri = $5,
         mensaje_sri = $6,
         numero_autorizacion = CASE WHEN $7 THEN NULL ELSE numero_autorizacion END,
         fecha_autorizacion = CASE WHEN $7 THEN NULL ELSE fecha_autorizacion END
     WHERE id = $1`,
    [
      id, datos.clave_acceso, datos.xml_path, datos.ambiente, datos.estado_sri,
      datos.mensaje_sri, reiniciarAutorizacion
    ]
  );
}
