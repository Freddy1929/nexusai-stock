import { z } from 'zod';
import { HttpError } from './http-error';

export function validate<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(
      400,
      'Los datos enviados no son válidos.',
      result.error.issues.map((issue) => ({
        campo: issue.path.length > 0 ? issue.path.join('.') : 'datos',
        mensaje: issue.message
      }))
    );
  }

  return result.data;
}
