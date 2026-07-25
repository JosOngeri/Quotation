import { Pool } from 'pg';

const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qms_test'
});

export const setupTestDB = async () => {
  try {
    // Create test database if it doesn't exist
    await testPool.query(`CREATE DATABASE IF NOT EXISTS qms_test`);
  } catch (error) {
    console.log('Test database may already exist');
  }
  
  // Connect to test database and run migrations
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qms_test'
  });
  
  try {
    // Run initial schema - read SQL file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  } catch (error) {
    console.log('Schema may already exist:', error);
  }
  
  await pool.end();
};

export const cleanupTestDB = async () => {
  await testPool.query('DROP DATABASE IF EXISTS qms_test');
  await testPool.end();
};

export const resetTestDB = async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qms_test'
  });
  
  // Clean up all tables
  const tables = [
    'password_reset_tokens', 'audit_event', 'template_version', 'template',
    'supplier_performance', 'cost_event', 'project', 'quote_item', 'quote_node',
    'quote_revision', 'quote', 'supplier_offer', 'product', 'supplier',
    'client_user', 'client', 'users', 'workspace', 'platform_admin'
  ];
  
  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (error) {
      // Table may not exist
    }
  }
  
  await pool.end();
};