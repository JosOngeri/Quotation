import { Pool } from 'pg';

export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qms_test'
});