import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell" [class.sidebar-open]="menuAbierto()">
      <button class="mobile-backdrop" *ngIf="menuAbierto()" (click)="menuAbierto.set(false)" aria-label="Cerrar menú"></button>
      <aside class="sidebar">
        <a routerLink="/panel" class="brand" (click)="menuAbierto.set(false)">
          <span class="brand-mark">N</span><span>NexusAI <strong>Stock</strong></span>
        </a>
        <div class="nav-caption">MENÚ PRINCIPAL</div>
        <nav class="side-nav">
          <ng-container *ngFor="let item of enlaces">
            <a *ngIf="!item.admin || auth.tieneRol('admin')" [routerLink]="item.url" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="menuAbierto.set(false)">
              <span class="nav-icon">{{ item.icono }}</span><span>{{ item.nombre }}</span>
            </a>
          </ng-container>
        </nav>
        <div class="sidebar-bottom">
          <a class="side-help" routerLink="/prediccion"><span>✦</span><div><strong>Predicción de demanda</strong><small>{{ notificaciones.total() }} productos en alerta</small></div></a>
          <div class="side-version">NexusAI Stock <span>v1.0</span></div>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <button class="menu-toggle" type="button" aria-label="Abrir menú" (click)="menuAbierto.set(!menuAbierto())">☰</button>
          <form class="global-search" (submit)="buscar($event)">
            <span>⌕</span>
            <input [value]="busqueda" (input)="actualizarBusqueda($event)" placeholder="Buscar producto" aria-label="Buscar producto" />
            <kbd>↵</kbd>
          </form>
          <div class="topbar-actions">
            <div class="notification-menu" (click)="$event.stopPropagation()">
              <button type="button" class="icon-button notification-button" aria-label="Notificaciones"
                [attr.aria-expanded]="panelNotificacionesAbierto()" (click)="notificar()">
                ♧<span class="notification-count" *ngIf="notificaciones.total()">{{ notificaciones.total() }}</span>
              </button>
              <section class="notification-panel card" *ngIf="panelNotificacionesAbierto()" aria-label="Panel de notificaciones">
                <header class="notification-heading"><strong>Notificaciones</strong><small *ngIf="notificaciones.total()">{{ notificaciones.total() }} alertas</small></header>
                <p class="notification-status" *ngIf="notificaciones.cargando()">Consultando alertas…</p>
                <p class="notification-status notification-error" *ngIf="!notificaciones.cargando() && notificaciones.error()">{{ notificaciones.error() }}</p>
                <p class="notification-status" *ngIf="!notificaciones.cargando() && !notificaciones.error() && !notificaciones.total()">No tienes notificaciones nuevas.</p>
                <div class="notification-group" *ngIf="notificaciones.alertas().length">
                  <strong class="notification-group-title">Alertas de demanda</strong>
                  <a *ngFor="let alerta of notificaciones.alertas()" routerLink="/prediccion" (click)="cerrarNotificaciones()">
                    <span>{{ alerta.nombre }} <small>{{ alerta.codigo }}</small></span>
                    <small>{{ alerta.nivel_alerta === 'critico' ? 'Crítica' : 'Advertencia' }} · {{ alerta.dias_restantes_stock === null ? 'Sin consumo' : (alerta.dias_restantes_stock | number:'1.0-1') + ' días' }}</small>
                  </a>
                </div>
              </section>
            </div>
            <div class="user-summary">
              <span class="avatar">{{ iniciales }}</span>
              <span class="user-copy"><strong>{{ auth.usuario()?.nombre || 'Usuario' }}</strong><small>{{ auth.usuario()?.rol === 'admin' ? 'Administrador' : 'Vendedor' }}</small></span>
            </div>
            <button type="button" class="logout-button" (click)="auth.cerrarSesion()">Cerrar sesión</button>
          </div>
        </header>
        <section class="page-content"><router-outlet /></section>
      </main>
    </div>
  `
})
export class ShellComponent implements OnInit {
  readonly menuAbierto = signal(false);
  readonly panelNotificacionesAbierto = signal(false);
  busqueda = '';
  readonly enlaces = [
    { nombre: 'Panel Principal', url: '/panel', icono: '▦' },
    { nombre: 'Inventario', url: '/inventario', icono: '▤' },
    { nombre: 'Predicción IA', url: '/prediccion', icono: '✦' },
    { nombre: 'Proveedores', url: '/proveedores', icono: '♙' },
    { nombre: 'Clientes', url: '/clientes', icono: '♧' },
    { nombre: 'Pedidos', url: '/pedidos', icono: '▣' },
    { nombre: 'Facturación', url: '/facturacion', icono: '▧' },
    { nombre: 'Configuración IA', url: '/configuracion', icono: '⚙', admin: true }
  ];

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
    readonly notificaciones: NotificationService
  ) {}

  ngOnInit(): void {
    this.notificaciones.cargar();
  }

  get iniciales(): string {
    return (this.auth.usuario()?.nombre || 'Usuario')
      .split(' ').map((parte) => parte[0]).slice(0, 2).join('').toUpperCase();
  }

  buscar(evento: Event): void {
    evento.preventDefault();
    const termino = this.busqueda.trim();
    if (termino) void this.router.navigate(['/inventario'], { queryParams: { busqueda: termino } });
  }

  actualizarBusqueda(evento: Event): void {
    this.busqueda = (evento.target as HTMLInputElement).value;
  }

  notificar(): void {
    this.panelNotificacionesAbierto.update((abierto) => !abierto);
  }

  cerrarNotificaciones(): void {
    this.panelNotificacionesAbierto.set(false);
  }

  @HostListener('document:click')
  cerrarNotificacionesAlHacerClicFuera(): void {
    this.cerrarNotificaciones();
  }
}
