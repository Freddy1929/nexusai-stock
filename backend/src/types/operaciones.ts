export type TipoIdentificacion = 'cedula' | 'ruc' | 'pasaporte';
export type EstadoVenta = 'pendiente' | 'pagada' | 'anulada';
export type EstadoPedido = 'pendiente' | 'recibido' | 'cancelado';
export type FormaPagoSri = '01' | '15' | '16' | '17' | '18' | '19' | '20' | '21';
export type EstadoSri = 'sin_xml' | 'xml_generado' | 'firmado' | 'enviado' | 'autorizado' | 'rechazado' | 'error';

export interface Cliente {
  id: string;
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  creado_en: Date;
}

export interface ClienteInput {
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface ItemVentaInput {
  producto_id: number;
  cantidad: number;
}

export interface CrearVentaInput {
  cliente_id: number;
  items: ItemVentaInput[];
  forma_pago: FormaPagoSri;
}

export interface Venta {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  identificacion_cliente: string | null;
  fecha: Date;
  subtotal: string;
  iva: string;
  total: string;
  estado: EstadoVenta;
  forma_pago: FormaPagoSri;
  factura?: {
    id: string;
    numero: string;
    estado: 'generada' | 'enviada' | 'anulada' | 'error';
    email_enviado: boolean;
    email_error: string | null;
    clave_acceso: string | null;
    estado_sri: EstadoSri;
    mensaje_sri: string | null;
    correo_configurado?: boolean;
  } | null;
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

export interface VentaDetallada extends Venta {
  items: DetalleVenta[];
}

export interface ItemPedidoInput {
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
}

export interface CrearPedidoInput {
  proveedor_id: number;
  items: ItemPedidoInput[];
}

export interface Pedido {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  fecha: Date;
  estado: EstadoPedido;
  total: string;
}

export interface DetallePedido {
  id: string;
  producto_id: string;
  producto_nombre: string;
  codigo: string;
  cantidad: string;
  costo_unitario: string;
}

export interface PedidoDetallado extends Pedido {
  items: DetallePedido[];
}

export interface RangoFechas {
  desde: string;
  hasta: string;
}
