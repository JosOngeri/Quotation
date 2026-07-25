import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: 'postgres',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'qms'
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '002_add_password_reset_tokens.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 002_add_password_reset_tokens.sql');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();