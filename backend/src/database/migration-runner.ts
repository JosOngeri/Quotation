import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Get applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY applied_at');
  return result.rows.map(row => row.version);
}

// Apply a single migration
async function applyMigration(version: string, sql: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${version}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to apply migration: ${version}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run all pending migrations
async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    await ensureMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.length}`);
    
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found migration files: ${migrationFiles.length}`);
    
    for (const file of migrationFiles) {
      const version = file.replace('.sql', '');
      
      if (appliedMigrations.includes(version)) {
        console.log(`⊘ Skipping already applied migration: ${version}`);
        continue;
      }
      
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await applyMigration(version, sql);
    }
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };