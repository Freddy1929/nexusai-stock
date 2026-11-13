import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrediccionProducto } from './core/models/api.models';
import { AuthService } from './core/services/auth.service';
import { PrediccionApiService } from './core/services/entity-api.services';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const prediccion: PrediccionProducto = {
    producto_id: '1',
    nombre: 'Arroz blanco',
    codigo: 'ABA-001',
    unidad: 'unidad',
    stock_actual: 2,
    limite_minimo: 5,
    demanda_diaria: 1,
    demanda_7_dias: 7,
    demanda_15_dias: 15,
    demanda_30_dias: 30,
    dias_restantes_stock: 2,
    nivel_alerta: 'critico',
    sugerencia_reposicion: 33,
    confianza: 'alta',
    dias_con_ventas: 30,
    ventana_dias: 90
  };
  const prediccionApi = { alertas: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    prediccionApi.alertas.mockReturnValue(of({ alertas: [prediccion] }));

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => null, cerrarSesion: vi.fn(), tieneRol: () => false } },
        { provide: PrediccionApiService, useValue: prediccionApi }
      ]
    }).compileComponents();
  });

  it('carga alertas de predicción al iniciar y la campana solo abre o cierra el panel', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Clientes');
    expect(fixture.nativeElement.textContent).not.toContain('Configuración IA');
    expect(prediccionApi.alertas).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.notification-count')?.textContent).toBe('1');

    const boton = fixture.nativeElement.querySelector('[aria-label="Notificaciones"]') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alertas de demanda');
    expect(fixture.nativeElement.textContent).toContain('Arroz blanco');
    expect(prediccionApi.alertas).toHaveBeenCalledOnce();

    document.body.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Alertas de demanda');
  });

  it('muestra el estado vacío cuando la API no devuelve alertas', () => {
    prediccionApi.alertas.mockReturnValue(of({ alertas: [] }));
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('[aria-label="Notificaciones"]') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tienes notificaciones nuevas.');
    expect(fixture.nativeElement.querySelector('.notification-count')).toBeNull();
  });
});
