import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService, PrediccionApiService } from '../../core/services/entity-api.services';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const service = {
    resumenVentas: vi.fn(),
    resumenCompras: vi.fn(),
    resumenInventario: vi.fn(),
    resumenProductos: vi.fn(),
    ventasHistoricas: vi.fn()
  };
  const prediccion = { serie: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    service.resumenVentas.mockReturnValue(of({
      rango: { desde: '2026-05-10', hasta: '2026-11-10' },
      resumen: { cantidad_ventas: '3', ingresos: '125.50', costo: '80.00', ganancia: '45.50' }
    }));
    service.resumenCompras.mockReturnValue(of({
      rango: { desde: '2026-05-10', hasta: '2026-11-10' },
      resumen: { cantidad_compras: '1', costo_total: '20.00', cancelados: '0', devoluciones_cantidad: '0', devoluciones_valor: '0.00' }
    }));
    service.resumenInventario.mockReturnValue(of({
      rango: { desde: '2026-05-10', hasta: '2026-11-10' },
      resumen: { stock_actual_total: '25', productos_por_recibir: '4' }
    }));
    service.resumenProductos.mockReturnValue(of({
      rango: { desde: '2026-05-10', hasta: '2026-11-10' },
      resumen: { proveedores: '3', categorias: '5' }
    }));
    prediccion.serie.mockReturnValue(of({ agrupar: 'semana', serie: [] }));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: service },
        { provide: PrediccionApiService, useValue: prediccion }
      ]
    }).compileComponents();
  });

  it('carga los resúmenes y el gráfico al entrar y refleja las respuestas en la vista', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.cargando).toBe(false);
    expect(service.resumenVentas).toHaveBeenCalledWith(component.rangoActual.desde, component.rangoActual.hasta);
    expect(prediccion.serie).toHaveBeenCalledWith('semana');
    expect(component.ventas?.cantidad_ventas).toBe('3');
    expect(texto).toContain('Resumen de Ventas');
    expect(texto).toContain('$ 125,50');
    expect(texto).not.toContain('Cargando los indicadores');
  });

  it('apaga la carga de resúmenes si el flujo completa sin emitir', () => {
    service.resumenVentas.mockReturnValueOnce(EMPTY);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.cargando).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Cargando los indicadores');
  });
});
