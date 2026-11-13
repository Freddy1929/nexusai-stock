import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModalComponent } from './ui.components';

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(ModalComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.style.overflow = '';
  });

  it('cierra con Escape, restaura el scroll y permite cerrar al hacer clic fuera', () => {
    const component = fixture.componentInstance;
    let cierres = 0;
    component.cerrado.subscribe(() => cierres++);
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cierres).toBe(1);
    fixture.componentRef.setInput('abierto', false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');

    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.modal-backdrop').click();
    expect(cierres).toBe(2);
    fixture.nativeElement.querySelector('.icon-button').click();
    expect(cierres).toBe(3);
  });

  it('restaura el scroll si se destruye mientras está abierto', () => {
    document.body.style.overflow = 'auto';
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();
    expect(document.body.style.overflow).toBe('auto');
  });
});
