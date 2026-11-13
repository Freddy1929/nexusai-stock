import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardService } from './entity-api.services';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía desde, hasta y agrupar en la solicitud del gráfico histórico', () => {
    service.ventasHistoricas('2026-05-10', '2026-11-10', 'mes').subscribe();

    const request = http.expectOne('http://localhost:4000/api/dashboard/ventas-historicas?desde=2026-05-10&hasta=2026-11-10&agrupar=mes');
    expect(request.request.params.get('desde')).toBe('2026-05-10');
    expect(request.request.params.get('hasta')).toBe('2026-11-10');
    expect(request.request.params.get('agrupar')).toBe('mes');
    request.flush({ rango: { desde: '2026-05-10', hasta: '2026-11-10' }, agrupar: 'mes', ventas: [] });
  });

  it('envía el rango seleccionado a los resúmenes de ventas', () => {
    service.resumenVentas('2026-10-12', '2026-11-10').subscribe();

    const request = http.expectOne('http://localhost:4000/api/dashboard/resumen-ventas?desde=2026-10-12&hasta=2026-11-10');
    expect(request.request.params.get('desde')).toBe('2026-10-12');
    expect(request.request.params.get('hasta')).toBe('2026-11-10');
    request.flush({
      rango: { desde: '2026-10-12', hasta: '2026-11-10' },
      resumen: { cantidad_ventas: '0', ingresos: '0.00', costo: '0.00', ganancia: '0.00' }
    });
  });
});
