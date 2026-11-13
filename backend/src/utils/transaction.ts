import { PoolClient } from 'pg';
import { pool } from '../config/database';

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await operation(client);
    await client.query('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('No se pudo revertir la transacción de PostgreSQL:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
