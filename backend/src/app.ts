import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { pool } from './config/database';
import { categoriasRouter } from './routes/categorias.routes';
import { productosRouter } from './routes/productos.routes';
import { proveedoresRouter } from './routes/proveedores.routes';
import { authRouter } from './routes/auth.routes';
import { clientesRouter } from './routes/clientes.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { pedidosRouter } from './routes/pedidos.routes';
import { ventasRouter } from './routes/ventas.routes';
import { facturasRouter } from './routes/facturas.routes';
import { prediccionRouter } from './routes/prediccion.routes';
import { configuracionIaRouter } from './routes/configuracion-ia.routes';
import { HttpError } from './utils/http-error';

export const app = express();

app.set('etag', false);
app.use(helmet());
app.use(env.API_PREFIX, (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

const apiRouter = express.Router();

apiRouter.get('/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/clientes', clientesRouter);
apiRouter.use('/ventas', ventasRouter);
apiRouter.use('/facturas', facturasRouter);
apiRouter.use('/prediccion', prediccionRouter);
apiRouter.use('/configuracion-ia', configuracionIaRouter);
apiRouter.use('/pedidos', pedidosRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/categorias', categoriasRouter);
apiRouter.use('/proveedores', proveedoresRouter);
apiRouter.use('/productos', productosRouter);

app.use(env.API_PREFIX, apiRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: 'Ruta no encontrada.'
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    if (error.headers) {
      response.set(error.headers);
    }
    response.status(error.status).json({
      error: error.message,
      ...(error.detalles ? { detalles: error.detalles } : {})
    });
    return;
  }

  if (isPostgresError(error)) {
    if (error.code === '23505') {
      response.status(409).json({ error: 'Ya existe un registro con esos datos.' });
      return;
    }

    if (error.code === '23503') {
      response.status(409).json({
        error: 'No se puede completar la operación porque el registro está relacionado con otros datos.'
      });
      return;
    }

    if (error.code === '23514' || error.code === '22P02' || error.code === '22003') {
      response.status(400).json({ error: 'Los datos enviados no cumplen las reglas de la base de datos.' });
      return;
    }
  }

  if (isJsonParseError(error)) {
    response.status(400).json({ error: 'El cuerpo de la solicitud debe contener JSON válido.' });
    return;
  }

  console.error('Error no controlado en la API:', error);
  response.status(500).json({
    error: 'Error interno del servidor.'
  });
};

app.use(errorHandler);

function isPostgresError(error: unknown): error is Error & { code: string } {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string';
}

function isJsonParseError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === 'entity.parse.failed';
}
