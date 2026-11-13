import { HttpError } from './http-error';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyString(value: number): string {
  return roundMoney(value).toFixed(2);
}

export function resolveDateRange(
  desde: string | undefined,
  hasta: string | undefined
): { desde: string; hasta: string } {
  const today = new Date();
  const end = hasta ?? today.toISOString().slice(0, 10);
  const start = desde ?? new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (start > end) {
    throw new HttpError(400, 'La fecha desde no puede ser posterior a hasta.');
  }
  return { desde: start, hasta: end };
}
