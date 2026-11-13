export type NivelAlerta = 'critico' | 'advertencia' | 'normal';
export type NivelConfianza = 'alta' | 'media' | 'baja';

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

export interface ProductoPrediccion {
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
  nivel_alerta: NivelAlerta;
  sugerencia_reposicion: number;
  confianza: NivelConfianza;
  dias_con_ventas: number;
  ventana_dias: number;
  fecha_calculo?: string;
}

export interface VentaDiariaProducto {
  producto_id: string;
  fecha: string;
  cantidad: number;
}
