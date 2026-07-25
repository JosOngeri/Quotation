import { Pool } from 'pg';
import logger from './logging';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'qms',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
  }),
});

pool.on('error', (err) => {
  logger.error('Database pool idle client error, pool will auto-recover:', err.message);
});

// Query helper with logging
export async function queryWithLogging(text: string, params: any[] = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, duration, rows: result.rowCount }, 'Query executed');
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error({ query: text, params, duration, error: error.message }, 'Query failed');
    throw error;
  }
}

export { pool };
