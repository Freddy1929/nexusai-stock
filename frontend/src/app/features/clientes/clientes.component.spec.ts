import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/entity-api.services';
import { ToastService } from '../../core/services/toast.service';
import { ClientesComponent } from './clientes.component';

describe('ClientesComponent', () => {
  const cliente = {
    id: '5',
    tipo_identificacion: 'cedula' as const,
    identificacion: '1712345678',
    nombre: 'Cliente de prueba',
    email: null,
    telefono: null,
    direccion: null,
    creado_en: '2026-11-11T00:00:00.000Z'
  };
  const api = {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn()
  };
  let fixture: ComponentFixture<ClientesComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();
    api.listar.mockReturnValue(of({
      clientes: [cliente],
      paginacion: { page: 1, limit: 10, total: 1, total_pages: 1 }
    }));
    api.crear.mockReturnValue(of({ mensaje: 'Cliente creado.', cliente }));

    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [
        { provide: ClienteService, useValue: api },
        { provide: AuthService, useValue: { tieneRol: () => false } },
        { provide: ToastService, useValue: { mostrar: vi.fn() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
  });

  it('carga clientes y total al entrar', () => {
    expect(api.listar).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.paginacion.total).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cliente de prueba');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 cliente registrado');
  });

  it('crea el cliente y vuelve a cargar la lista desde el servidor', () => {
    const component = fixture.componentInstance;
    component.nuevo();
    component.formulario.setValue({
      tipo_identificacion: 'cedula',
      identificacion: '1712345678',
      nombre: 'Cliente de prueba',
      email: '',
      telefono: '',
      direccion: ''
    });

    component.guardar();

    expect(api.crear).toHaveBeenCalledWith({
      tipo_identificacion: 'cedula',
      identificacion: '1712345678',
      nombre: 'Cliente de prueba',
      email: null,
      telefono: null,
      direccion: null
    });
    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(component.modalAbierto).toBe(false);
  });
});
