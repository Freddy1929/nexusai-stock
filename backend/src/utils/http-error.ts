export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalles?: Array<{ campo: string; mensaje: string }>,
    public readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
