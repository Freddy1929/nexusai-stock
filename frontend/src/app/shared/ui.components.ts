import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="abierto" (click)="cerrar()">
      <section class="modal-card" role="dialog" aria-modal="true" [attr.aria-label]="titulo" (click)="$event.stopPropagation()">
        <header class="modal-heading">
          <h2>{{ titulo }}</h2>
          <button class="icon-button" type="button" aria-label="Cerrar" (click)="cerrar()">×</button>
        </header>
        <ng-content />
      </section>
    </div>
  `
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() titulo = '';
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();
  private bodyOverflow: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['abierto']) return;
    if (this.abierto) this.bloquearScroll();
    else this.restaurarScroll();
  }

  ngOnDestroy(): void {
    this.restaurarScroll();
  }

  cerrar(): void {
    if (this.abierto) this.cerrado.emit();
  }

  @HostListener('document:keydown', ['$event'])
  alPresionarTecla(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.abierto) {
      evento.preventDefault();
      this.cerrar();
    }
  }

  private bloquearScroll(): void {
    if (this.bodyOverflow !== null) return;
    this.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private restaurarScroll(): void {
    if (this.bodyOverflow === null) return;
    document.body.style.overflow = this.bodyOverflow;
    this.bodyOverflow = null;
  }
}

@Component({
  selector: 'app-paginacion',
  standalone: true,
  template: `
    <div class="pagination">
      <span>Página {{ pagina }} de {{ totalPaginas || 1 }}</span>
      <div class="pagination-actions">
        <button class="button button-outline button-small" type="button" [disabled]="pagina <= 1" (click)="cambiar(-1)">Anterior</button>
        <button class="button button-outline button-small" type="button" [disabled]="pagina >= totalPaginas" (click)="cambiar(1)">Siguiente</button>
      </div>
    </div>
  `
})
export class PaginacionComponent {
  @Input() pagina = 1;
  @Input() totalPaginas = 1;
  @Output() paginaChange = new EventEmitter<number>();

  cambiar(delta: number): void {
    const paginaSiguiente = this.pagina + delta;
    if (paginaSiguiente >= 1 && paginaSiguiente <= this.totalPaginas) this.paginaChange.emit(paginaSiguiente);
  }
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [PaginacionComponent],
  template: `
    <section class="card table-card">
      <ng-content select="[table-toolbar]" />
      <div class="table-scroll"><ng-content select="table" /></div>
      <app-paginacion [pagina]="pagina" [totalPaginas]="totalPaginas" (paginaChange)="paginaChange.emit($event)" />
    </section>
  `
})
export class DataTableComponent {
  @Input() pagina = 1;
  @Input() totalPaginas = 1;
  @Output() paginaChange = new EventEmitter<number>();
}

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card summary-group">
      <div class="summary-title">
        <span class="summary-icon" [ngClass]="tono">{{ icono }}</span>
        <div><h2>{{ titulo }}</h2><small>{{ descripcion }}</small></div>
      </div>
      <div class="metric-grid" [class.two]="compacto"><ng-content /></div>
    </article>
  `
})
export class SummaryCardComponent {
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() icono = '';
  @Input() tono = '';
  @Input() compacto = false;
}

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge" [ngClass]="clase">{{ texto }}</span>`,
  imports: [CommonModule]
})
export class BadgeComponent {
  @Input() texto = '';
  @Input() clase = '';
}

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite">
      <div *ngFor="let mensaje of toast.mensajes()" class="toast" [ngClass]="'toast-' + mensaje.tipo">
        <span>{{ mensaje.texto }}</span>
        <button type="button" aria-label="Cerrar notificación" (click)="toast.quitar(mensaje.id)">×</button>
      </div>
    </div>
  `
})
export class ToastViewportComponent {
  readonly toast = inject(ToastService);
}
