import { DatosEnvioFactura, DatosFacturaPdf } from '../types/facturas';
import { FacturacionProvider } from './facturacion-provider';

export class OdooProvider implements FacturacionProvider {
  async generarPdf(_datos: DatosFacturaPdf): Promise<Buffer> {
    throw new Error('OdooProvider se implementará en la Fase 9.');
  }

  async enviarCorreo(_datos: DatosEnvioFactura): Promise<void> {
    throw new Error('OdooProvider se implementará en la Fase 9.');
  }
}
