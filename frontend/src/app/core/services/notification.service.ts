import { Injectable, computed, signal } from '@angular/core';
import { PrediccionProducto } from '../models/api.models';
import { PrediccionApiService } from './entity-api.services';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly alertas = signal<PrediccionProducto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly total = computed(() => this.alertas().length);

  constructor(private readonly prediccionApi: PrediccionApiService) {}

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.prediccionApi.alertas().subscribe({
      next: ({ alertas }) => {
        this.alertas.set(alertas);
        this.cargando.set(false);
      },
      error: () => {
        this.alertas.set([]);
        this.error.set('No se pudieron cargar las alertas de demanda. Intenta de nuevo.');
        this.cargando.set(false);
      }
    });
  }
}
