import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ConfiguracionIA } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { PrediccionApiService } from '../../core/services/entity-api.services';
import { ToastService } from '../../core/services/toast.service';
import { subscribeWithChangeDetection } from '../../core/utils/subscribe-with-change-detection';

const valoresPredeterminados: ConfiguracionIA = {
  ventana_dias: 90,
  dias_recientes: 7,
  dias_intermedios: 30,
  peso_reciente: 3,
  peso_intermedio: 2,
  peso_antiguo: 1,
  umbral_critico: 7,
  umbral_advertencia: 15
};

@Component({
  selector: 'app-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">PREFERENCIAS DEL MODELO</span><h1>Configuración IA</h1><p>Ajusta cómo se estima la demanda y cuándo se muestran alertas.</p></div>
    </div>
    <div class="card loading-card" *ngIf="cargando">Cargando configuración…</div>
    <div class="form-error dashboard-error" *ngIf="!cargando && error">{{ error }}</div>
    <div class="settings-grid" *ngIf="!cargando && !error">
      <section class="card settings-card">
        <div class="settings-section-title"><span class="summary-icon purple">✦</span><div><h2>Parámetros de predicción</h2><p>{{ esAdmin ? 'Solo el administrador puede guardar cambios.' : 'Vista de solo lectura.' }}</p></div></div>
        <form class="form-stack" [formGroup]="formulario" (ngSubmit)="guardar()">
          <label class="field"><span>Ventana de historial (días)</span><input type="number" formControlName="ventana_dias" (input)="validarRelaciones()" /><small>Cuántos días anteriores se incluyen en el promedio.</small></label>
          <label class="field"><span>Días recientes</span><input type="number" formControlName="dias_recientes" (input)="validarRelaciones()" /><small>Los días de este bloque usan el primer peso.</small></label>
          <label class="field"><span>Fin del período intermedio (días)</span><input type="number" formControlName="dias_intermedios" (input)="validarRelaciones()" /><small>Desde el bloque reciente hasta aquí se usa el segundo peso.</small></label>
          <label class="field"><span>Peso para días recientes</span><input type="number" formControlName="peso_reciente" /><small>Más peso hace que las ventas recientes influyan más.</small></label>
          <label class="field"><span>Peso para días intermedios</span><input type="number" formControlName="peso_intermedio" /></label>
          <label class="field"><span>Peso para días antiguos</span><input type="number" formControlName="peso_antiguo" /><small>Se aplica al resto de días dentro de la ventana.</small></label>
          <label class="field"><span>Umbral crítico (días de stock)</span><input type="number" formControlName="umbral_critico" (input)="validarRelaciones()" /><small>Menos días disponibles genera alerta crítica.</small></label>
          <label class="field"><span>Umbral de advertencia (días de stock)</span><input type="number" formControlName="umbral_advertencia" (input)="validarRelaciones()" /><small>Después del umbral crítico y por debajo de este valor es advertencia.</small></label>
          <small class="form-error" *ngIf="formulario.errors?.['parametrosRelacionados']">Revisa la relación entre la ventana, los períodos y los umbrales.</small>
          <div class="row-actions">
            <button *ngIf="esAdmin" class="button button-primary" type="submit" [disabled]="guardando || formulario.invalid">{{ guardando ? 'Guardando…' : 'Guardar configuración' }}</button>
            <button *ngIf="esAdmin" class="button button-outline" type="button" [disabled]="guardando" (click)="restaurarValores()">Restaurar valores</button>
          </div>
        </form>
      </section>
      <section class="card settings-card">
        <div class="settings-section-title"><span class="summary-icon blue">▤</span><div><h2>Cómo funciona</h2><p>El cálculo se basa en el historial de ventas y el stock actual.</p></div></div>
        <div class="data-source-row"><span class="data-source-icon">↗</span><div><strong>Promedio móvil ponderado</strong><small>Se suman las unidades vendidas cada día, multiplicadas por su peso, y se divide para la suma de los pesos. Los días sin ventas cuentan como cero; los recientes tienen más influencia.</small></div></div>
        <div class="data-source-row"><span class="data-source-icon">◷</span><div><strong>Proyección de consumo</strong><small>La demanda diaria se multiplica por 7, 15 y 30 para estimar el consumo futuro.</small></div></div>
        <div class="data-source-row"><span class="data-source-icon">!</span><div><strong>Reposición sugerida</strong><small>Se compara la demanda estimada de 30 días con el stock y el límite mínimo del producto.</small></div></div>
        <div class="settings-callout"><strong>Datos utilizados</strong><p>Se consideran ventas no anuladas. El cálculo se realiza localmente en NexusAI Stock y no llama servicios externos.</p></div>
      </section>
    </div>
  `
})
export class ConfiguracionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly esAdmin: boolean;
  cargando = true;
  guardando = false;
  error = '';
  readonly formulario = this.fb.nonNullable.group({
    ventana_dias: [90, [Validators.required, Validators.min(30), Validators.max(180)]],
    dias_recientes: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
    dias_intermedios: [30, [Validators.required, Validators.min(8), Validators.max(90)]],
    peso_reciente: [3, [Validators.required, Validators.min(1), Validators.max(20)]],
    peso_intermedio: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    peso_antiguo: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    umbral_critico: [7, [Validators.required, Validators.min(1), Validators.max(60)]],
    umbral_advertencia: [15, [Validators.required, Validators.min(1), Validators.max(90)]]
  });

  constructor(
    private readonly api: PrediccionApiService,
    auth: AuthService,
    private readonly toast: ToastService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    this.esAdmin = auth.tieneRol('admin');
  }

  ngOnInit(): void {
    subscribeWithChangeDetection(
      this.api.obtenerConfiguracion().pipe(finalize(() => this.cargando = false)),
      this.changeDetector,
      {
        next: ({ configuracion }) => {
          this.formulario.patchValue(configuracion);
          if (!this.esAdmin) this.formulario.disable();
          this.validarRelaciones();
        },
        error: () => this.error = 'No se pudo cargar la configuración. Intenta de nuevo más tarde.'
      }
    );
  }

  guardar(): void {
    this.formulario.markAllAsTouched();
    this.validarRelaciones();
    if (!this.esAdmin || this.formulario.invalid || this.guardando) return;
    this.guardando = true;
    subscribeWithChangeDetection(
      this.api.guardarConfiguracion(this.formulario.getRawValue()).pipe(finalize(() => this.guardando = false)),
      this.changeDetector,
      {
        next: ({ mensaje, configuracion }) => {
          this.formulario.patchValue(configuracion);
          this.toast.mostrar(mensaje, 'success');
        },
        error: () => this.toast.mostrar('No se pudo guardar la configuración. Revisa los valores e inténtalo de nuevo.', 'error')
      }
    );
  }

  restaurarValores(): void {
    if (!this.esAdmin) return;
    this.formulario.patchValue(valoresPredeterminados);
    this.validarRelaciones();
    this.guardar();
  }

  validarRelaciones(): void {
    const valores = this.formulario.getRawValue();
    if (valores.dias_intermedios <= valores.dias_recientes
      || valores.ventana_dias < valores.dias_intermedios
      || valores.umbral_advertencia <= valores.umbral_critico) {
      this.formulario.setErrors({ parametrosRelacionados: true });
    } else {
      this.formulario.setErrors(null);
    }
  }
}
