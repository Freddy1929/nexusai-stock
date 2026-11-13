import { pool } from '../config/database';
import { ListaProductosFiltros } from '../types/inputs';
import { Producto } from '../types/entities';
import { HttpError } from '../utils/http-error';

export interface ProductoInput {
  nombre: string;
  codigo: string;
  categoria_id: number;
  proveedor_id: number;
  precio_compra: number;
  precio_venta: number;
  cantidad: number;
  unidad: string;
  limite_minimo: number;
  fecha_caducidad: string | null;
  imagen_url?: string | null;
  estado_registro: 'activo' | 'inactivo';
}

export interface ProductoActualizacionInput extends ProductoInput {
  cantidad_original: number;
}

const productoSelect = `
  SELECT p.id, p.nombre, p.codigo, p.categoria_id, c.nombre AS categoria_nombre,
         p.proveedor_id, pr.nombre AS proveedor_nombre, p.precio_compra,
         p.precio_venta, p.cantidad, p.unidad, p.limite_minimo,
         p.fecha_caducidad, p.imagen_url,
         CASE WHEN p.cantidad > 0 THEN 'Disponible' ELSE 'Agotado' END AS estado,
         p.estado AS estado_registro, p.creado_en
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  INNER JOIN proveedores pr ON pr.id = p.proveedor_id`;

const productoValues = (input: ProductoInput) => [
  input.nombre,
  input.codigo,
  input.categoria_id,
  input.proveedor_id,
  input.precio_compra,
  input.precio_venta,
  input.cantidad,
  input.unidad,
  input.limite_minimo,
  input.fecha_caducidad,
  input.imagen_url ?? null,
  input.estado_registro
];

export async function listarProductos(
  filtros: ListaProductosFiltros
): Promise<{ productos: Producto[]; total: number }> {
  const valoresFiltros = [
    filtros.categoria_id ?? null,
    filtros.estado ?? null,
    filtros.busqueda ? `%${filtros.busqueda}%` : null
  ];
  const where = `
    WHERE ($1::bigint IS NULL OR p.categoria_id = $1)
      AND ($2::text IS NULL OR
        (CASE WHEN p.cantidad > 0 THEN 'Disponible' ELSE 'Agotado' END) = $2)
      AND ($3::text IS NULL OR p.nombre ILIKE $3 OR p.codigo ILIKE $3)`;

  const totalResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM productos p ${where}`,
    valoresFiltros
  );
  const offset = (filtros.page - 1) * filtros.limit;
  const productosResult = await pool.query<Producto>(
    `${productoSelect}
     ${where}
     ORDER BY p.id ASC
     LIMIT $4 OFFSET $5`,
    [...valoresFiltros, filtros.limit, offset]
  );

  return {
    productos: productosResult.rows,
    total: Number(totalResult.rows[0]?.total ?? 0)
  };
}

export async function listarProductosBajoStock(): Promise<Producto[]> {
  const result = await pool.query<Producto>(
    `${productoSelect}
     WHERE p.cantidad <= p.limite_minimo
     ORDER BY p.cantidad ASC, p.nombre ASC`
  );
  return result.rows;
}

export async function listarProductosPorCaducar(dias: number): Promise<Producto[]> {
  const result = await pool.query<Producto>(
    `${productoSelect}
     WHERE p.fecha_caducidad >= CURRENT_DATE
       AND p.fecha_caducidad <= CURRENT_DATE + $1::integer
     ORDER BY p.fecha_caducidad ASC, p.nombre ASC`,
    [dias]
  );
  return result.rows;
}

export async function buscarProductoPorId(id: string): Promise<Producto | null> {
  const result = await pool.query<Producto>(
    `${productoSelect} WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  const result = await pool.query<Producto>(
    `INSERT INTO productos (
       nombre, codigo, categoria_id, proveedor_id, precio_compra, precio_venta,
       cantidad, unidad, limite_minimo, fecha_caducidad, imagen_url, estado
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    productoValues(input)
  );
  const producto = await buscarProductoPorId(result.rows[0].id);
  if (!producto) {
    throw new Error('No se pudo recuperar el producto recién creado.');
  }
  return producto;
}

export async function actualizarProducto(
  id: string,
  input: ProductoActualizacionInput
): Promise<Producto | null> {
  const result = await pool.query(
    `UPDATE productos
     SET nombre = $2, codigo = $3, categoria_id = $4, proveedor_id = $5,
         precio_compra = $6, precio_venta = $7, cantidad = $8, unidad = $9,
         limite_minimo = $10, fecha_caducidad = $11, imagen_url = $12, estado = $13
     WHERE id = $1 AND cantidad = $14`,
    [id, ...productoValues(input), input.cantidad_original]
  );
  if (result.rowCount !== 1) {
    const existente = await pool.query('SELECT id FROM productos WHERE id = $1', [id]);
    if (existente.rowCount === 1) {
      throw new HttpError(409, 'El inventario cambió desde que abriste el formulario. Cierra y vuelve a abrir la edición para cargar el stock actualizado.');
    }
    return null;
  }
  return buscarProductoPorId(id);
}

export async function eliminarProducto(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
  return result.rowCount === 1;
}
