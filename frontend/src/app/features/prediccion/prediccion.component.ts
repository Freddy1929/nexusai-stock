import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { NivelPrediccion, PrediccionProducto } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PrediccionApiService } from '../../core/services/entity-api.services';
import { ToastService } from '../../core/services/toast.service';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';
import { BadgeComponent, DataTableComponent } from '../../shared/ui.components';
import { numero } from '../../shared/formatters';

@Component({
  selector: 'app-prediccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DataTableComponent, BadgeComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">INTELIGENCIA DE NEGOCIO</span><h1>Predicción IA</h1><p>Estimación de consumo basada en las ventas recientes.</p></div>
      <button *ngIf="esAdmin" class="button button-primary" type="button" [disabled]="recalculando" (click)="recalcular()">
        {{ recalculando ? 'Recalculando…' : 'Recalcular predicciones' }}
      </button>
    </div>
    <div class="prediction-stats">
      <article class="card prediction-stat"><span class="summary-icon red">!</span><div><small>Alertas críticas</small><strong>{{ resumen.criticos }}</strong><span>Menos de 7 días de stock</span></div></article>
      <article class="card prediction-stat"><span class="summary-icon orange">◷</span><div><small>Advertencias</small><strong>{{ resumen.advertencia }}</strong><span>Menos de 15 días de stock</span></div></article>
      <article class="card prediction-stat"><span class="summary-icon green">✓</span><div><small>Stock normal</small><strong>{{ resumen.normales }}</strong><span>Sin alerta de reposición</span></div></article>
    </div>
    <app-data-table [pagina]="paginacion.page" [totalPaginas]="paginacion.total_pages" (paginaChange)="cambiarPagina($event)">
      <div table-toolbar class="table-toolbar">
        <div><h2 class="section-title">Demanda estimada por producto</h2><p class="section-subtitle">{{ cargando ? 'Calculando predicciones…' : error ? 'No se pudo consultar la predicción' : paginacion.total + (paginacion.total === 1 ? ' producto' : ' productos') }}</p></div>
        <div class="row-actions prediction-filters">
          <label class="table-search"><span>⌕</span><input [value]="busqueda" (input)="cambiarBusqueda($event)" placeholder="Buscar producto" aria-label="Buscar producto" /></label>
          <select class="select-control" [value]="nivel" (change)="cambiarNivel($event)" aria-label="Filtrar por nivel">
            <option value="">Todos los niveles</option><option value="critico">Crítico</option><option value="advertencia">Advertencia</option><option value="normal">Normal</option>
          </select>
        </div>
      </div>
      <table><thead><tr><th>Producto</th><th>Stock actual</th><th>Demanda diaria</th><th>Demanda 7 días</th><th>Demanda 15 días</th><th>Demanda 30 días</th><th>Días restantes</th><th>Sugerencia reposición</th><th>Nivel</th><th>Confianza</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargando && !error">
            <tr *ngFor="let fila of predicciones">
              <td><strong>{{ fila.nombre }}</strong><small class="block-muted">{{ fila.codigo }}</small></td>
              <td>{{ numero(fila.stock_actual) }} {{ fila.unidad }}</td>
              <td>{{ numero(fila.demanda_diaria) }}</td>
              <td>{{ numero(fila.demanda_7_dias) }}</td>
              <td>{{ numero(fila.demanda_15_dias) }}</td>
              <td>{{ numero(fila.demanda_30_dias) }}</td>
              <td>{{ fila.dias_restantes_stock === null ? 'Sin consumo reciente' : numero(fila.dias_restantes_stock) }}</td>
              <td>{{ numero(fila.sugerencia_reposicion) }} {{ fila.unidad }}</td>
              <td><app-badge [texto]="etiquetaNivel(fila.nivel_alerta)" [clase]="claseNivel(fila.nivel_alerta)"></app-badge></td>
              <td>{{ etiquetaConfianza(fila) }}</td>
            </tr>
          </ng-container>
          <tr *ngIf="cargando"><td colspan="10"><div class="empty-state"><strong>Calculando predicciones…</strong></div></td></tr>
          <tr *ngIf="!cargando && error"><td colspan="10"><div class="empty-state"><strong>No se pudieron cargar las predicciones</strong><small>{{ error }}</small><button class="button button-outline button-small" type="button" (click)="cargar()">Reintentar</button></div></td></tr>
          <tr *ngIf="!cargando && !error && !predicciones.length"><td colspan="10"><div class="empty-state"><span>▧</span><strong>No hay productos para mostrar</strong><small>Prueba cambiando el filtro o la búsqueda.</small></div></td></tr>
        </tbody>
      </table>
    </app-data-table>
  `
})
export class PrediccionComponent implements OnInit {
  readonly numero = numero;
  readonly esAdmin: boolean;
  predicciones: PrediccionProducto[] = [];
  resumen = { criticos: 0, advertencia: 0, normales: 0 };
  paginacion = { page: 1, limit: 10, total: 0, total_pages: 0 };
  pagina = 1;
  busqueda = '';
  nivel: NivelPrediccion | '' = '';
  cargando = true;
  recalculando = false;
  error = '';
  private solicitud: Subscription | null = null;

  constructor(
    private readonly api: PrediccionApiService,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
    private readonly notificaciones: NotificationService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    this.esAdmin = auth.tieneRol('admin');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.solicitud?.unsubscribe();
    this.cargando = true;
    this.error = '';
    this.predicciones = [];
    this.changeDetector.markForCheck();
    this.solicitud = subscribeWithChangeDetection(
      this.api.listar({
        page: this.pagina,
        limit: this.paginacion.limit,
        nivel: this.nivel,
        busqueda: this.busqueda.trim()
      }).pipe(finalize(() => this.cargando = false)),
      this.changeDetector,
      {
        next: (respuesta) => {
          this.predicciones = respuesta.predicciones;
          this.resumen = respuesta.resumen;
          this.paginacion = respuesta.paginacion;
        },
        error: () => {
          this.error = 'Verifica la conexión con la API y vuelve a intentarlo.';
        }
      }
    );
  }

  cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  cambiarBusqueda(evento: Event): void {
    this.busqueda = (evento.target as HTMLInputElement).value;
    this.pagina = 1;
    this.cargar();
  }

  cambiarNivel(evento: Event): void {
    this.nivel = (evento.target as HTMLSelectElement).value as NivelPrediccion | '';
    this.pagina = 1;
    this.cargar();
  }

  recalcular(): void {
    if (!this.esAdmin || this.recalculando) return;
    this.recalculando = true;
    subscribeWithChangeDetection(this.api.recalcular().pipe(finalize(() => this.recalculando = false)), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cargar();
        this.notificaciones.cargar();
      }
    });
  }

  etiquetaNivel(nivel: NivelPrediccion): string {
    return nivel === 'critico' ? 'Crítico' : nivel === 'advertencia' ? 'Advertencia' : 'Normal';
  }

  claseNivel(nivel: NivelPrediccion): string {
    return nivel === 'critico' ? 'badge-danger' : nivel === 'advertencia' ? 'badge-warning' : 'badge-success';
  }

  etiquetaConfianza(prediccion: PrediccionProducto): string {
    return `${prediccion.confianza} · ${prediccion.dias_con_ventas} días con ventas`;
  }
}
