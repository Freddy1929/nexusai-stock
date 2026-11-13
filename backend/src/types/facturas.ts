import type { Cliente, EstadoSri, EstadoVenta, FormaPagoSri } from './operaciones';
import type { AmbienteSri } from '../utils/facturas-sri';

export interface FacturaResumen {
  id: string;
  venta_id: string;
  numero: string;
  clave_acceso: string | null;
  xml_path: string | null;
  ambiente: AmbienteSri | null;
  estado_sri: EstadoSri;
  mensaje_sri: string | null;
  numero_autorizacion: string | null;
  fecha_autorizacion: Date | null;
  fecha_emision: Date;
  estado: 'generada' | 'enviada' | 'anulada' | 'error';
  pdf_url: string | null;
  email_enviado: boolean;
  email_error: string | null;
}

export interface ItemFactura {
  producto_nombre: string;
  codigo: string;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
}

export interface DatosFacturaPdf {
  numero: string;
  claveAcceso: string;
  claveAccesoReal: boolean;
  ambienteSri: AmbienteSri | null;
  estadoSri: EstadoSri;
  fechaEmision: Date;
  emisor: {
    razonSocial: string;
    ruc: string;
    direccion: string;
  };
  cliente: Pick<Cliente, 'tipo_identificacion' | 'identificacion' | 'nombre' | 'email' | 'direccion'>;
  items: ItemFactura[];
  subtotal: string;
  iva: string;
  total: string;
}

export interface FacturaDetallada extends FacturaResumen {
  cliente: DatosFacturaPdf['cliente'];
  subtotal: string;
  iva: string;
  total: string;
  items: ItemFactura[];
  forma_pago: FormaPagoSri;
}

export interface FacturaListado extends FacturaResumen {
  cliente_nombre: string;
  identificacion_cliente: string;
  cliente_email: string | null;
  total: string;
}

export interface ResultadoListaFacturas {
  facturas: FacturaListado[];
  paginacion: { page: number; limit: number; total: number; total_pages: number };
}

export interface DatosEnvioFactura {
  para: string;
  nombre: string;
  numero: string;
  fechaEmision: Date;
  total: string;
  pdf: Buffer;
  xml?: Buffer;
}

export interface VentaParaFactura {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  identificacion_cliente: string;
  fecha: Date;
  subtotal: string;
  iva: string;
  total: string;
  forma_pago: FormaPagoSri;
  estado: EstadoVenta;
  items: ItemFactura[];
  cliente: DatosFacturaPdf['cliente'];
}
