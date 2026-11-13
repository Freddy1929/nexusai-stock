import { describe, expect, it } from 'vitest';
import {
  validarCedulaEcuatoriana,
  validarIdentificacion,
  validarRucEcuatoriano
} from './identificacion-ecuatoriana';

function crearCedulaValida(baseNueveDigitos: string): string {
  const suma = [...baseNueveDigitos].reduce((total, digito, indice) => {
    let valor = Number(digito);
    if (indice % 2 === 0) {
      valor *= 2;
      if (valor > 9) {
        valor -= 9;
      }
    }
    return total + valor;
  }, 0);
  return `${baseNueveDigitos}${(10 - suma % 10) % 10}`;
}

describe('validación de cédula ecuatoriana', () => {
  it('acepta una cédula generada con provincia permitida y dígito verificador correcto', () => {
    const cedula = crearCedulaValida('301234567');
    expect(validarCedulaEcuatoriana(cedula)).toBe(true);
  });

  it('rechaza un dígito verificador incorrecto', () => {
    const cedula = crearCedulaValida('301234567');
    const invalida = `${cedula.slice(0, 9)}${(Number(cedula[9]) + 1) % 10}`;
    expect(validarCedulaEcuatoriana(invalida)).toBe(false);
  });

  it('rechaza provincia fuera de rango y tercer dígito mayor o igual a seis', () => {
    expect(validarCedulaEcuatoriana(crearCedulaValida('251234567'))).toBe(false);
    expect(validarCedulaEcuatoriana(crearCedulaValida('306234567'))).toBe(false);
  });

  it('rechaza longitudes distintas a diez dígitos', () => {
    expect(validarCedulaEcuatoriana('171234567')).toBe(false);
    expect(validarCedulaEcuatoriana('17123456789')).toBe(false);
  });
});

describe('validación de RUC', () => {
  it('acepta un RUC natural cuyo prefijo es una cédula válida y termina en 001', () => {
    const cedula = crearCedulaValida('301234567');
    expect(validarRucEcuatoriano(`${cedula}001`)).toBe(true);
  });

  it('acepta RUC simplificado de sociedad privada y pública con sufijo 001', () => {
    expect(validarRucEcuatoriano('3091234567001')).toBe(true);
    expect(validarRucEcuatoriano('3061234567001')).toBe(true);
  });

  it('rechaza RUC con longitud o sufijo incorrectos', () => {
    expect(validarRucEcuatoriano('309123456700')).toBe(false);
    expect(validarRucEcuatoriano('3091234567002')).toBe(false);
  });

  it('rechaza RUC natural con cédula inválida y tipo de tercer dígito desconocido', () => {
    const cedula = crearCedulaValida('301234567');
    const cedulaInvalida = `${cedula.slice(0, 9)}${(Number(cedula[9]) + 1) % 10}`;
    expect(validarRucEcuatoriano(`${cedulaInvalida}001`)).toBe(false);
    expect(validarRucEcuatoriano('3081234567001')).toBe(false);
  });
});

describe('validación de pasaporte y tipo', () => {
  it('acepta pasaporte alfanumérico de cinco a veinte caracteres', () => {
    expect(validarIdentificacion('pasaporte', 'AB12345')).toBe(true);
    expect(validarIdentificacion('pasaporte', 'A1234')).toBe(true);
  });

  it('rechaza pasaporte vacío, demasiado corto, largo o con símbolos', () => {
    expect(validarIdentificacion('pasaporte', '')).toBe(false);
    expect(validarIdentificacion('pasaporte', 'A123')).toBe(false);
    expect(validarIdentificacion('pasaporte', 'A'.repeat(21))).toBe(false);
    expect(validarIdentificacion('pasaporte', 'AB-1234')).toBe(false);
  });
});
