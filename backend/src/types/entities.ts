export type Id = string;
export type NumericValue = string | number;

export interface Categoria {
  id: Id;
  nombre: string;
  creado_en: Date;
}

export interface Proveedor {
  id: Id;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  creado_en: Date;
}

export interface Producto {
  id: Id;
  nombre: string;
  codigo: string;
  categoria_id: Id;
  categoria_nombre: string;
  proveedor_id: Id;
  proveedor_nombre: string;
  precio_compra: NumericValue;
  precio_venta: NumericValue;
  cantidad: NumericValue;
  unidad: string;
  limite_minimo: NumericValue;
  fecha_caducidad: string | null;
  imagen_url: string | null;
  estado: 'Disponible' | 'Agotado';
  estado_registro: 'activo' | 'inactivo';
  creado_en: Date;
}
