import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { finalize, Subscription, forkJoin } from 'rxjs';
import { SeriePrediccion } from '../../core/models/api.models';
import { DashboardService, PrediccionApiService } from '../../core/services/entity-api.services';
import { moneda, numero } from '../../shared/formatters';
import { SummaryCardComponent } from '../../shared/ui.components';
import { AgrupacionHistorica, calcularRangoDashboard, crearDatosGrafico, PeriodoDashboard } from './dashboard-range';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BaseChartDirective, SummaryCardComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">VISTA GENERAL</span><h1>Panel principal</h1><p>Resumen del rendimiento de tu negocio.</p></div>
      <div class="dashboard-filters">
        <label for="dashboard-range">Período</label>
        <select id="dashboard-range" class="select-control" [value]="periodo" (change)="cambiarPeriodo($event)">
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
          <option value="6m">6 meses</option>
        </select>
        <span class="date-pill">◷ {{ rangoActual.desde | date:'dd/MM/yyyy' }} – {{ rangoActual.hasta | date:'dd/MM/yyyy' }}</span>
      </div>
    </div>
    <div class="card loading-card" *ngIf="cargando">Cargando los indicadores del negocio…</div>
    <div class="form-error dashboard-error" *ngIf="!cargando && errorCarga">{{ errorCarga }}</div>
    <div class="dashboard-grid" *ngIf="!cargando && !errorCarga">
      <app-summary-card titulo="Resumen de Ventas" descripcion="Actividad comercial" icono="↗" tono="blue">
          <div class="metric"><span>Ventas</span><strong>{{ numero(ventas?.cantidad_ventas) }}</strong></div>
          <div class="metric"><span>Ingresos</span><strong>{{ moneda(ventas?.ingresos) }}</strong></div>
          <div class="metric"><span>Ganancia</span><strong class="text-green">{{ moneda(ventas?.ganancia) }}</strong></div>
          <div class="metric"><span>Costo</span><strong>{{ moneda(ventas?.costo) }}</strong></div>
      </app-summary-card>
      <app-summary-card titulo="Resumen de Compras" descripcion="Compras y devoluciones" icono="⇣" tono="orange">
          <div class="metric"><span>Compras recibidas</span><strong>{{ numero(compras?.cantidad_compras) }}</strong></div>
          <div class="metric"><span>Costo total</span><strong>{{ moneda(compras?.costo_total) }}</strong></div>
          <div class="metric"><span>Cancelados</span><strong>{{ numero(compras?.cancelados) }}</strong></div>
          <div class="metric"><span>Devoluciones</span><strong>{{ numero(compras?.devoluciones_cantidad) }} <small>· {{ moneda(compras?.devoluciones_valor) }}</small></strong></div>
      </app-summary-card>
      <app-summary-card titulo="Resumen de Inventario" descripcion="Existencias y reposición" icono="▤" tono="purple" [compacto]="true">
          <div class="metric"><span>Stock actual</span><strong>{{ numero(inventario?.stock_actual_total) }} <small>unidades</small></strong></div>
          <div class="metric"><span>Por recibir</span><strong>{{ numero(inventario?.productos_por_recibir) }} <small>unidades</small></strong></div>
      </app-summary-card>
      <app-summary-card titulo="Resumen de Productos" descripcion="Catálogo conectado" icono="◇" tono="green" [compacto]="true">
          <div class="metric"><span>Proveedores</span><strong>{{ numero(productos?.proveedores) }}</strong></div>
          <div class="metric"><span>Categorías</span><strong>{{ numero(productos?.categorias) }}</strong></div>
      </app-summary-card>
    </div>
    <article class="card chart-card">
      <div class="chart-heading"><div><span class="eyebrow">ANÁLISIS DE DEMANDA</span><h2>Ventas Históricas y Proyección de Demanda (IA)</h2><p>Unidades vendidas y estimadas por {{ agrupar === 'semana' ? 'semana' : 'mes' }}.</p></div>
        <select class="select-control period-select" [value]="agrupar" (change)="cambiarAgrupacion($event)" aria-label="Agrupar ventas">
          <option value="semana">Semanal</option><option value="mes">Mensual</option>
        </select>
      </div>
      <div class="chart-wrap" *ngIf="!cargandoHistoricas && !errorHistoricas && chartData.labels?.length; else sinVentas">
        <canvas baseChart [data]="chartData" [options]="chartOptions" [type]="'bar'"></canvas>
      </div>
      <ng-template #sinVentas><div class="chart-empty">
        {{ cargandoHistoricas ? 'Cargando ventas históricas…' : errorHistoricas || 'Aún no hay ventas registradas para mostrar en este período.' }}
      </div></ng-template>
    </article>
  `
})
export class DashboardComponent implements OnInit {
  cargando = true;
  cargandoHistoricas = true;
  errorCarga = '';
  errorHistoricas = '';
  periodo: PeriodoDashboard = '6m';
  agrupar: AgrupacionHistorica = 'semana';
  rangoActual = calcularRangoDashboard(this.periodo);
  ventas: { cantidad_ventas: string; ingresos: string; costo: string; ganancia: string } | null = null;
  compras: { cantidad_compras: string; costo_total: string; cancelados: string; devoluciones_cantidad: string; devoluciones_valor: string } | null = null;
  inventario: { stock_actual_total: string; productos_por_recibir: string } | null = null;
  productos: { proveedores: string; categorias: string } | null = null;
  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 22 } },
      tooltip: { callbacks: { label: (context) => ` ${numero(context.parsed.y)} unidades` } }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { callback: (value) => `${value} unidades` } }
    }
  };
  readonly moneda = moneda;
  readonly numero = numero;
  private datosSubscription: Subscription | null = null;
  private historicasSubscription: Subscription | null = null;

  constructor(
    private readonly dashboard: DashboardService,
    private readonly prediccion: PrediccionApiService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cambiarAgrupacion(event: Event): void {
    this.agrupar = (event.target as HTMLSelectElement).value as 'semana' | 'mes';
    this.cargarHistoricas();
  }

  cambiarPeriodo(event: Event): void {
    this.periodo = (event.target as HTMLSelectElement).value as PeriodoDashboard;
    this.rangoActual = calcularRangoDashboard(this.periodo);
    this.cargar();
  }

  private cargar(): void {
    const rango = this.rangoActual;
    this.datosSubscription?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';
    this.ventas = null;
    this.compras = null;
    this.inventario = null;
    this.productos = null;
    this.changeDetector.markForCheck();
    this.datosSubscription = subscribeWithChangeDetection(forkJoin({
      ventas: this.dashboard.resumenVentas(rango.desde, rango.hasta),
      compras: this.dashboard.resumenCompras(rango.desde, rango.hasta),
      inventario: this.dashboard.resumenInventario(rango.desde, rango.hasta),
      productos: this.dashboard.resumenProductos(rango.desde, rango.hasta)
    }).pipe(finalize(() => this.cargando = false)), this.changeDetector, {
      next: (respuesta) => {
        this.ventas = respuesta.ventas.resumen;
        this.compras = respuesta.compras.resumen;
        this.inventario = respuesta.inventario.resumen;
        this.productos = respuesta.productos.resumen;
      },
      error: () => {
        this.errorCarga = 'No se pudieron cargar los datos del panel. Verifica la conexión con la API y reintenta.';
      }
    });
    this.cargarHistoricas();
  }

  private cargarHistoricas(): void {
    const rango = this.rangoActual;
    this.historicasSubscription?.unsubscribe();
    this.cargandoHistoricas = true;
    this.errorHistoricas = '';
    this.chartData = { labels: [], datasets: [] };
    this.changeDetector.markForCheck();
    this.historicasSubscription = subscribeWithChangeDetection(
      this.prediccion.serie(this.agrupar).pipe(finalize(() => this.cargandoHistoricas = false)),
      this.changeDetector,
      {
        next: (respuesta) => {
          this.actualizarGrafico(respuesta.serie);
        },
        error: () => {
          this.errorHistoricas = 'No se pudieron cargar las ventas históricas. Intenta de nuevo seleccionando otro período.';
        }
      }
    );
  }

  private actualizarGrafico(registros: SeriePrediccion[]): void {
    this.chartData = crearDatosGrafico(registros, this.agrupar);
  }
}
