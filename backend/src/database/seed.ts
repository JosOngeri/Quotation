import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Starting database seed...');
    
    // Hash passwords
    const platformAdminPassword = await bcrypt.hash('Admin@123', 10);
    const tenantAdminPassword = await bcrypt.hash('Tenant@123', 10);
    const estimatorPassword = await bcrypt.hash('Estimator@123', 10);
    const clientPassword = await bcrypt.hash('Client@123', 10);

    // Insert Platform Admin (main admin who runs the site)
    const platformAdminResult = await pool.query(
      `INSERT INTO platform_admin (id, email, password_hash, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id`,
      [uuidv4(), 'admin@qms.platform', platformAdminPassword, 'Platform Administrator']
    );
    console.log('Platform admin created:', platformAdminResult.rows[0]?.id || 'already exists');

    // Insert Workspace (tenant)
    let workspaceId;
    const existingWorkspace = await pool.query(
      'SELECT id FROM workspace WHERE slug = $1',
      ['joscards']
    );
    
    if (existingWorkspace.rows.length > 0) {
      workspaceId = existingWorkspace.rows[0].id;
      console.log('Workspace already exists:', workspaceId);
    } else {
      workspaceId = uuidv4();
      await pool.query(
        `INSERT INTO workspace (id, name, slug, reporting_currency, default_locale) 
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, 'Joscards Signage', 'joscards', 'KES', 'en-KE']
      );
      console.log('Workspace created:', workspaceId);
    }

    // Insert Tenant Admin (runs the site for individual users)
    const tenantAdminId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (workspace_id, email) DO NOTHING`,
      [tenantAdminId, workspaceId, 'admin@joscards.example', tenantAdminPassword, 'Mary Johnson', ['tenant_admin']]
    );
    console.log('Tenant admin created:', tenantAdminId);

    // Insert Estimator user
    const estimatorId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (workspace_id, email) DO NOTHING`,
      [estimatorId, workspaceId, 'jane@joscards.example', estimatorPassword, 'Jane Doe', ['estimator']]
    );
    console.log('Estimator created:', estimatorId);

    // Insert Procurement user
    const procurementId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (workspace_id, email) DO NOTHING`,
      [procurementId, workspaceId, 'john@joscards.example', estimatorPassword, 'John Smith', ['procurement', 'project_manager']]
    );
    console.log('Procurement user created:', procurementId);

    // Insert Client
    let clientId;
    const existingClient = await pool.query(
      'SELECT id FROM client WHERE workspace_id = $1 AND name = $2',
      [workspaceId, 'Acme Creative Studio']
    );
    
    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
      console.log('Client already exists:', clientId);
    } else {
      clientId = uuidv4();
      await pool.query(
        `INSERT INTO client (id, workspace_id, name, contact_name, email, phone, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [clientId, workspaceId, 'Acme Creative Studio', 'Sarah Kimani', 'sarah@acme.example', '+254712345678', 'Nairobi, Kenya']
      );
      console.log('Client created:', clientId);
    }

    // Insert Client User (portal user)
    await pool.query(
      `INSERT INTO client_user (id, client_id, email, password_hash, name) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (client_id, email) DO NOTHING`,
      [uuidv4(), clientId, 'sarah@acme.example', clientPassword, 'Sarah Kimani']
    );
    console.log('Client user created');

    // Insert Suppliers
    let supplier1Id;
    const existingSupplier1 = await pool.query(
      'SELECT id FROM supplier WHERE workspace_id = $1 AND name = $2',
      [workspaceId, 'LED Solutions Ltd']
    );
    
    if (existingSupplier1.rows.length > 0) {
      supplier1Id = existingSupplier1.rows[0].id;
    } else {
      supplier1Id = uuidv4();
      await pool.query(
        `INSERT INTO supplier (id, workspace_id, name, contact_name, email, phone, lead_time_days) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [supplier1Id, workspaceId, 'LED Solutions Ltd', 'James Mwangi', 'james@ledsolutions.example', '+254723456789', 5]
      );
    }

    let supplier2Id;
    const existingSupplier2 = await pool.query(
      'SELECT id FROM supplier WHERE workspace_id = $1 AND name = $2',
      [workspaceId, 'ABC Signs']
    );
    
    if (existingSupplier2.rows.length > 0) {
      supplier2Id = existingSupplier2.rows[0].id;
    } else {
      supplier2Id = uuidv4();
      await pool.query(
        `INSERT INTO supplier (id, workspace_id, name, contact_name, email, phone, lead_time_days) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [supplier2Id, workspaceId, 'ABC Signs', 'Grace Wanjiku', 'grace@abcsigns.example', '+254734567890', 7]
      );
    }
    console.log('Suppliers created');

    // Insert Products
    let product1Id;
    const existingProduct1 = await pool.query(
      'SELECT id FROM product WHERE workspace_id = $1 AND sku = $2',
      [workspaceId, 'SIGN-001']
    );
    
    if (existingProduct1.rows.length > 0) {
      product1Id = existingProduct1.rows[0].id;
    } else {
      product1Id = uuidv4();
      await pool.query(
        `INSERT INTO product (id, workspace_id, sku, name, description, unit, category) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product1Id, workspaceId, 'SIGN-001', 'Custom illuminated logo signage', 'LED backlit acrylic signage', 'each', 'Signage']
      );
    }

    let product2Id;
    const existingProduct2 = await pool.query(
      'SELECT id FROM product WHERE workspace_id = $1 AND sku = $2',
      [workspaceId, 'PANEL-002']
    );
    
    if (existingProduct2.rows.length > 0) {
      product2Id = existingProduct2.rows[0].id;
    } else {
      product2Id = uuidv4();
      await pool.query(
        `INSERT INTO product (id, workspace_id, sku, name, description, unit, category) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product2Id, workspaceId, 'PANEL-002', 'Aluminium composite panel', '3mm aluminum composite panel', 'm2', 'Materials']
      );
    }
    console.log('Products created');

    // Insert Supplier Offers
    const existingOffer1 = await pool.query(
      'SELECT id FROM supplier_offer WHERE supplier_id = $1 AND product_id = $2',
      [supplier1Id, product1Id]
    );
    
    if (existingOffer1.rows.length === 0) {
      await pool.query(
        `INSERT INTO supplier_offer (id, supplier_id, product_id, unit_amount_minor, currency, unit, effective_from, confidence_score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), supplier1Id, product1Id, 1250000, 'KES', 'each', '2026-01-01', 0.95]
      );
    }

    const existingOffer2 = await pool.query(
      'SELECT id FROM supplier_offer WHERE supplier_id = $1 AND product_id = $2',
      [supplier2Id, product1Id]
    );
    
    if (existingOffer2.rows.length === 0) {
      await pool.query(
        `INSERT INTO supplier_offer (id, supplier_id, product_id, unit_amount_minor, currency, unit, effective_from, confidence_score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), supplier2Id, product1Id, 1350000, 'KES', 'each', '2026-01-01', 0.85]
      );
    }
    console.log('Supplier offers created');

    console.log('Seed completed successfully!');
    console.log('\n=== Login Credentials ===');
    console.log('Platform Admin: admin@qms.platform / Admin@123');
    console.log('Tenant Admin: admin@joscards.example / Tenant@123');
    console.log('Estimator: jane@joscards.example / Estimator@123');
    console.log('Client Portal: sarah@acme.example / Client@123');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
