export type RolUsuario = 'admin' | 'vendedor';
export type EstadoProducto = 'Disponible' | 'Agotado';
export type EstadoPedido = 'pendiente' | 'recibido' | 'cancelado';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  creado_en: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  creado_en: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  creado_en: string;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoria_id: string;
  categoria_nombre: string;
  proveedor_id: string;
  proveedor_nombre: string;
  precio_compra: string | number;
  precio_venta: string | number;
  cantidad: string | number;
  unidad: string;
  limite_minimo: string | number;
  fecha_caducidad: string | null;
  imagen_url: string | null;
  estado: EstadoProducto;
  estado_registro: 'activo' | 'inactivo';
  creado_en: string;
}

export interface Cliente {
  id: string;
  tipo_identificacion: 'cedula' | 'ruc' | 'pasaporte';
  identificacion: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  creado_en: string;
}

export interface ClienteInput {
  tipo_identificacion: Cliente['tipo_identificacion'];
  identificacion: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface Venta {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  identificacion_cliente: string | null;
  fecha: string;
  subtotal: string;
  iva: string;
  total: string;
  forma_pago: FormaPagoSri;
  estado: 'pendiente' | 'pagada' | 'anulada';
  factura?: FacturaEstadoVenta | null;
  items?: DetalleVenta[];
}

export type FormaPagoSri = '01' | '15' | '16' | '17' | '18' | '19' | '20' | '21';
export type EstadoSri = 'sin_xml' | 'xml_generado' | 'firmado' | 'enviado' | 'autorizado' | 'rechazado' | 'error';

export interface FacturaEstadoVenta {
  id: string;
  numero: string;
  estado: 'generada' | 'enviada' | 'anulada' | 'error';
  email_enviado: boolean;
  email_error: string | null;
  clave_acceso: string | null;
  estado_sri: EstadoSri;
  mensaje_sri: string | null;
  xml_path?: string | null;
  ambiente?: '1' | '2' | null;
  correo_configurado?: boolean;
}

export interface Factura extends FacturaEstadoVenta {
  venta_id: string;
  xml_path: string | null;
  ambiente: '1' | '2' | null;
  numero_autorizacion: string | null;
  fecha_autorizacion: string | null;
  fecha_emision: string;
  pdf_url: string | null;
  cliente: Pick<Cliente, 'tipo_identificacion' | 'identificacion' | 'nombre' | 'email'>;
  subtotal: string;
  iva: string;
  total: string;
  items: Array<{
    producto_nombre: string;
    codigo: string;
    cantidad: string;
    precio_unitario: string;
    subtotal: string;
  }>;
}

export interface FacturaListado extends FacturaEstadoVenta {
  venta_id: string;
  clave_acceso: string | null;
  fecha_emision: string;
  pdf_url: string | null;
  cliente_nombre: string;
  identificacion_cliente: string;
  cliente_email: string | null;
  total: string;
}

export interface DetalleVenta {
  id: string;
  producto_id: string;
  producto_nombre: string;
  codigo: string;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
}

export interface Pedido {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  fecha: string;
  estado: EstadoPedido;
  total: string;
  items?: DetallePedido[];
}

export interface DetallePedido {
  id: string;
  producto_id: string;
  producto_nombre: string;
  codigo: string;
  cantidad: string;
  costo_unitario: string;
}

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ListaProductos {
  productos: Producto[];
  paginacion: Paginacion;
}

export interface ListaVentas {
  ventas: Venta[];
  paginacion: Paginacion;
}

export interface ListaPedidos {
  pedidos: Pedido[];
  paginacion: Paginacion;
}

export interface ListaClientes {
  clientes: Cliente[];
  paginacion: Paginacion;
}

export interface ResumenVentas {
  cantidad_ventas: string;
  ingresos: string;
  costo: string;
  ganancia: string;
}

export interface ResumenCompras {
  cantidad_compras: string;
  costo_total: string;
  cancelados: string;
  devoluciones_cantidad: string;
  devoluciones_valor: string;
}

export interface ResumenInventario {
  stock_actual_total: string;
  productos_por_recibir: string;
}

export interface ResumenProductos {
  proveedores: string;
  categorias: string;
}

export interface VentaHistorica {
  periodo: string;
  cantidad_ventas: string;
  ingresos: string;
}

export type NivelPrediccion = 'critico' | 'advertencia' | 'normal';
export type ConfianzaPrediccion = 'alta' | 'media' | 'baja';

export interface ConfiguracionIA {
  ventana_dias: number;
  dias_recientes: number;
  dias_intermedios: number;
  peso_reciente: number;
  peso_intermedio: number;
  peso_antiguo: number;
  umbral_critico: number;
  umbral_advertencia: number;
}

export interface PrediccionProducto {
  producto_id: string;
  nombre: string;
  codigo: string;
  unidad: string;
  stock_actual: number;
  limite_minimo: number;
  demanda_diaria: number;
  demanda_7_dias: number;
  demanda_15_dias: number;
  demanda_30_dias: number;
  dias_restantes_stock: number | null;
  nivel_alerta: NivelPrediccion;
  sugerencia_reposicion: number;
  confianza: ConfianzaPrediccion;
  dias_con_ventas: number;
  ventana_dias: number;
}

export interface SeriePrediccion {
  periodo: string;
  ventas_reales: number;
  proyeccion: number | null;
}

export interface MensajeRespuesta<T> {
  mensaje: string;
  [key: string]: T | string;
}

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

export interface ProveedorInput {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
}
