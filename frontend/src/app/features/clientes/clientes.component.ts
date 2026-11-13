import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/entity-api.services';
import { Cliente, ClienteInput, Paginacion } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent, DataTableComponent } from '../../shared/ui.components';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-clientes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, DataTableComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">RELACIONES COMERCIALES</span><h1>Clientes</h1><p>Consulta y administra los datos de tus clientes.</p></div>
      <button class="button button-primary" type="button" (click)="nuevo()">＋ Agregar cliente</button>
    </div>
    <app-data-table [pagina]="paginacion.page" [totalPaginas]="paginacion.total_pages" (paginaChange)="cambiarPagina($event)">
      <div table-toolbar class="table-toolbar">
        <form class="table-search" (submit)="buscar($event)">
          <span>⌕</span><input [(ngModel)]="busqueda" name="busqueda" placeholder="Buscar por nombre o identificación" />
          <button class="button button-outline button-small" type="submit">Buscar</button>
        </form>
        <p class="section-subtitle">{{ cargando ? 'Cargando clientes…' : errorCarga ? 'No se pudo consultar la lista' : paginacion.total + (paginacion.total === 1 ? ' cliente registrado' : ' clientes registrados') }}</p>
        <button *ngIf="errorCarga" class="button button-outline button-small" type="button" (click)="cargar()">Reintentar</button>
      </div>
      <table>
        <thead><tr><th>Cliente</th><th>Identificación</th><th>Tipo</th><th>Teléfono</th><th>Correo</th><th *ngIf="esAdmin">Acciones</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargando && !errorCarga">
            <tr *ngFor="let cliente of clientes">
              <td><div class="product-cell"><span class="provider-avatar">{{ inicial(cliente.nombre) }}</span><strong>{{ cliente.nombre }}</strong></div></td>
              <td>{{ cliente.identificacion }}</td><td>{{ tipoIdentificacion(cliente.tipo_identificacion) }}</td>
              <td>{{ cliente.telefono || '—' }}</td><td>{{ cliente.email || '—' }}</td>
              <td *ngIf="esAdmin"><div class="row-actions" *ngIf="!esConsumidorFinal(cliente)"><button class="text-action" type="button" (click)="editar(cliente)">Editar</button><button class="text-action danger-action" type="button" (click)="eliminar(cliente)">Eliminar</button></div><small *ngIf="esConsumidorFinal(cliente)">Registro protegido</small></td>
            </tr>
          </ng-container>
          <tr *ngIf="cargando"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><strong>Cargando clientes…</strong></div></td></tr>
          <tr *ngIf="!cargando && errorCarga"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><strong>No se pudieron cargar los clientes</strong><small>{{ errorCarga }}</small></div></td></tr>
          <tr *ngIf="!cargando && !errorCarga && !clientes.length"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><span>♙</span><strong>La API respondió sin clientes</strong><small>Agrega un cliente o cambia el término de búsqueda.</small></div></td></tr>
        </tbody>
      </table>
    </app-data-table>

    <app-modal [abierto]="modalAbierto" [titulo]="clienteEditando ? 'Editar cliente' : 'Agregar cliente'" (cerrado)="modalAbierto = false">
      <form class="form-stack modal-form" [formGroup]="formulario" (ngSubmit)="guardar()">
        <div class="form-grid">
          <label class="field"><span>Tipo de identificación</span>
            <select formControlName="tipo_identificacion">
              <option value="cedula">Cédula</option><option value="ruc">RUC</option><option value="pasaporte">Pasaporte</option>
            </select>
            <small *ngIf="formulario.controls.tipo_identificacion.touched && formulario.controls.tipo_identificacion.invalid">Selecciona el tipo de identificación.</small>
          </label>
          <label class="field"><span>Identificación</span><input formControlName="identificacion" maxlength="20" placeholder="Número de identificación" />
            <small *ngIf="formulario.controls.identificacion.touched && formulario.controls.identificacion.invalid">La identificación es obligatoria y admite hasta 20 caracteres.</small>
          </label>
          <label class="field field-full"><span>Nombre</span><input formControlName="nombre" maxlength="160" placeholder="Nombre o razón social" />
            <small *ngIf="formulario.controls.nombre.touched && formulario.controls.nombre.invalid">Ingresa un nombre de hasta 160 caracteres.</small>
          </label>
          <label class="field"><span>Correo electrónico</span><input type="email" formControlName="email" placeholder="cliente@correo.com" />
            <small *ngIf="formulario.controls.email.touched && formulario.controls.email.invalid">Ingresa un correo válido.</small>
          </label>
          <label class="field"><span>Teléfono</span><input formControlName="telefono" maxlength="30" placeholder="Teléfono de contacto" /></label>
          <label class="field field-full"><span>Dirección</span><textarea rows="2" formControlName="direccion" placeholder="Dirección del cliente"></textarea></label>
        </div>
        <div class="form-error" *ngIf="errorGuardar">{{ errorGuardar }}</div>
        <div class="modal-actions"><button class="button button-outline" type="button" (click)="modalAbierto = false">Cancelar</button><button class="button button-primary" type="submit" [disabled]="guardando">{{ guardando ? 'Guardando…' : clienteEditando ? 'Guardar cambios' : 'Crear cliente' }}</button></div>
      </form>
    </app-modal>
  `
})
export class ClientesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  clientes: Cliente[] = [];
  paginacion: Paginacion = { page: 1, limit: 10, total: 0, total_pages: 0 };
  pagina = 1;
  busqueda = '';
  cargando = true;
  guardando = false;
  errorCarga = '';
  errorGuardar = '';
  modalAbierto = false;
  clienteEditando: Cliente | null = null;
  readonly esAdmin: boolean;
  private clientesSubscription: Subscription | null = null;
  readonly formulario = this.fb.nonNullable.group({
    tipo_identificacion: this.fb.nonNullable.control<Cliente['tipo_identificacion']>('cedula', Validators.required),
    identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', Validators.email],
    telefono: ['', Validators.maxLength(30)],
    direccion: ['']
  });

  constructor(
    private readonly api: ClienteService,
    private readonly toast: ToastService,
    private readonly changeDetector: ChangeDetectorRef,
    auth: AuthService
  ) {
    this.esAdmin = auth.tieneRol('admin');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.clientesSubscription?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';
    this.clientes = [];
    this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
    this.changeDetector.markForCheck();
    this.clientesSubscription = subscribeWithChangeDetection(
      this.api.listar(this.pagina, 10, this.busqueda.trim() || undefined).pipe(finalize(() => this.cargando = false)),
      this.changeDetector,
      {
        next: (respuesta) => {
          this.clientes = respuesta.clientes;
          this.paginacion = respuesta.paginacion;
        },
        error: () => {
          this.clientes = [];
          this.paginacion = { page: this.pagina, limit: 10, total: 0, total_pages: 0 };
          this.errorCarga = 'Verifica la conexión con la API y vuelve a intentarlo.';
        }
      }
    );
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

  nuevo(): void {
    this.clienteEditando = null;
    this.errorGuardar = '';
    this.formulario.reset({
      tipo_identificacion: 'cedula',
      identificacion: '',
      nombre: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    this.modalAbierto = true;
  }

  editar(cliente: Cliente): void {
    this.clienteEditando = cliente;
    this.errorGuardar = '';
    this.formulario.reset({
      tipo_identificacion: cliente.tipo_identificacion,
      identificacion: cliente.identificacion,
      nombre: cliente.nombre,
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? ''
    });
    this.modalAbierto = true;
  }

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: ClienteInput = {
      ...valores,
      identificacion: valores.identificacion.trim(),
      nombre: valores.nombre.trim(),
      email: valores.email.trim() || null,
      telefono: valores.telefono.trim() || null,
      direccion: valores.direccion.trim() || null
    };
    const solicitud = this.clienteEditando
      ? this.api.actualizar(this.clienteEditando.id, datos)
      : this.api.crear(datos);
    this.guardando = true;
    this.errorGuardar = '';
    subscribeWithChangeDetection(solicitud.pipe(finalize(() => this.guardando = false)), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.modalAbierto = false;
        if (!this.clienteEditando) this.pagina = 1;
        this.cargar();
      },
      error: (error: { error?: { error?: string } }) => {
        this.errorGuardar = error.error?.error ?? 'No se pudo guardar el cliente. Revisa los datos e inténtalo de nuevo.';
      }
    });
  }

  eliminar(cliente: Cliente): void {
    if (!window.confirm(`¿Eliminar al cliente "${cliente.nombre}"?`)) return;
    subscribeWithChangeDetection(this.api.eliminar(cliente.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        if (this.clientes.length === 1 && this.pagina > 1) this.pagina -= 1;
        this.cargar();
      }
    });
  }

  inicial(nombre: string): string {
    return nombre.slice(0, 1).toUpperCase();
  }

  tipoIdentificacion(tipo: Cliente['tipo_identificacion']): string {
    return tipo === 'cedula' ? 'Cédula' : tipo === 'ruc' ? 'RUC' : 'Pasaporte';
  }

  esConsumidorFinal(cliente: Cliente): boolean {
    return cliente.identificacion === '9999999999999';
  }
}
