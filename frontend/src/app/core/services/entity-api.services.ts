import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Categoria, Cliente, ClienteInput, DetallePedido, Factura, FacturaListado, ListaClientes, ListaPedidos, ListaProductos, ListaVentas,
  Pedido, Producto, ProductoActualizacionInput, ProductoInput, Proveedor, ProveedorInput, ResumenCompras, ResumenInventario,
  ResumenProductos, ResumenVentas, FormaPagoSri, Venta, VentaHistorica
} from '../models/api.models';
import { ConfiguracionIA, NivelPrediccion, PrediccionProducto, SeriePrediccion } from '../models/api.models';

const api = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  constructor(private readonly http: HttpClient) {}

  listar(): Observable<{ categorias: Categoria[] }> {
    return this.http.get<{ categorias: Categoria[] }>(`${api}/categorias`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  constructor(private readonly http: HttpClient) {}

  listar(filtros: { page: number; limit: number; busqueda?: string; categoria_id?: string; estado?: string }): Observable<ListaProductos> {
    let params = new HttpParams().set('page', filtros.page).set('limit', filtros.limit);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.categoria_id) params = params.set('categoria_id', filtros.categoria_id);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<ListaProductos>(`${api}/productos`, { params });
  }

  bajoStock(): Observable<{ productos: Producto[] }> {
    return this.http.get<{ productos: Producto[] }>(`${api}/productos/bajo-stock`);
  }

  porCaducar(dias = 30): Observable<{ dias: number; productos: Producto[] }> {
    return this.http.get<{ dias: number; productos: Producto[] }>(`${api}/productos/por-caducar`, {
      params: new HttpParams().set('dias', dias)
    });
  }

  crear(datos: ProductoInput): Observable<{ mensaje: string; producto: Producto }> {
    return this.http.post<{ mensaje: string; producto: Producto }>(`${api}/productos`, datos);
  }

  actualizar(id: string, datos: ProductoActualizacionInput): Observable<{ mensaje: string; producto: Producto }> {
    return this.http.put<{ mensaje: string; producto: Producto }>(`${api}/productos/${id}`, datos);
  }

  eliminar(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${api}/productos/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  constructor(private readonly http: HttpClient) {}

  listar(): Observable<{ proveedores: Proveedor[] }> {
    return this.http.get<{ proveedores: Proveedor[] }>(`${api}/proveedores`);
  }

  crear(datos: ProveedorInput): Observable<{ mensaje: string; proveedor: Proveedor }> {
    return this.http.post<{ mensaje: string; proveedor: Proveedor }>(`${api}/proveedores`, datos);
  }

  actualizar(id: string, datos: ProveedorInput): Observable<{ mensaje: string; proveedor: Proveedor }> {
    return this.http.put<{ mensaje: string; proveedor: Proveedor }>(`${api}/proveedores/${id}`, datos);
  }

  eliminar(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${api}/proveedores/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  constructor(private readonly http: HttpClient) {}

  buscarPorIdentificacion(identificacion: string): Observable<{ cliente: Cliente }> {
    return this.http.get<{ cliente: Cliente }>(`${api}/clientes/buscar`, {
      params: new HttpParams().set('identificacion', identificacion)
    });
  }

  listar(page = 1, limit = 10, busqueda?: string): Observable<ListaClientes> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<ListaClientes>(`${api}/clientes`, { params });
  }

  crear(datos: ClienteInput): Observable<{ mensaje: string; cliente: Cliente }> {
    return this.http.post<{ mensaje: string; cliente: Cliente }>(`${api}/clientes`, datos);
  }

  actualizar(id: string, datos: ClienteInput): Observable<{ mensaje: string; cliente: Cliente }> {
    return this.http.put<{ mensaje: string; cliente: Cliente }>(`${api}/clientes/${id}`, datos);
  }

  eliminar(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${api}/clientes/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class VentaService {
  constructor(private readonly http: HttpClient) {}

  listar(page = 1, limit = 10): Observable<ListaVentas> {
    return this.http.get<ListaVentas>(`${api}/ventas`, {
      params: new HttpParams().set('page', page).set('limit', limit)
    });
  }

  crear(datos: { cliente_id: number; forma_pago: FormaPagoSri; items: Array<{ producto_id: number; cantidad: number }> }): Observable<{ mensaje: string; venta: Venta }> {
    return this.http.post<{ mensaje: string; venta: Venta }>(`${api}/ventas`, datos);
  }

  anular(id: string): Observable<{ mensaje: string; venta: Venta }> {
    return this.http.post<{ mensaje: string; venta: Venta }>(`${api}/ventas/${id}/anular`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  constructor(private readonly http: HttpClient) {}

  listar(page = 1, limit = 10): Observable<{
    facturas: FacturaListado[];
    paginacion: { page: number; limit: number; total: number; total_pages: number };
  }> {
    return this.http.get<{
      facturas: FacturaListado[];
      paginacion: { page: number; limit: number; total: number; total_pages: number };
    }>(`${api}/facturas`, {
      params: new HttpParams().set('page', page).set('limit', limit)
    });
  }

  obtener(id: string): Observable<{ factura: Factura }> {
    return this.http.get<{ factura: Factura }>(`${api}/facturas/${id}`);
  }

  generar(ventaId: string): Observable<{ mensaje: string; factura: Factura }> {
    return this.http.post<{ mensaje: string; factura: Factura }>(`${api}/facturas/generar/${ventaId}`, {});
  }

  enviarCorreo(id: string): Observable<{ mensaje: string; factura: Factura; correoConfigurado: boolean }> {
    return this.http.post<{ mensaje: string; factura: Factura; correoConfigurado: boolean }>(`${api}/facturas/${id}/enviar-correo`, {});
  }

  regenerarXml(id: string): Observable<{ mensaje: string; factura: Factura }> {
    return this.http.post<{ mensaje: string; factura: Factura }>(`${api}/facturas/${id}/regenerar-xml`, {});
  }

  descargarPdf(id: string): Observable<Blob> {
    return this.http.get(`${api}/facturas/${id}/pdf`, { responseType: 'blob' });
  }

  descargarXml(id: string): Observable<Blob> {
    return this.http.get(`${api}/facturas/${id}/xml`, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  constructor(private readonly http: HttpClient) {}

  listar(page = 1, limit = 10): Observable<ListaPedidos> {
    return this.http.get<ListaPedidos>(`${api}/pedidos`, {
      params: new HttpParams().set('page', page).set('limit', limit)
    });
  }

  obtener(id: string): Observable<{ pedido: Pedido }> {
    return this.http.get<{ pedido: Pedido }>(`${api}/pedidos/${id}`);
  }

  crear(datos: { proveedor_id: number; items: Array<{ producto_id: number; cantidad: number; costo_unitario: number }> }): Observable<{ mensaje: string; pedido: Pedido }> {
    return this.http.post<{ mensaje: string; pedido: Pedido }>(`${api}/pedidos`, datos);
  }

  recibir(id: string): Observable<{ mensaje: string; pedido: Pedido }> {
    return this.http.patch<{ mensaje: string; pedido: Pedido }>(`${api}/pedidos/${id}/recibir`, {});
  }

  cancelar(id: string): Observable<{ mensaje: string; pedido: Pedido }> {
    return this.http.patch<{ mensaje: string; pedido: Pedido }>(`${api}/pedidos/${id}/cancelar`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  private rangoParams(desde: string, hasta: string): HttpParams {
    return new HttpParams().set('desde', desde).set('hasta', hasta);
  }

  resumenVentas(desde: string, hasta: string): Observable<{ rango: { desde: string; hasta: string }; resumen: ResumenVentas }> {
    return this.http.get<{ rango: { desde: string; hasta: string }; resumen: ResumenVentas }>(`${api}/dashboard/resumen-ventas`, {
      params: this.rangoParams(desde, hasta)
    });
  }

  resumenCompras(desde: string, hasta: string): Observable<{ rango: { desde: string; hasta: string }; resumen: ResumenCompras }> {
    return this.http.get<{ rango: { desde: string; hasta: string }; resumen: ResumenCompras }>(`${api}/dashboard/resumen-compras`, {
      params: this.rangoParams(desde, hasta)
    });
  }

  resumenInventario(desde: string, hasta: string): Observable<{ rango: { desde: string; hasta: string }; resumen: ResumenInventario }> {
    return this.http.get<{ rango: { desde: string; hasta: string }; resumen: ResumenInventario }>(`${api}/dashboard/resumen-inventario`, {
      params: this.rangoParams(desde, hasta)
    });
  }

  resumenProductos(desde: string, hasta: string): Observable<{ rango: { desde: string; hasta: string }; resumen: ResumenProductos }> {
    return this.http.get<{ rango: { desde: string; hasta: string }; resumen: ResumenProductos }>(`${api}/dashboard/resumen-productos`, {
      params: this.rangoParams(desde, hasta)
    });
  }

  ventasHistoricas(desde: string, hasta: string, agrupar: 'semana' | 'mes'): Observable<{
    rango: { desde: string; hasta: string };
    agrupar: 'semana' | 'mes';
    ventas: VentaHistorica[];
  }> {
    return this.http.get<{
      rango: { desde: string; hasta: string };
      agrupar: 'semana' | 'mes';
      ventas: VentaHistorica[];
    }>(`${api}/dashboard/ventas-historicas`, {
      params: this.rangoParams(desde, hasta).set('agrupar', agrupar)
    });
  }
}

@Injectable({ providedIn: 'root' })
export class PrediccionApiService {
  constructor(private readonly http: HttpClient) {}

  listar(filtros: {
    page: number;
    limit: number;
    nivel?: NivelPrediccion | '';
    busqueda?: string;
  }): Observable<{
    predicciones: PrediccionProducto[];
    resumen: { criticos: number; advertencia: number; normales: number };
    paginacion: { page: number; limit: number; total: number; total_pages: number };
  }> {
    let params = new HttpParams().set('page', filtros.page).set('limit', filtros.limit);
    if (filtros.nivel) params = params.set('nivel', filtros.nivel);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    return this.http.get<{
      predicciones: PrediccionProducto[];
      resumen: { criticos: number; advertencia: number; normales: number };
      paginacion: { page: number; limit: number; total: number; total_pages: number };
    }>(`${api}/prediccion`, { params });
  }

  alertas(): Observable<{ alertas: PrediccionProducto[] }> {
    return this.http.get<{ alertas: PrediccionProducto[] }>(`${api}/prediccion/alertas`);
  }

  serie(agrupar: 'semana' | 'mes'): Observable<{
    agrupar: 'semana' | 'mes';
    serie: SeriePrediccion[];
  }> {
    return this.http.get<{ agrupar: 'semana' | 'mes'; serie: SeriePrediccion[] }>(
      `${api}/prediccion/serie`,
      { params: new HttpParams().set('agrupar', agrupar) }
    );
  }

  recalcular(): Observable<{ mensaje: string; resultado: { cantidad: number; fecha_calculo: string } }> {
    return this.http.post<{ mensaje: string; resultado: { cantidad: number; fecha_calculo: string } }>(
      `${api}/prediccion/recalcular`,
      {}
    );
  }

  obtenerConfiguracion(): Observable<{ configuracion: ConfiguracionIA }> {
    return this.http.get<{ configuracion: ConfiguracionIA }>(`${api}/configuracion-ia`);
  }

  guardarConfiguracion(configuracion: ConfiguracionIA): Observable<{ mensaje: string; configuracion: ConfiguracionIA }> {
    return this.http.put<{ mensaje: string; configuracion: ConfiguracionIA }>(
      `${api}/configuracion-ia`,
      configuracion
    );
  }
}
