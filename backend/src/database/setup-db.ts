import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Connect to default postgres database to create qms database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(/\/qms$/, '/postgres') || 'postgresql://postgres:password@localhost:5432/postgres',
});

async function setupDatabase() {
  try {
    console.log('Creating qms database...');
    await pool.query('CREATE DATABASE qms');
    console.log('Database created successfully!');
  } catch (error: any) {
    if (error.code === '42P04') {
      console.log('Database already exists, skipping creation.');
    } else {
      console.error('Failed to create database:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

setupDatabase();
