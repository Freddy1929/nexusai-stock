export type TipoIdentificacion = 'cedula' | 'ruc' | 'pasaporte';

export function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  const tercerDigito = Number(cedula[2]);
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30) || tercerDigito >= 6) {
    return false;
  }

  const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
    let valor = Number(digito);
    if (indice % 2 === 0) {
      valor *= 2;
      if (valor > 9) {
        valor -= 9;
      }
    }
    return total + valor;
  }, 0);
  const verificador = (10 - (suma % 10)) % 10;

  return verificador === Number(cedula[9]);
}

export function validarRucEcuatoriano(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc) || !ruc.endsWith('001')) {
    return false;
  }

  const tercerDigito = Number(ruc[2]);
  if (tercerDigito < 6) {
    return validarCedulaEcuatoriana(ruc.slice(0, 10));
  }

  if (tercerDigito === 6 || tercerDigito === 9) {
    // Se simplifica la validación de sociedades y entidades públicas: se comprueba longitud y sufijo 001.
    return true;
  }
  return false;
}

export function validarIdentificacion(
  tipo: TipoIdentificacion,
  identificacion: string
): boolean {
  switch (tipo) {
    case 'cedula':
      return validarCedulaEcuatoriana(identificacion);
    case 'ruc':
      return validarRucEcuatoriano(identificacion);
    case 'pasaporte':
      return /^[a-zA-Z0-9]{5,20}$/.test(identificacion);
  }
}
