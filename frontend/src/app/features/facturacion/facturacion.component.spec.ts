import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService, FacturaService, ProductoService, VentaService } from '../../core/services/entity-api.services';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { Cliente, Producto, Venta } from '../../core/models/api.models';
import { FacturacionComponent } from './facturacion.component';

describe('FacturacionComponent', () => {
  const producto: Producto = {
    id: '1',
    nombre: 'Arroz',
    codigo: 'ARR-001',
    categoria_id: '1',
    categoria_nombre: 'Abarrotes',
    proveedor_id: '1',
    proveedor_nombre: 'Proveedor',
    precio_compra: '1.00',
    precio_venta: '1.25',
    cantidad: '3',
    unidad: 'unidad',
    limite_minimo: '1',
    fecha_caducidad: null,
    imagen_url: null,
    estado: 'Disponible',
    estado_registro: 'activo',
    creado_en: '2026-11-11T00:00:00.000Z'
  };
  const cliente: Cliente = {
    id: '1',
    tipo_identificacion: 'cedula',
    identificacion: '1712345678',
    nombre: 'Cliente',
    email: null,
    telefono: null,
    direccion: null,
    creado_en: '2026-11-11T00:00:00.000Z'
  };
  const venta: Venta = {
    id: '2',
    cliente_id: cliente.id,
    cliente_nombre: cliente.nombre,
    identificacion_cliente: cliente.identificacion,
    fecha: '2026-11-11T00:00:00.000Z',
    subtotal: '10.00',
    iva: '1.50',
    total: '11.50',
    forma_pago: '01',
    estado: 'pagada'
  };
  let fixture: ComponentFixture<FacturacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionComponent],
      providers: [
        { provide: AuthService, useValue: { tieneRol: () => false } },
        { provide: ClienteService, useValue: { buscarPorIdentificacion: vi.fn(), crear: vi.fn() } },
        { provide: FacturaService, useValue: { generar: vi.fn(), enviarCorreo: vi.fn(), descargarPdf: vi.fn() } },
        { provide: ProductoService, useValue: { listar: () => of({ productos: [producto], paginacion: { page: 1, limit: 100, total: 1, total_pages: 1 } }) } },
        { provide: VentaService, useValue: { listar: () => of({ ventas: [], paginacion: { page: 1, limit: 10, total: 0, total_pages: 0 } }) } },
        { provide: NotificationService, useValue: { cargar: vi.fn() } },
        { provide: ToastService, useValue: { mostrar: vi.fn() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
  });

  it('impide registrar cantidades superiores al stock disponible', () => {
    const component = fixture.componentInstance;
    component.cliente = cliente;
    component.items.at(0).patchValue({ producto_id: producto.id, cantidad: 4 });
    component.modalAbierto = true;
    fixture.detectChanges();

    expect(component.ventaTieneStockDisponible).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Supera el stock disponible');
    const submit = (fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('muestra carga y filas como estados excluyentes al cambiar de página', () => {
    const component = fixture.componentInstance;
    const respuesta = new Subject<{
      ventas: Venta[];
      paginacion: { page: number; limit: number; total: number; total_pages: number };
    }>();
    vi.spyOn(TestBed.inject(VentaService), 'listar').mockReturnValue(respuesta.asObservable());
    component.ventas = [venta];
    component.paginacion = { page: 1, limit: 10, total: 11, total_pages: 2 };
    fixture.detectChanges();

    component.cambiarPagina(2);
    fixture.detectChanges();
    let texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.cargandoVentas).toBe(true);
    expect(texto).toContain('Cargando ventas');
    expect(texto).not.toContain('VTA-2');

    respuesta.next({ ventas: [venta], paginacion: { page: 2, limit: 10, total: 11, total_pages: 2 } });
    respuesta.complete();
    fixture.detectChanges();
    texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.cargandoVentas).toBe(false);
    expect(texto).toContain('VTA-2');
    expect(texto).not.toContain('Cargando ventas');
  });

  it('mantiene una factura sin SMTP como pendiente y con badge de advertencia', () => {
    const component = fixture.componentInstance;
    const ventaConFactura: Venta = {
      ...venta,
      factura: {
        id: '1',
        numero: '001-001-000000001',
        estado: 'generada',
        email_enviado: false,
        email_error: null,
        clave_acceso: null,
        estado_sri: 'sin_xml',
        mensaje_sri: null,
        correo_configurado: false
      }
    };

    expect(component.estadoFactura(ventaConFactura)).toBe('Pendiente de envío');
    expect(component.claseFactura(ventaConFactura)).toBe('badge-warning');
    expect(component.detalleTecnicoFactura(ventaConFactura)).toContain('SMTP_HOST');
    expect(component.esAdmin).toBe(false);
  });

  it('inicializa la forma de pago en 01 y asigna colores al estado SRI', () => {
    const component = fixture.componentInstance;

    expect(component.formulario.controls.forma_pago.value).toBe('01');
    expect(component.claseEstadoSri('sin_xml')).toBe('badge-secondary');
    expect(component.claseEstadoSri('xml_generado')).toBe('badge-warning');
    expect(component.claseEstadoSri('enviado')).toBe('badge-info');
    expect(component.claseEstadoSri('autorizado')).toBe('badge-success');
    expect(component.claseEstadoSri('rechazado')).toBe('badge-danger');
  });
});
