import { app } from './app';
import { pool } from './config/database';
import { env } from './config/env';

async function startServer(): Promise<void> {
  await pool.query('SELECT 1');

  app.listen(env.PORT, () => {
    console.log(`NexusAI Stock API disponible en http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

startServer().catch(async (error: unknown) => {
  console.error('No se pudo iniciar el backend o conectar con PostgreSQL:', error);
  await pool.end();
  process.exitCode = 1;
});
