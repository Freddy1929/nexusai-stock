import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService, FacturaService, ProductoService, VentaService } from '../../core/services/entity-api.services';
import { Cliente, ClienteInput, EstadoSri, Factura, FormaPagoSri, Paginacion, Producto, Venta } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { BadgeComponent, DataTableComponent, ModalComponent } from '../../shared/ui.components';
import { fechaLocal, moneda, numero } from '../../shared/formatters';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, BadgeComponent, DataTableComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">VENTAS Y COMPROBANTES</span><h1>Facturación</h1><p>Registra ventas y consulta el historial de transacciones.</p></div>
      <button class="button button-primary" type="button" (click)="nuevaVenta()">＋ Registrar venta</button>
    </div>
    <div class="invoice-highlight" *ngIf="ventaCreada">
      <div><span class="invoice-check">✓</span><div><strong>Venta registrada correctamente · N.º {{ ventaCreada.id }}</strong><small>Los totales fueron calculados por el servidor.</small></div></div>
      <div class="invoice-total"><span>Subtotal {{ moneda(ventaCreada.subtotal) }}</span><span>IVA {{ moneda(ventaCreada.iva) }}</span><strong>Total {{ moneda(ventaCreada.total) }}</strong></div>
      <small>La factura puede emitirse desde el historial de ventas.</small>
    </div>
    <app-data-table [pagina]="paginacion.page" [totalPaginas]="paginacion.total_pages" (paginaChange)="cambiarPagina($event)">
      <div table-toolbar class="table-toolbar"><div><h2 class="section-title">Historial de ventas</h2><p class="section-subtitle">{{ cargandoVentas ? 'Cargando ventas…' : errorVentas ? 'No se pudo consultar la lista' : paginacion.total + (paginacion.total === 1 ? ' venta registrada' : ' ventas registradas') }}</p></div><div class="row-actions"><button *ngIf="errorVentas" class="button button-outline button-small" type="button" (click)="cargarVentas()">Reintentar</button></div></div>
      <table><thead><tr><th>N.º venta</th><th>Cliente</th><th>Fecha</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Estado</th><th>Factura</th><th>Acciones</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargandoVentas && !errorVentas">
            <tr *ngFor="let venta of ventas">
              <td><strong class="order-number">VTA-{{ venta.id }}</strong></td><td>{{ venta.cliente_nombre || 'Consumidor Final' }}</td><td>{{ fechaLocal(venta.fecha) }}</td><td>{{ moneda(venta.subtotal) }}</td><td>{{ moneda(venta.iva) }}</td><td><strong>{{ moneda(venta.total) }}</strong></td>
              <td><app-badge [texto]="etiquetaEstado(venta.estado)" [clase]="venta.estado === 'anulada' ? 'badge-danger' : 'badge-success'"></app-badge></td>
              <td>
                <span [attr.title]="esAdmin ? detalleTecnicoFactura(venta) : null"><app-badge [texto]="estadoFactura(venta)" [clase]="claseFactura(venta)"></app-badge></span>
                <span [attr.title]="venta.factura?.mensaje_sri || null"><app-badge [texto]="etiquetaEstadoSri(venta.factura?.estado_sri || 'sin_xml')" [clase]="claseEstadoSri(venta.factura?.estado_sri || 'sin_xml')"></app-badge></span>
                <small *ngIf="!esAdmin && (venta.factura?.correo_configurado === false || venta.factura?.estado === 'error')">Envío por correo no disponible por ahora</small>
                <small *ngIf="venta.factura">{{ venta.factura.numero }}</small>
              </td>
              <td><div class="row-actions">
                <button class="text-action" type="button" [disabled]="venta.estado === 'anulada' || venta.factura?.email_enviado || facturaEnProcesoId === venta.id" (click)="emitirYEnviar(venta)">
                  {{ facturaEnProcesoId === venta.id ? 'Procesando…' : venta.factura?.email_enviado ? 'Correo enviado' : venta.factura?.email_error ? 'Reintentar envío' : venta.factura ? 'Enviar correo' : 'Emitir y enviar' }}
                </button>
                <button class="text-action" type="button" [disabled]="!venta.factura || descargandoFacturaId === venta.id" (click)="descargarPdf(venta)">
                  {{ descargandoFacturaId === venta.id ? 'Descargando…' : 'Descargar PDF' }}
                </button>
                <button class="text-action" type="button" *ngIf="venta.factura" (click)="verDetalleFactura(venta.factura.id)">Detalle</button>
                <button class="text-action" type="button" *ngIf="venta.factura?.estado_sri === 'xml_generado' || venta.factura?.estado_sri === 'firmado' || venta.factura?.estado_sri === 'enviado' || venta.factura?.estado_sri === 'autorizado' || venta.factura?.estado_sri === 'rechazado'" [disabled]="descargandoFacturaId === venta.id" (click)="descargarXml(venta)">
                  {{ descargandoFacturaId === venta.id ? 'Descargando…' : 'Descargar XML' }}
                </button>
                <button *ngIf="esAdmin && venta.estado !== 'anulada'" type="button" class="text-action danger-action" (click)="anular(venta)">Anular</button>
              </div></td>
            </tr>
          </ng-container>
          <tr *ngIf="cargandoVentas"><td colspan="9"><div class="empty-state"><strong>Cargando ventas…</strong></div></td></tr>
          <tr *ngIf="!cargandoVentas && errorVentas"><td colspan="9"><div class="empty-state"><strong>No se pudo cargar el historial de ventas</strong><small>{{ errorVentas }}</small></div></td></tr>
          <tr *ngIf="!cargandoVentas && !errorVentas && !ventas.length"><td colspan="9"><div class="empty-state"><span>▧</span><strong>La API respondió sin ventas</strong><small>Registra una venta para iniciar el historial.</small></div></td></tr>
        </tbody>
      </table>
    </app-data-table>

    <app-modal [abierto]="modalAbierto" titulo="Registrar una venta" (cerrado)="modalAbierto = false">
      <form class="form-stack modal-form" [formGroup]="formulario" (ngSubmit)="registrar()">
        <div class="customer-lookup">
          <label class="field"><span>Identificación del cliente</span><input [value]="identificacion" (input)="actualizarIdentificacion($event)" placeholder="Cédula, RUC o pasaporte" /></label>
          <div class="row-actions">
            <button class="button button-outline lookup-button" type="button" (click)="buscarCliente()" [disabled]="buscandoCliente">{{ buscandoCliente ? 'Buscando…' : 'Buscar cliente' }}</button>
            <button class="button button-outline lookup-button" type="button" (click)="iniciarCreacionCliente()">Crear cliente</button>
          </div>
        </div>
        <div *ngIf="cliente" class="customer-found"><span class="customer-check">✓</span><div><strong>{{ cliente.nombre }}</strong><small>{{ cliente.identificacion }} · {{ cliente.tipo_identificacion }}</small></div><button type="button" class="text-action" (click)="limpiarCliente()">Cambiar</button></div>
        <div *ngIf="mensajeCliente" class="form-error">{{ mensajeCliente }}</div>
        <section class="customer-create form-stack" *ngIf="crearClienteAbierto" [formGroup]="clienteFormulario">
          <h3>Nuevo cliente</h3>
          <div class="form-grid">
            <label class="field"><span>Tipo de identificación</span><select formControlName="tipo_identificacion"><option value="cedula">Cédula</option><option value="ruc">RUC</option><option value="pasaporte">Pasaporte</option></select></label>
            <label class="field"><span>Identificación</span><input formControlName="identificacion" maxlength="20" /><small *ngIf="clienteFormulario.controls.identificacion.touched && clienteFormulario.controls.identificacion.invalid">La identificación es obligatoria.</small></label>
            <label class="field field-full"><span>Nombre</span><input formControlName="nombre" maxlength="160" /><small *ngIf="clienteFormulario.controls.nombre.touched && clienteFormulario.controls.nombre.invalid">El nombre es obligatorio.</small></label>
            <label class="field"><span>Correo electrónico</span><input type="email" formControlName="email" /><small *ngIf="clienteFormulario.controls.email.touched && clienteFormulario.controls.email.invalid">Ingresa un correo válido.</small></label>
            <label class="field"><span>Teléfono</span><input formControlName="telefono" maxlength="30" /></label>
            <label class="field field-full"><span>Dirección</span><textarea rows="2" formControlName="direccion"></textarea></label>
          </div>
          <div class="form-error" *ngIf="errorCrearCliente">{{ errorCrearCliente }}</div>
          <div class="row-actions"><button class="button button-outline button-small" type="button" (click)="crearClienteAbierto = false">Cancelar</button><button class="button button-primary button-small" type="button" [disabled]="guardandoCliente" (click)="crearClienteDesdeVenta()">{{ guardandoCliente ? 'Guardando…' : 'Guardar y seleccionar' }}</button></div>
        </section>
        <div class="line-items-heading"><div><h3>Productos</h3><p>Agrega los productos y cantidades de esta venta.</p></div><button class="button button-outline button-small" type="button" (click)="agregarItem()">＋ Agregar producto</button></div>
        <div formArrayName="items" class="line-items">
          <div class="line-item-row sale-line" *ngFor="let item of items.controls; let indice = index" [formGroupName]="indice">
            <label class="field"><span>Producto</span><select formControlName="producto_id"><option value="">Selecciona un producto</option><option *ngFor="let producto of productosCatalogo" [value]="producto.id">{{ producto.nombre }} · {{ moneda(producto.precio_venta) }} · Stock {{ numero(producto.cantidad) }}</option></select></label>
            <label class="field"><span>Cantidad</span><input type="number" min="0.01" step="0.01" [max]="stockDisponible(item)" formControlName="cantidad" /><small *ngIf="cantidadMayorAStock(item)">Supera el stock disponible ({{ numero(stockDisponible(item)) }}).</small></label>
            <span class="line-subtotal">{{ moneda(subtotalLinea(item)) }}</span>
            <button type="button" class="remove-line" aria-label="Quitar producto" [disabled]="items.length === 1" (click)="quitarItem(indice)">×</button>
          </div>
        </div>
        <label class="field"><span>Forma de pago</span>
          <select formControlName="forma_pago">
            <option *ngFor="let forma of formasPago" [value]="forma.codigo">{{ forma.codigo }} · {{ forma.nombre }}</option>
          </select>
        </label>
        <div class="sale-totals"><div><small>Subtotal referencial</small><strong>{{ moneda(subtotalEstimado) }}</strong></div><p>El backend calculará el subtotal, el IVA y el total definitivos al registrar la venta.</p></div>
        <small class="form-hint" *ngIf="!cliente">Busca un cliente o crea uno para habilitar el registro de la venta.</small>
        <small class="form-hint" *ngIf="cliente && formulario.invalid">Selecciona al menos un producto y completa cantidades válidas.</small>
        <small class="form-error" *ngIf="!ventaTieneStockDisponible">La cantidad de uno o más productos supera el stock disponible.</small>
        <div class="modal-actions"><button class="button button-outline" type="button" (click)="modalAbierto = false">Cancelar</button><button class="button button-primary" type="submit" [disabled]="guardando || !cliente || formulario.invalid || !ventaTieneStockDisponible">{{ guardando ? 'Registrando…' : 'Registrar venta' }}</button></div>
      </form>
    </app-modal>

    <app-modal [abierto]="detalleFacturaAbierto" titulo="Detalle de factura SRI" (cerrado)="cerrarDetalleFactura()">
      <div class="form-stack" *ngIf="facturaDetalle">
        <div><strong>Factura {{ facturaDetalle.numero }}</strong><p>Estado SRI: {{ etiquetaEstadoSri(facturaDetalle.estado_sri) }}</p></div>
        <div class="invoice-sri-detail">
          <span>Clave de acceso</span>
          <code>{{ facturaDetalle.estado_sri === 'sin_xml' || facturaDetalle.estado_sri === 'error' ? 'Aún no disponible' : facturaDetalle.clave_acceso || 'Aún no generada' }}</code>
          <span>Ambiente</span>
          <strong>{{ facturaDetalle.ambiente === '2' ? 'PRODUCCIÓN' : facturaDetalle.ambiente === '1' ? 'PRUEBAS' : 'No definido' }}</strong>
          <span>Mensaje</span>
          <strong>{{ facturaDetalle.mensaje_sri || 'No hay mensajes SRI.' }}</strong>
        </div>
        <div class="modal-actions">
          <button *ngIf="esAdmin && puedeRegenerarXml(facturaDetalle)" class="button button-outline" type="button" [disabled]="regenerandoXml" (click)="regenerarXml(facturaDetalle.id)">{{ regenerandoXml ? 'Regenerando…' : 'Regenerar XML' }}</button>
          <button class="button button-outline" type="button" (click)="cerrarDetalleFactura()">Cerrar</button>
          <button class="button button-primary" type="button" *ngIf="facturaDetalle.xml_path" (click)="descargarXmlDesdeDetalle()">Descargar XML</button>
        </div>
      </div>
      <div class="empty-state" *ngIf="cargandoDetalleFactura"><strong>Cargando detalle…</strong></div>
    </app-modal>
  `
})
export class FacturacionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  ventas: Venta[] = [];
  productosCatalogo: Producto[] = [];
  paginacion: Paginacion = { page: 1, limit: 10, total: 0, total_pages: 0 };
  pagina = 1;
  modalAbierto = false;
  guardando = false;
  cargandoVentas = true;
  errorVentas = '';
  buscandoCliente = false;
  guardandoCliente = false;
  crearClienteAbierto = false;
  errorCrearCliente = '';
  identificacion = '';
  cliente: Cliente | null = null;
  ventaCreada: Venta | null = null;
  mensajeCliente = '';
  readonly moneda = moneda;
  readonly numero = numero;
  readonly fechaLocal = fechaLocal;
  private ventasSubscription: Subscription | null = null;
  facturaEnProcesoId: string | null = null;
  descargandoFacturaId: string | null = null;
  facturaDetalle: Factura | null = null;
  detalleFacturaAbierto = false;
  cargandoDetalleFactura = false;
  regenerandoXml = false;
  readonly esAdmin: boolean;
  readonly formulario = this.fb.group({
    forma_pago: this.fb.nonNullable.control<FormaPagoSri>('01', Validators.required),
    items: this.fb.array([this.nuevoItem()])
  });
  readonly formasPago: Array<{ codigo: FormaPagoSri; nombre: string }> = [
    { codigo: '01', nombre: 'Sin utilización del sistema financiero' },
    { codigo: '15', nombre: 'Compensación de deudas' },
    { codigo: '16', nombre: 'Tarjeta de débito' },
    { codigo: '17', nombre: 'Dinero electrónico' },
    { codigo: '18', nombre: 'Tarjeta prepago' },
    { codigo: '19', nombre: 'Tarjeta de crédito' },
    { codigo: '20', nombre: 'Otros con utilización del sistema financiero' },
    { codigo: '21', nombre: 'Endoso de títulos' }
  ];
  readonly clienteFormulario = this.fb.nonNullable.group({
    tipo_identificacion: this.fb.nonNullable.control<Cliente['tipo_identificacion']>('cedula', Validators.required),
    identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', Validators.email],
    telefono: ['', Validators.maxLength(30)],
    direccion: ['']
  });

  constructor(
    private readonly clientesApi: ClienteService,
    private readonly productosApi: ProductoService,
    private readonly ventasApi: VentaService,
    private readonly facturasApi: FacturaService,
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

  get subtotalEstimado(): number {
    return this.items.controls.reduce((total, item) => total + this.subtotalLinea(item), 0);
  }

  get ventaTieneStockDisponible(): boolean {
    return this.items.controls.every((item) => !this.cantidadMayorAStock(item));
  }

  ngOnInit(): void {
    this.cargarVentas();
    subscribeWithChangeDetection(this.productosApi.listar({ page: 1, limit: 100 }), this.changeDetector, {
      next: ({ productos }) => this.productosCatalogo = productos
    });
  }

  cargarVentas(): void {
    this.ventasSubscription?.unsubscribe();
    this.cargandoVentas = true;
    this.errorVentas = '';
    this.ventas = [];
    this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
    this.changeDetector.markForCheck();
    this.ventasSubscription = subscribeWithChangeDetection(this.ventasApi.listar(this.pagina, 10).pipe(finalize(() => this.cargandoVentas = false)), this.changeDetector, {
      next: (respuesta) => {
        this.ventas = respuesta.ventas;
        this.paginacion = respuesta.paginacion;
      },
      error: () => {
        this.ventas = [];
        this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
        this.errorVentas = 'Verifica la conexión con la API y vuelve a intentarlo.';
      }
    });
  }

  cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargarVentas();
  }

  nuevaVenta(): void {
    this.ventaCreada = null;
    this.identificacion = '';
    this.cliente = null;
    this.mensajeCliente = '';
    this.crearClienteAbierto = false;
    this.errorCrearCliente = '';
    this.formulario.reset({ forma_pago: '01' });
    this.items.clear();
    this.items.push(this.nuevoItem());
    this.modalAbierto = true;
  }

  actualizarIdentificacion(evento: Event): void {
    this.identificacion = (evento.target as HTMLInputElement).value;
    this.mensajeCliente = '';
    this.cliente = null;
  }

  buscarCliente(): void {
    const identificacion = this.identificacion.trim();
    if (!identificacion) {
      this.mensajeCliente = 'Escribe la identificación del cliente.';
      return;
    }

    this.buscandoCliente = true;
    this.mensajeCliente = '';
    subscribeWithChangeDetection(
      this.clientesApi.buscarPorIdentificacion(identificacion).pipe(finalize(() => this.buscandoCliente = false)),
      this.changeDetector,
      {
        next: ({ cliente }) => this.cliente = cliente,
        error: (error: { error?: { error?: string } }) => {
          this.cliente = null;
          this.mensajeCliente = error.error?.error ?? 'No se encontró un cliente con esa identificación.';
        }
      }
    );
  }

  limpiarCliente(): void {
    this.cliente = null;
    this.identificacion = '';
  }

  iniciarCreacionCliente(): void {
    this.errorCrearCliente = '';
    this.clienteFormulario.reset({
      tipo_identificacion: 'cedula',
      identificacion: this.identificacion.trim(),
      nombre: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    this.crearClienteAbierto = true;
  }

  crearClienteDesdeVenta(): void {
    if (this.clienteFormulario.invalid || this.guardandoCliente) {
      this.clienteFormulario.markAllAsTouched();
      return;
    }

    const valores = this.clienteFormulario.getRawValue();
    const datos: ClienteInput = {
      ...valores,
      identificacion: valores.identificacion.trim(),
      nombre: valores.nombre.trim(),
      email: valores.email.trim() || null,
      telefono: valores.telefono.trim() || null,
      direccion: valores.direccion.trim() || null
    };
    this.guardandoCliente = true;
    this.errorCrearCliente = '';
    subscribeWithChangeDetection(
      this.clientesApi.crear(datos).pipe(finalize(() => this.guardandoCliente = false)),
      this.changeDetector,
      {
        next: ({ cliente, mensaje }) => {
          this.cliente = cliente;
          this.identificacion = cliente.identificacion;
          this.crearClienteAbierto = false;
          this.toast.mostrar(mensaje, 'success');
        },
        error: (error: { error?: { error?: string } }) => {
          this.errorCrearCliente = error.error?.error ?? 'No se pudo crear el cliente. Revisa los datos e inténtalo de nuevo.';
        }
      }
    );
  }

  agregarItem(): void {
    this.items.push(this.nuevoItem());
  }

  quitarItem(indice: number): void {
    if (this.items.length > 1) this.items.removeAt(indice);
  }

  subtotalLinea(item: AbstractControl): number {
    const valor = item.getRawValue();
    const producto = this.productosCatalogo.find((fila) => fila.id === valor.producto_id);
    return Number(producto?.precio_venta ?? 0) * Number(valor.cantidad ?? 0);
  }

  stockDisponible(item: AbstractControl): number | null {
    const productoId = item.get('producto_id')?.value;
    if (!productoId) return null;
    const producto = this.productosCatalogo.find((fila) => fila.id === productoId);
    return producto ? Number(producto.cantidad) : null;
  }

  cantidadMayorAStock(item: AbstractControl): boolean {
    const stock = this.stockDisponible(item);
    const cantidad = Number(item.get('cantidad')?.value ?? 0);
    return stock !== null && cantidad > stock;
  }

  registrar(): void {
    if (!this.cliente || this.formulario.invalid || !this.ventaTieneStockDisponible || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const datos = {
      cliente_id: Number(this.cliente.id),
      forma_pago: this.formulario.controls.forma_pago.value,
      items: this.items.getRawValue().map((item) => ({
        producto_id: Number(item.producto_id),
        cantidad: Number(item.cantidad)
      }))
    };
    subscribeWithChangeDetection(this.ventasApi.crear(datos).pipe(finalize(() => this.guardando = false)), this.changeDetector, {
      next: ({ mensaje, venta }) => {
        this.toast.mostrar(mensaje, 'success');
        this.ventaCreada = venta;
        this.modalAbierto = false;
        this.pagina = 1;
        this.cargarVentas();
        this.notificaciones.cargar();
      }
    });
  }

  anular(venta: Venta): void {
    if (!window.confirm(`¿Anular la venta VTA-${venta.id}? El stock será devuelto.`)) return;
    subscribeWithChangeDetection(this.ventasApi.anular(venta.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cargarVentas();
        this.notificaciones.cargar();
      }
    });
  }

  etiquetaEstado(estado: Venta['estado']): string {
    return estado === 'anulada' ? 'Anulada' : estado === 'pagada' ? 'Pagada' : 'Pendiente';
  }

  estadoFactura(venta: Venta): string {
    if (venta.estado === 'anulada' || venta.factura?.estado === 'anulada') return 'Anulada';
    if (venta.factura?.email_enviado) return 'Enviado';
    if (venta.factura?.estado === 'error') return 'Error de envío';
    return venta.factura ? 'Pendiente de envío' : 'Pendiente';
  }

  claseFactura(venta: Venta): string {
    if (venta.estado === 'anulada' || venta.factura?.estado === 'anulada') return 'badge-danger';
    if (venta.factura?.email_enviado) return 'badge-success';
    return venta.factura?.estado === 'error' ? 'badge-danger' : 'badge-warning';
  }

  etiquetaEstadoSri(estado: EstadoSri): string {
    const etiquetas: Record<EstadoSri, string> = {
      sin_xml: 'Sin XML',
      xml_generado: 'XML pendiente de firma',
      firmado: 'Firmado',
      enviado: 'Enviado',
      autorizado: 'Autorizado',
      rechazado: 'Rechazado',
      error: 'Error XML'
    };
    return etiquetas[estado];
  }

  claseEstadoSri(estado: EstadoSri): string {
    if (estado === 'sin_xml') return 'badge-secondary';
    if (estado === 'xml_generado' || estado === 'firmado') return 'badge-warning';
    if (estado === 'enviado') return 'badge-info';
    if (estado === 'autorizado') return 'badge-success';
    return 'badge-danger';
  }

  puedeRegenerarXml(factura: Factura): boolean {
    return factura.estado_sri === 'sin_xml'
      || factura.estado_sri === 'xml_generado'
      || factura.estado_sri === 'error';
  }

  detalleTecnicoFactura(venta: Venta): string | null {
    if (venta.factura?.email_error) return venta.factura.email_error;
    if (venta.factura?.correo_configurado === false) {
      return 'Falta configurar SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM.';
    }
    return null;
  }

  emitirYEnviar(venta: Venta): void {
    if (venta.estado === 'anulada' || venta.factura?.email_enviado || this.facturaEnProcesoId) return;
    this.facturaEnProcesoId = venta.id;
    this.changeDetector.markForCheck();

    const solicitud = venta.factura
      ? this.facturasApi.enviarCorreo(venta.factura.id)
      : this.facturasApi.generar(venta.id).pipe(
        switchMap(({ factura }) => {
          venta.factura = factura;
          return this.facturasApi.enviarCorreo(factura.id);
        })
      );
    subscribeWithChangeDetection(solicitud.pipe(finalize(() => this.facturaEnProcesoId = null)), this.changeDetector, {
      next: ({ factura, mensaje, correoConfigurado }) => {
        venta.factura = { ...factura, correo_configurado: correoConfigurado };
        this.toast.mostrar(mensaje, 'success');
        if (correoConfigurado) this.cargarVentas();
      },
      error: () => this.cargarVentas()
    });
  }

  descargarPdf(venta: Venta): void {
    if (!venta.factura || this.descargandoFacturaId) return;
    this.descargandoFacturaId = venta.id;
    this.changeDetector.markForCheck();
    subscribeWithChangeDetection(
      this.facturasApi.descargarPdf(venta.factura.id).pipe(finalize(() => this.descargandoFacturaId = null)),
      this.changeDetector,
      {
        next: (pdf) => {
          const url = URL.createObjectURL(pdf);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `factura-${venta.factura?.numero}.pdf`;
          enlace.click();
          URL.revokeObjectURL(url);
        }
      }
    );
  }

  verDetalleFactura(id: string): void {
    this.detalleFacturaAbierto = true;
    this.cargandoDetalleFactura = true;
    this.facturaDetalle = null;
    subscribeWithChangeDetection(
      this.facturasApi.obtener(id).pipe(finalize(() => this.cargandoDetalleFactura = false)),
      this.changeDetector,
      {
        next: ({ factura }) => this.facturaDetalle = factura,
        error: () => {
          this.detalleFacturaAbierto = false;
          this.toast.mostrar('No se pudo cargar el detalle de la factura.', 'error');
        }
      }
    );
  }

  cerrarDetalleFactura(): void {
    this.detalleFacturaAbierto = false;
    this.facturaDetalle = null;
  }

  descargarXml(venta: Venta): void {
    if (!venta.factura || this.descargandoFacturaId) return;
    this.descargandoFacturaId = venta.id;
    this.changeDetector.markForCheck();
    subscribeWithChangeDetection(
      this.facturasApi.descargarXml(venta.factura.id).pipe(finalize(() => this.descargandoFacturaId = null)),
      this.changeDetector,
      { next: (xml) => this.descargarArchivo(xml, `factura-${venta.factura?.numero}.xml`) }
    );
  }

  descargarXmlDesdeDetalle(): void {
    if (!this.facturaDetalle || this.descargandoFacturaId) return;
    this.descargandoFacturaId = this.facturaDetalle.id;
    this.changeDetector.markForCheck();
    subscribeWithChangeDetection(
      this.facturasApi.descargarXml(this.facturaDetalle.id).pipe(finalize(() => this.descargandoFacturaId = null)),
      this.changeDetector,
      { next: (xml) => this.descargarArchivo(xml, `factura-${this.facturaDetalle?.numero}.xml`) }
    );
  }

  regenerarXml(id: string): void {
    if (this.regenerandoXml) return;
    this.regenerandoXml = true;
    subscribeWithChangeDetection(
      this.facturasApi.regenerarXml(id).pipe(finalize(() => this.regenerandoXml = false)),
      this.changeDetector,
      {
        next: ({ factura, mensaje }) => {
          this.facturaDetalle = factura;
          this.cargarVentas();
          this.toast.mostrar(mensaje, 'success');
        },
        error: () => this.toast.mostrar('No se pudo regenerar el XML. Revisa la configuración del emisor.', 'error')
      }
    );
  }

  private descargarArchivo(archivo: Blob, nombre: string): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private nuevoItem(): FormGroup {
    return this.fb.nonNullable.group({
      producto_id: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]]
    });
  }
}
