import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-brand-panel">
        <div class="login-brand">
          <span class="brand-mark">N</span><span>NexusAI <strong>Stock</strong></span>
        </div>
        <div class="login-hero">
          <span class="hero-tag">GESTIÓN INTELIGENTE</span>
          <h1>Tu negocio,<br><span>en movimiento.</span></h1>
          <p>Inventario, ventas y decisiones más inteligentes en un solo lugar.</p>
          <div class="hero-art"><div class="art-card art-card-one">↗ <strong>Ventas</strong><span>+12,8%</span></div><div class="art-card art-card-two">▦ <strong>Inventario</strong><span>Controlado</span></div><div class="art-orbit"></div></div>
        </div>
        <small class="login-footer">© 2026 NexusAI Stock · Gestión con visión</small>
      </section>
      <section class="login-form-panel">
        <div class="login-form-wrap">
          <div class="mobile-login-brand"><span class="brand-mark">N</span><span>NexusAI <strong>Stock</strong></span></div>
          <div class="login-heading"><span class="eyebrow">BIENVENIDO DE NUEVO</span><h2>Inicia sesión</h2><p>Ingresa tus credenciales para acceder a tu cuenta.</p></div>
          <form [formGroup]="formulario" (ngSubmit)="ingresar()" class="form-stack">
            <label class="field"><span>Correo electrónico</span><input type="email" formControlName="email" placeholder="nombre@empresa.com" autocomplete="username" /><small *ngIf="formulario.controls.email.touched && formulario.controls.email.invalid">Ingresa un correo electrónico válido.</small></label>
            <label class="field"><span>Contraseña</span><input type="password" formControlName="password" placeholder="Tu contraseña" autocomplete="current-password" /><small *ngIf="formulario.controls.password.touched && formulario.controls.password.invalid">La contraseña es obligatoria.</small></label>
            <div class="form-error" *ngIf="errorMensaje">{{ errorMensaje }}</div>
            <button class="button button-primary button-wide login-submit" type="submit" [disabled]="cargando">{{ cargando ? 'Ingresando…' : 'Ingresar a mi cuenta' }} <span>→</span></button>
          </form>
          <div class="login-security"><span>⌑</span> Tus datos están protegidos con autenticación segura.</div>
        </div>
      </section>
    </main>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  cargando = false;
  errorMensaje = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ingresar(): void {
    if (this.formulario.invalid || this.cargando) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';
    this.auth.iniciarSesion(this.formulario.getRawValue().email, this.formulario.getRawValue().password).subscribe({
      next: () => void this.router.navigateByUrl('/panel'),
      error: (error: { error?: { error?: string } }) => {
        this.errorMensaje = error.error?.error ?? 'No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.';
        this.cargando = false;
      }
    });
  }
}
