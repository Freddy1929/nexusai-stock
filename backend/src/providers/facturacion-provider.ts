import { DatosEnvioFactura, DatosFacturaPdf } from '../types/facturas';

export interface FacturacionProvider {
  generarPdf(datos: DatosFacturaPdf): Promise<Buffer>;
  enviarCorreo(datos: DatosEnvioFactura): Promise<void>;
}
