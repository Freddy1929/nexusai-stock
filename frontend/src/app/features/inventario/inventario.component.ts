import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaService, ProductoService, ProveedorService } from '../../core/services/entity-api.services';
import { Categoria, Producto, ProductoActualizacionInput, Proveedor, ProductoInput, Paginacion } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { BadgeComponent, DataTableComponent, ModalComponent } from '../../shared/ui.components';
import { fechaLocal, moneda, numero } from '../../shared/formatters';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-inventario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, BadgeComponent, DataTableComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">CATÁLOGO Y EXISTENCIAS</span><h1>Inventario</h1><p>Administra productos, stock y fechas de caducidad.</p></div>
      <button *ngIf="esAdmin" class="button button-primary" type="button" (click)="abrirNuevo()">＋ Agregar producto</button>
    </div>
    <div class="inventory-stats">
      <article class="card mini-stat"><span class="mini-stat-icon blue">▤</span><div><small>Productos registrados</small><strong>{{ cargandoTabla ? '…' : paginacion.total }}</strong></div></article>
      <article class="card mini-stat"><span class="mini-stat-icon orange">↘</span><div><small>Productos bajo mínimo</small><strong>{{ cargandoResumen ? '…' : bajoStock.length }}</strong></div></article>
      <article class="card mini-stat"><span class="mini-stat-icon red">◷</span><div><small>Por caducar (30 días)</small><strong>{{ cargandoResumen ? '…' : porCaducar.length }}</strong></div></article>
    </div>
    <div class="form-error inventory-error" *ngIf="errorResumen">{{ errorResumen }}</div>
    <app-data-table [pagina]="paginacion.page" [totalPaginas]="paginacion.total_pages" (paginaChange)="cambiarPagina($event)">
      <div table-toolbar class="table-toolbar">
        <form class="table-search" (submit)="buscar($event)"><span>⌕</span><input [(ngModel)]="busqueda" name="busqueda" placeholder="Buscar por producto o código" /><button class="button button-outline button-small" type="submit">Buscar</button></form>
        <div class="filter-row">
          <select class="select-control" [(ngModel)]="categoriaId" (change)="cargar()" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option><option *ngFor="let categoria of categorias" [value]="categoria.id">{{ categoria.nombre }}</option></select>
          <select class="select-control" [(ngModel)]="estado" (change)="cargar()" aria-label="Filtrar por estado"><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Agotado">Agotado</option></select>
        </div>
      </div>
      <table><thead><tr><th>Producto</th><th>Precio compra</th><th>Cantidad</th><th>Límite mínimo</th><th>Fecha caducidad</th><th>Estado</th><th *ngIf="esAdmin">Acciones</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargandoTabla && !errorCarga">
            <tr *ngFor="let producto of productos">
              <td><div class="product-cell"><span class="product-thumb">▤</span><span><strong>{{ producto.nombre }}</strong><small>{{ producto.codigo }} · {{ producto.categoria_nombre }}</small></span></div></td>
              <td>{{ moneda(producto.precio_compra) }}</td><td>{{ numero(producto.cantidad) }} {{ producto.unidad }}</td><td>{{ numero(producto.limite_minimo) }}</td><td>{{ fechaLocal(producto.fecha_caducidad) }}</td>
              <td><app-badge [texto]="producto.estado" [clase]="producto.estado === 'Disponible' ? 'badge-success' : 'badge-danger'"></app-badge></td>
              <td *ngIf="esAdmin"><div class="row-actions"><button type="button" class="text-action" (click)="editar(producto)">Editar</button><button type="button" class="text-action danger-action" (click)="eliminar(producto)">Eliminar</button></div></td>
            </tr>
          </ng-container>
          <tr *ngIf="cargandoTabla"><td [attr.colspan]="esAdmin ? 7 : 6"><div class="empty-state"><strong>Cargando productos…</strong></div></td></tr>
          <tr *ngIf="!cargandoTabla && errorCarga"><td [attr.colspan]="esAdmin ? 7 : 6"><div class="empty-state"><strong>No se pudo cargar el inventario</strong><small>{{ errorCarga }}</small><button class="button button-outline button-small" type="button" (click)="cargar()">Reintentar</button></div></td></tr>
          <tr *ngIf="!cargandoTabla && !errorCarga && !productos.length"><td [attr.colspan]="esAdmin ? 7 : 6"><div class="empty-state"><span>▤</span><strong>No encontramos productos</strong><small>Ajusta tus filtros o agrega un producto al inventario.</small></div></td></tr>
        </tbody>
      </table>
    </app-data-table>

    <app-modal [abierto]="modalAbierto" [titulo]="productoEditando ? 'Editar producto' : 'Agregar producto'" (cerrado)="cerrarModal()">
      <form class="form-stack modal-form" [formGroup]="formulario" (ngSubmit)="guardar()">
        <div class="form-grid">
          <label class="field"><span>Nombre</span><input formControlName="nombre" placeholder="Nombre del producto" /><small *ngIf="invalido('nombre')">El nombre es obligatorio.</small></label>
          <label class="field"><span>Código</span><input formControlName="codigo" placeholder="SKU-001" /><small *ngIf="invalido('codigo')">El código es obligatorio.</small></label>
          <label class="field"><span>Categoría</span><select formControlName="categoria_id"><option value="">Selecciona una categoría</option><option *ngFor="let categoria of categorias" [value]="categoria.id">{{ categoria.nombre }}</option></select><small *ngIf="formulario.controls.categoria_id.touched && formulario.controls.categoria_id.invalid">Selecciona una categoría.</small></label>
          <label class="field"><span>Proveedor</span><select formControlName="proveedor_id"><option value="">Selecciona un proveedor</option><option *ngFor="let proveedor of proveedores" [value]="proveedor.id">{{ proveedor.nombre }}</option></select><small *ngIf="formulario.controls.proveedor_id.touched && formulario.controls.proveedor_id.invalid">Selecciona un proveedor.</small></label>
          <label class="field"><span>Precio de compra ($)</span><input type="number" min="0.01" step="0.01" formControlName="precio_compra" /><small *ngIf="formulario.controls.precio_compra.touched && formulario.controls.precio_compra.invalid">El precio debe ser mayor que cero.</small></label>
          <label class="field"><span>Precio de venta ($)</span><input type="number" min="0.01" step="0.01" formControlName="precio_venta" /><small *ngIf="formulario.controls.precio_venta.touched && formulario.controls.precio_venta.invalid">El precio debe ser mayor que cero.</small></label>
          <label class="field"><span>Cantidad</span><input type="number" min="0" step="0.01" formControlName="cantidad" /><small *ngIf="formulario.controls.cantidad.touched && formulario.controls.cantidad.invalid">La cantidad no puede ser negativa.</small></label>
          <label class="field"><span>Unidad</span><input formControlName="unidad" placeholder="unidad" /><small *ngIf="formulario.controls.unidad.touched && formulario.controls.unidad.invalid">La unidad es obligatoria.</small></label>
          <label class="field"><span>Límite mínimo</span><input type="number" min="0" step="0.01" formControlName="limite_minimo" /><small *ngIf="formulario.controls.limite_minimo.touched && formulario.controls.limite_minimo.invalid">El límite no puede ser negativo.</small></label>
          <label class="field"><span>Fecha de caducidad</span><input type="date" formControlName="fecha_caducidad" /></label>
        </div>
        <div class="form-error" *ngIf="errorGuardar">{{ errorGuardar }}</div>
        <div class="modal-actions"><button class="button button-outline" type="button" (click)="cerrarModal()">Cancelar</button><button class="button button-primary" type="submit" [disabled]="guardando">{{ guardando ? 'Guardando…' : productoEditando ? 'Guardar cambios' : 'Crear producto' }}</button></div>
      </form>
    </app-modal>
  `
})
export class InventarioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  productos: Producto[] = [];
  categorias: Categoria[] = [];
  proveedores: Proveedor[] = [];
  bajoStock: Producto[] = [];
  porCaducar: Producto[] = [];
  paginacion: Paginacion = { page: 1, limit: 10, total: 0, total_pages: 0 };
  pagina = 1;
  busqueda = '';
  categoriaId = '';
  estado = '';
  modalAbierto = false;
  guardando = false;
  cargandoTabla = true;
  cargandoResumen = true;
  errorCarga = '';
  errorResumen = '';
  errorGuardar = '';
  productoEditando: Producto | null = null;
  readonly moneda = moneda;
  readonly numero = numero;
  readonly fechaLocal = fechaLocal;
  private productosSubscription: Subscription | null = null;
  private resumenSubscription: Subscription | null = null;
  readonly esAdmin: boolean;
  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    codigo: ['', Validators.required],
    categoria_id: ['', Validators.required],
    proveedor_id: ['', Validators.required],
    precio_compra: [0, [Validators.required, Validators.min(0.01)]],
    precio_venta: [0, [Validators.required, Validators.min(0.01)]],
    cantidad: [0, [Validators.required, Validators.min(0)]],
    unidad: ['unidad', Validators.required],
    limite_minimo: [0, [Validators.required, Validators.min(0)]],
    fecha_caducidad: [''],
    estado_registro: ['activo' as 'activo' | 'inactivo']
  });

  constructor(
    private readonly route: ActivatedRoute,
    auth: AuthService,
    private readonly productosApi: ProductoService,
    private readonly categoriasApi: CategoriaService,
    private readonly proveedoresApi: ProveedorService,
    private readonly toast: ToastService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly notificaciones: NotificationService
  ) {
    this.esAdmin = auth.tieneRol('admin');
  }

  ngOnInit(): void {
    subscribeWithChangeDetection(this.categoriasApi.listar(), this.changeDetector, {
      next: ({ categorias }) => {
        this.categorias = categorias;
      }
    });
    subscribeWithChangeDetection(this.proveedoresApi.listar(), this.changeDetector, {
      next: ({ proveedores }) => {
        this.proveedores = proveedores;
      }
    });
    this.cargarResumen();
    this.route.queryParamMap.subscribe((params) => {
      const termino = params.get('busqueda');
      if (termino !== null) this.busqueda = termino;
      this.pagina = 1;
      this.cargar();
      this.changeDetector.detectChanges();
    });
  }

  cargar(): void {
    this.productosSubscription?.unsubscribe();
    this.cargandoTabla = true;
    this.errorCarga = '';
    this.productos = [];
    this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
    this.changeDetector.markForCheck();
    this.productosSubscription = subscribeWithChangeDetection(this.productosApi.listar({
      page: this.pagina,
      limit: 10,
      busqueda: this.busqueda.trim() || undefined,
      categoria_id: this.categoriaId || undefined,
      estado: this.estado || undefined
    }).pipe(finalize(() => this.cargandoTabla = false)), this.changeDetector, {
      next: (respuesta) => {
        this.productos = respuesta.productos;
        this.paginacion = respuesta.paginacion;
      },
      error: () => {
        this.productos = [];
        this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
        this.errorCarga = 'Verifica tu conexión y vuelve a intentarlo.';
      }
    });
  }

  private cargarResumen(): void {
    this.resumenSubscription?.unsubscribe();
    this.cargandoResumen = true;
    this.errorResumen = '';
    this.bajoStock = [];
    this.porCaducar = [];
    this.changeDetector.markForCheck();
    this.resumenSubscription = subscribeWithChangeDetection(forkJoin({
      bajoStock: this.productosApi.bajoStock(),
      porCaducar: this.productosApi.porCaducar()
    }).pipe(finalize(() => this.cargandoResumen = false)), this.changeDetector, {
      next: ({ bajoStock, porCaducar }) => {
        this.bajoStock = bajoStock.productos;
        this.porCaducar = porCaducar.productos;
      },
      error: () => {
        this.bajoStock = [];
        this.porCaducar = [];
        this.errorResumen = 'No se pudieron cargar los indicadores de inventario. Intenta actualizar la pantalla.';
      }
    });
  }

  buscar(evento: Event): void {
    evento.preventDefault();
    this.pagina = 1;
    this.cargar();
  }

  cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  abrirNuevo(): void {
    this.productoEditando = null;
    this.errorGuardar = '';
    this.formulario.reset({
      nombre: '', codigo: '', categoria_id: '', proveedor_id: '', precio_compra: 0,
      precio_venta: 0, cantidad: 0, unidad: 'unidad', limite_minimo: 0,
      fecha_caducidad: '', estado_registro: 'activo'
    });
    this.modalAbierto = true;
  }

  editar(producto: Producto): void {
    this.productoEditando = producto;
    this.errorGuardar = '';
    this.formulario.reset({
      nombre: producto.nombre,
      codigo: producto.codigo,
      categoria_id: producto.categoria_id,
      proveedor_id: producto.proveedor_id,
      precio_compra: Number(producto.precio_compra),
      precio_venta: Number(producto.precio_venta),
      cantidad: Number(producto.cantidad),
      unidad: producto.unidad,
      limite_minimo: Number(producto.limite_minimo),
      fecha_caducidad: producto.fecha_caducidad ?? '',
      estado_registro: producto.estado_registro
    });
    this.modalAbierto = true;
  }

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: ProductoInput = {
      ...valores,
      categoria_id: Number(valores.categoria_id),
      proveedor_id: Number(valores.proveedor_id),
      fecha_caducidad: valores.fecha_caducidad || null
    };
    this.guardando = true;
    this.errorGuardar = '';
    const peticion = this.productoEditando
      ? this.productosApi.actualizar(this.productoEditando.id, {
        ...datos,
        cantidad_original: Number(this.productoEditando.cantidad)
      } satisfies ProductoActualizacionInput)
      : this.productosApi.crear(datos);
    subscribeWithChangeDetection(peticion.pipe(finalize(() => {
      this.guardando = false;
    })), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cerrarModal();
        this.cargar();
        this.cargarResumen();
        this.notificaciones.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.errorGuardar = error.error?.error ?? 'No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.';
      }
    });
  }

  eliminar(producto: Producto): void {
    if (!window.confirm(`¿Eliminar el producto "${producto.nombre}"?`)) return;
    subscribeWithChangeDetection(this.productosApi.eliminar(producto.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        if (this.productos.length === 1 && this.pagina > 1) this.pagina -= 1;
        this.cargar();
        this.cargarResumen();
        this.notificaciones.cargar();
      }
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  invalido(campo: 'nombre' | 'codigo'): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }
}
