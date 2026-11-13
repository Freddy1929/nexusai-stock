import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  texto: string;
  tipo: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly mensajes = signal<ToastMessage[]>([]);
  private nextId = 0;

  mostrar(texto: string, tipo: ToastMessage['tipo'] = 'info'): void {
    const id = this.nextId++;
    this.mensajes.update((mensajes) => [...mensajes, { id, texto, tipo }]);
    window.setTimeout(() => this.quitar(id), 4500);
  }

  quitar(id: number): void {
    this.mensajes.update((mensajes) => mensajes.filter((mensaje) => mensaje.id !== id));
  }
}
