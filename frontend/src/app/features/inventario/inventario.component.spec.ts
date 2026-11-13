import 'zone.js';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaService, ProductoService, ProveedorService } from '../../core/services/entity-api.services';
import { Producto } from '../../core/models/api.models';
import { InventarioComponent } from './inventario.component';

describe('InventarioComponent', () => {
  const producto: Producto = {
    id: '1',
    nombre: 'Arroz blanco 1 kg',
    codigo: 'ABA-001',
    categoria_id: '1',
    categoria_nombre: 'Abarrotes',
    proveedor_id: '1',
    proveedor_nombre: 'Proveedor de prueba',
    precio_compra: '1.00',
    precio_venta: '1.25',
    cantidad: '10',
    unidad: 'unidad',
    limite_minimo: '2',
    fecha_caducidad: null,
    imagen_url: null,
    estado: 'Disponible',
    estado_registro: 'activo',
    creado_en: '2026-11-10T00:00:00.000Z'
  };
  let fixture: ComponentFixture<InventarioComponent>;
  let productosApi: {
    listar: ReturnType<typeof vi.fn>;
    bajoStock: ReturnType<typeof vi.fn>;
    porCaducar: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    productosApi = {
      listar: vi.fn().mockReturnValue(of({
        productos: [producto],
        paginacion: { page: 1, limit: 10, total: 1, total_pages: 1 }
      })),
      bajoStock: vi.fn().mockReturnValue(of({ productos: [producto] })),
      porCaducar: vi.fn().mockReturnValue(of({ dias: 30, productos: [] })),
      actualizar: vi.fn().mockReturnValue(of({ mensaje: 'Producto actualizado.', producto }))
    };

    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: AuthService, useValue: { tieneRol: () => true } },
        { provide: ProductoService, useValue: productosApi },
        { provide: CategoriaService, useValue: { listar: () => of({ categorias: [] }) } },
        { provide: ProveedorService, useValue: { listar: () => of({ proveedores: [] }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('carga al entrar productos, paginación y tarjetas desde la respuesta del API', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(productosApi.listar).toHaveBeenCalledOnce();
    expect(productosApi.listar).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      busqueda: undefined,
      categoria_id: undefined,
      estado: undefined
    });
    expect(fixture.componentInstance.paginacion.total).toBe(1);
    expect(fixture.componentInstance.bajoStock).toHaveLength(1);
    expect(texto).toContain('Arroz blanco 1 kg');
    expect(texto).toContain('Productos registrados');
    expect(texto).toContain('Por caducar (30 días)');
    expect(texto).not.toContain('Cargando productos');
  });

  it('muestra el estado de error y permite reintentar si falla el listado', async () => {
    productosApi.listar
      .mockReturnValueOnce(throwError(() => new Error('Error de prueba')))
      .mockReturnValueOnce(of({
        productos: [producto],
        paginacion: { page: 1, limit: 10, total: 1, total_pages: 1 }
      }));

    fixture.componentInstance.cargar();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(productosApi.listar).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.errorCarga).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudo cargar el inventario');
    fixture.componentInstance.cargar();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Arroz blanco 1 kg');
  });

  it('apaga el indicador si el listado completa sin emitir datos', () => {
    productosApi.listar.mockReturnValue(EMPTY);

    fixture.componentInstance.cargar();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.componentInstance.cargandoTabla).toBe(false);
    expect(texto).toContain('No encontramos productos');
    expect(texto).not.toContain('Cargando productos');
  });

  it('envía la cantidad original en la edición para detectar stock obsoleto', () => {
    const component = fixture.componentInstance;
    component.editar(producto);
    component.formulario.patchValue({
      nombre: producto.nombre,
      codigo: producto.codigo,
      categoria_id: '1',
      proveedor_id: '1',
      precio_compra: 1,
      precio_venta: 1.25,
      cantidad: 12,
      unidad: 'unidad',
      limite_minimo: 2,
      fecha_caducidad: '',
      estado_registro: 'activo'
    });

    component.guardar();

    expect(productosApi.actualizar).toHaveBeenCalledWith('1', expect.objectContaining({
      cantidad: 12,
      cantidad_original: 10
    }));
  });
});
