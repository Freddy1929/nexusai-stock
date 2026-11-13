import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PedidoService, ProductoService, ProveedorService } from '../../core/services/entity-api.services';
import { Pedido, Producto, Proveedor, Paginacion } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { BadgeComponent, DataTableComponent, ModalComponent } from '../../shared/ui.components';
import { fechaLocal, moneda, numero } from '../../shared/formatters';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, BadgeComponent, DataTableComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">ABASTECIMIENTO</span><h1>Pedidos</h1><p>Gestiona órdenes de compra y recepción de productos.</p></div>
      <button *ngIf="esAdmin" class="button button-primary" type="button" (click)="nuevo()">＋ Crear pedido</button>
    </div>
    <app-data-table [pagina]="paginacion.page" [totalPaginas]="paginacion.total_pages" (paginaChange)="cambiarPagina($event)">
      <div table-toolbar class="table-toolbar"><div><h2 class="section-title">Órdenes de compra</h2><p class="section-subtitle">{{ cargando ? 'Cargando pedidos…' : errorCarga ? 'No se pudo consultar la lista' : paginacion.total + (paginacion.total === 1 ? ' pedido registrado' : ' pedidos registrados') }}</p></div><button *ngIf="errorCarga" class="button button-outline button-small" type="button" (click)="cargar()">Reintentar</button></div>
      <table><thead><tr><th>N.º pedido</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargando && !errorCarga">
            <tr *ngFor="let pedido of pedidos">
              <td><strong class="order-number">PED-{{ pedido.id }}</strong></td><td>{{ pedido.proveedor_nombre }}</td><td>{{ fechaLocal(pedido.fecha) }}</td><td>{{ moneda(pedido.total) }}</td>
              <td><app-badge [texto]="etiquetaEstado(pedido.estado)" [clase]="claseEstado(pedido.estado)"></app-badge></td>
              <td><div class="row-actions"><button type="button" class="text-action" (click)="verDetalle(pedido)">Ver detalle</button>
                <ng-container *ngIf="esAdmin && pedido.estado === 'pendiente'"><button type="button" class="text-action" (click)="recibir(pedido)">Recibir</button><button type="button" class="text-action danger-action" (click)="cancelar(pedido)">Cancelar</button></ng-container>
              </div></td>
            </tr>
          </ng-container>
          <tr *ngIf="cargando"><td colspan="6"><div class="empty-state"><strong>Cargando pedidos…</strong></div></td></tr>
          <tr *ngIf="!cargando && errorCarga"><td colspan="6"><div class="empty-state"><strong>No se pudieron cargar los pedidos</strong><small>{{ errorCarga }}</small></div></td></tr>
          <tr *ngIf="!cargando && !errorCarga && !pedidos.length"><td colspan="6"><div class="empty-state"><span>▣</span><strong>La API respondió sin pedidos</strong><small>Las órdenes de compra aparecerán aquí cuando registres la primera.</small></div></td></tr>
        </tbody>
      </table>
    </app-data-table>

    <app-modal [abierto]="crearAbierto" titulo="Crear pedido" (cerrado)="crearAbierto = false">
      <form class="form-stack modal-form" [formGroup]="formulario" (ngSubmit)="crear()">
        <label class="field"><span>Proveedor</span><select formControlName="proveedor_id"><option value="">Selecciona un proveedor</option><option *ngFor="let proveedor of proveedores" [value]="proveedor.id">{{ proveedor.nombre }}</option></select><small *ngIf="formulario.controls.proveedor_id.touched && formulario.controls.proveedor_id.invalid">Selecciona un proveedor.</small></label>
        <div class="line-items-heading"><div><h3>Productos del pedido</h3><p>El costo se registra por unidad.</p></div><button class="button button-outline button-small" type="button" (click)="agregarItem()">＋ Agregar producto</button></div>
        <div formArrayName="items" class="line-items">
          <div class="line-item-row" *ngFor="let item of items.controls; let indice = index" [formGroupName]="indice">
            <label class="field"><span>Producto</span><select formControlName="producto_id"><option value="">Selecciona un producto</option><option *ngFor="let producto of productosCatalogo" [value]="producto.id">{{ producto.nombre }} · {{ producto.codigo }}</option></select><small *ngIf="item.get('producto_id')?.touched && item.get('producto_id')?.invalid">Selecciona un producto.</small></label>
            <label class="field"><span>Cantidad</span><input type="number" min="0.01" step="0.01" formControlName="cantidad" /><small *ngIf="item.get('cantidad')?.touched && item.get('cantidad')?.invalid">Ingresa una cantidad mayor que cero.</small></label>
            <label class="field"><span>Costo unitario ($)</span><input type="number" min="0" step="0.01" formControlName="costo_unitario" /><small *ngIf="item.get('costo_unitario')?.touched && item.get('costo_unitario')?.invalid">El costo no puede ser negativo.</small></label>
            <button type="button" class="remove-line" aria-label="Quitar producto" [disabled]="items.length === 1" (click)="quitarItem(indice)">×</button>
          </div>
        </div>
        <div class="modal-actions"><button class="button button-outline" type="button" (click)="crearAbierto = false">Cancelar</button><button class="button button-primary" type="submit" [disabled]="guardando">{{ guardando ? 'Creando…' : 'Crear pedido' }}</button></div>
      </form>
    </app-modal>

    <app-modal [abierto]="detalleAbierto" [titulo]="pedidoDetalle ? 'Detalle del pedido PED-' + pedidoDetalle.id : 'Detalle del pedido'" (cerrado)="detalleAbierto = false">
      <div class="detail-body" *ngIf="pedidoDetalle">
        <div class="detail-summary"><div><small>Proveedor</small><strong>{{ pedidoDetalle.proveedor_nombre }}</strong></div><div><small>Fecha</small><strong>{{ fechaLocal(pedidoDetalle.fecha) }}</strong></div><div><small>Estado</small><app-badge [texto]="etiquetaEstado(pedidoDetalle.estado)" [clase]="claseEstado(pedidoDetalle.estado)"></app-badge></div></div>
        <div class="table-scroll"><table><thead><tr><th>Producto</th><th>Código</th><th>Cantidad</th><th>Costo unitario</th></tr></thead><tbody><tr *ngFor="let item of pedidoDetalle.items"><td>{{ item.producto_nombre }}</td><td>{{ item.codigo }}</td><td>{{ numero(item.cantidad) }}</td><td>{{ moneda(item.costo_unitario) }}</td></tr></tbody></table></div>
        <div class="detail-total"><span>Total</span><strong>{{ moneda(pedidoDetalle.total) }}</strong></div>
      </div>
    </app-modal>
  `
})
export class PedidosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  pedidos: Pedido[] = [];
  proveedores: Proveedor[] = [];
  productosCatalogo: Producto[] = [];
  paginacion: Paginacion = { page: 1, limit: 10, total: 0, total_pages: 0 };
  pagina = 1;
  crearAbierto = false;
  detalleAbierto = false;
  guardando = false;
  cargando = true;
  errorCarga = '';
  pedidoDetalle: Pedido | null = null;
  readonly esAdmin: boolean;
  readonly moneda = moneda;
  readonly numero = numero;
  readonly fechaLocal = fechaLocal;
  private pedidosSubscription: Subscription | null = null;
  readonly formulario = this.fb.group({
    proveedor_id: this.fb.nonNullable.control('', Validators.required),
    items: this.fb.array([this.nuevoItem()])
  });

  constructor(
    private readonly pedidosApi: PedidoService,
    private readonly proveedoresApi: ProveedorService,
    private readonly productosApi: ProductoService,
    private readonly toast: ToastService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly notificaciones: NotificationService,
    auth: AuthService
  ) {
    this.esAdmin = auth.tieneRol('admin');
  }

  get items(): FormArray {
    return this.formulario.controls.items;
  }

  ngOnInit(): void {
    this.cargar();
    subscribeWithChangeDetection(this.proveedoresApi.listar(), this.changeDetector, {
      next: ({ proveedores }) => this.proveedores = proveedores
    });
    subscribeWithChangeDetection(this.productosApi.listar({ page: 1, limit: 100 }), this.changeDetector, {
      next: ({ productos }) => this.productosCatalogo = productos
    });
  }

  cargar(): void {
    this.pedidosSubscription?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';
    this.pedidos = [];
    this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
    this.changeDetector.markForCheck();
    this.pedidosSubscription = subscribeWithChangeDetection(this.pedidosApi.listar(this.pagina, 10).pipe(finalize(() => this.cargando = false)), this.changeDetector, {
      next: (respuesta) => {
        this.pedidos = respuesta.pedidos;
        this.paginacion = respuesta.paginacion;
      },
      error: () => {
        this.pedidos = [];
        this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
        this.errorCarga = 'Verifica la conexión con la API y vuelve a intentarlo.';
      }
    });
  }

  cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  nuevo(): void {
    this.formulario.reset({ proveedor_id: '' });
    this.items.clear();
    this.items.push(this.nuevoItem());
    this.crearAbierto = true;
  }

  agregarItem(): void {
    this.items.push(this.nuevoItem());
  }

  quitarItem(indice: number): void {
    if (this.items.length > 1) this.items.removeAt(indice);
  }

  crear(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    this.guardando = true;
    subscribeWithChangeDetection(this.pedidosApi.crear({
      proveedor_id: Number(valores.proveedor_id),
      items: valores.items.map((item) => ({
        producto_id: Number(item['producto_id']),
        cantidad: Number(item['cantidad']),
        costo_unitario: Number(item['costo_unitario'])
      }))
    }).pipe(finalize(() => this.guardando = false)), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.crearAbierto = false;
        this.cargar();
      }
    });
  }

  verDetalle(pedido: Pedido): void {
    this.pedidoDetalle = pedido;
    this.detalleAbierto = true;
    subscribeWithChangeDetection(this.pedidosApi.obtener(pedido.id), this.changeDetector, {
      next: ({ pedido: detalle }) => this.pedidoDetalle = detalle
    });
  }

  recibir(pedido: Pedido): void {
    if (!window.confirm(`¿Marcar el pedido PED-${pedido.id} como recibido? Se actualizará el stock.`)) return;
    subscribeWithChangeDetection(this.pedidosApi.recibir(pedido.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cargar();
        this.notificaciones.cargar();
      }
    });
  }

  cancelar(pedido: Pedido): void {
    if (!window.confirm(`¿Cancelar el pedido PED-${pedido.id}?`)) return;
    subscribeWithChangeDetection(this.pedidosApi.cancelar(pedido.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cargar();
      }
    });
  }

  etiquetaEstado(estado: Pedido['estado']): string {
    return estado === 'pendiente' ? 'Pendiente' : estado === 'recibido' ? 'Recibido' : 'Cancelado';
  }

  claseEstado(estado: Pedido['estado']): string {
    return estado === 'pendiente' ? 'badge-warning' : estado === 'recibido' ? 'badge-success' : 'badge-danger';
  }

  private nuevoItem(): FormGroup {
    return this.fb.nonNullable.group({
      producto_id: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      costo_unitario: [0, [Validators.required, Validators.min(0)]]
    });
  }
}
