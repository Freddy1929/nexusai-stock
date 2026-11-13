import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProveedorService } from '../../core/services/entity-api.services';
import { Proveedor, ProveedorInput } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/ui.components';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">ALIADOS DE TU NEGOCIO</span><h1>Proveedores</h1><p>Administra los datos de contacto de tus proveedores.</p></div>
      <button *ngIf="esAdmin" class="button button-primary" type="button" (click)="nuevo()">＋ Agregar proveedor</button>
    </div>
    <section class="card table-card">
      <div class="table-toolbar"><div><h2 class="section-title">Directorio de proveedores</h2><p class="section-subtitle">{{ cargando ? 'Cargando proveedores…' : errorCarga ? 'No se pudo consultar la lista' : proveedores.length + (proveedores.length === 1 ? ' proveedor registrado' : ' proveedores registrados') }}</p></div><button *ngIf="errorCarga" class="button button-outline button-small" type="button" (click)="cargar()">Reintentar</button></div>
      <div class="table-scroll"><table><thead><tr><th>Proveedor</th><th>RUC</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th *ngIf="esAdmin">Acciones</th></tr></thead>
        <tbody>
          <ng-container *ngIf="!cargando && !errorCarga">
            <tr *ngFor="let proveedor of proveedores">
              <td><div class="product-cell"><span class="provider-avatar">{{ inicial(proveedor.nombre) }}</span><strong>{{ proveedor.nombre }}</strong></div></td>
              <td>{{ proveedor.ruc || '—' }}</td><td>{{ proveedor.telefono || '—' }}</td><td>{{ proveedor.email || '—' }}</td><td>{{ proveedor.direccion || '—' }}</td>
              <td *ngIf="esAdmin"><div class="row-actions"><button class="text-action" type="button" (click)="editar(proveedor)">Editar</button><button class="text-action danger-action" type="button" (click)="eliminar(proveedor)">Eliminar</button></div></td>
            </tr>
          </ng-container>
          <tr *ngIf="cargando"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><strong>Cargando proveedores…</strong></div></td></tr>
          <tr *ngIf="!cargando && errorCarga"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><strong>No se pudieron cargar los proveedores</strong><small>{{ errorCarga }}</small></div></td></tr>
          <tr *ngIf="!cargando && !errorCarga && !proveedores.length"><td [attr.colspan]="esAdmin ? 6 : 5"><div class="empty-state"><span>♙</span><strong>La API respondió sin proveedores</strong><small>Agrega los datos de tus aliados comerciales.</small></div></td></tr>
        </tbody>
      </table></div>
    </section>

    <app-modal [abierto]="modalAbierto" [titulo]="proveedorEditando ? 'Editar proveedor' : 'Agregar proveedor'" (cerrado)="modalAbierto = false">
      <form class="form-stack modal-form" [formGroup]="formulario" (ngSubmit)="guardar()">
        <div class="form-grid">
          <label class="field"><span>Nombre</span><input formControlName="nombre" placeholder="Nombre comercial" /><small *ngIf="formulario.controls.nombre.touched && formulario.controls.nombre.invalid">El nombre es obligatorio.</small></label>
          <label class="field"><span>RUC</span><input formControlName="ruc" maxlength="13" placeholder="1790000000001" /><small *ngIf="formulario.controls.ruc.touched && formulario.controls.ruc.invalid">Ingresa los 13 dígitos del RUC.</small></label>
          <label class="field"><span>Teléfono</span><input formControlName="telefono" placeholder="02 000 0000" /></label>
          <label class="field"><span>Correo electrónico</span><input type="email" formControlName="email" placeholder="contacto@proveedor.com" /><small *ngIf="formulario.controls.email.touched && formulario.controls.email.invalid">Ingresa un correo válido.</small></label>
          <label class="field field-full"><span>Dirección</span><textarea rows="2" formControlName="direccion" placeholder="Dirección del proveedor"></textarea></label>
        </div>
        <div class="modal-actions"><button class="button button-outline" type="button" (click)="modalAbierto = false">Cancelar</button><button class="button button-primary" type="submit" [disabled]="guardando">{{ guardando ? 'Guardando…' : proveedorEditando ? 'Guardar cambios' : 'Crear proveedor' }}</button></div>
      </form>
    </app-modal>
  `
})
export class ProveedoresComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  proveedores: Proveedor[] = [];
  modalAbierto = false;
  guardando = false;
  cargando = true;
  errorCarga = '';
  proveedorEditando: Proveedor | null = null;
  readonly esAdmin: boolean;
  private proveedoresSubscription: Subscription | null = null;
  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    ruc: ['', [Validators.pattern(/^\d{13}$/)]],
    telefono: [''],
    email: ['', Validators.email],
    direccion: ['']
  });

  constructor(
    private readonly api: ProveedorService,
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
    this.proveedoresSubscription?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';
    this.proveedores = [];
    this.changeDetector.markForCheck();
    this.proveedoresSubscription = subscribeWithChangeDetection(this.api.listar().pipe(finalize(() => this.cargando = false)), this.changeDetector, {
      next: ({ proveedores }) => {
        this.proveedores = proveedores;
      },
      error: () => {
        this.proveedores = [];
        this.errorCarga = 'Verifica la conexión con la API y vuelve a intentarlo.';
      }
    });
  }

  inicial(nombre: string): string {
    return nombre.slice(0, 1).toUpperCase();
  }

  nuevo(): void {
    this.proveedorEditando = null;
    this.formulario.reset({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });
    this.modalAbierto = true;
  }

  editar(proveedor: Proveedor): void {
    this.proveedorEditando = proveedor;
    this.formulario.reset({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc ?? '',
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      direccion: proveedor.direccion ?? ''
    });
    this.modalAbierto = true;
  }

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: ProveedorInput = {
      nombre: valores.nombre,
      ruc: valores.ruc || null,
      telefono: valores.telefono || null,
      email: valores.email || null,
      direccion: valores.direccion || null
    };
    const solicitud = this.proveedorEditando
      ? this.api.actualizar(this.proveedorEditando.id, datos)
      : this.api.crear(datos);
    this.guardando = true;
    subscribeWithChangeDetection(solicitud.pipe(finalize(() => this.guardando = false)), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.modalAbierto = false;
        this.cargar();
      }
    });
  }

  eliminar(proveedor: Proveedor): void {
    if (!window.confirm(`¿Eliminar al proveedor "${proveedor.nombre}"?`)) return;
    subscribeWithChangeDetection(this.api.eliminar(proveedor.id), this.changeDetector, {
      next: ({ mensaje }) => {
        this.toast.mostrar(mensaje, 'success');
        this.cargar();
      }
    });
  }
}
