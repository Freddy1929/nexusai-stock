const numeroFormato = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function moneda(valor: string | number | null | undefined): string {
  const numero = Number(valor ?? 0);
  return `$ ${numeroFormato.format(Number.isFinite(numero) ? numero : 0)}`;
}

export function numero(valor: string | number | null | undefined): string {
  const numero = Number(valor ?? 0);
  return new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })
    .format(Number.isFinite(numero) ? numero : 0);
}

export function fechaLocal(valor: string | null | undefined): string {
  if (!valor) return '—';
  const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? '—' : new Intl.DateTimeFormat('es-EC').format(fecha);
}
