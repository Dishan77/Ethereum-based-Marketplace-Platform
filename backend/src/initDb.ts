import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to Neon DB...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to database successfully\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔄 Creating tables...');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✓ Database schema created successfully\n');

    // Create admin user if not exists
    console.log('🔄 Creating default admin user...');
    const adminAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // First Anvil account
    
    await pool.query(`
      INSERT INTO users (wallet_address, role, name, verification_status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [adminAddress.toLowerCase(), 'admin', 'Default Admin', 'verified']);
    
    console.log('✓ Admin user created\n');

    // Verify tables
    console.log('🔄 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('✓ Tables created:');
    result.rows.forEach(row => {
      console.log(`  → ${row.table_name}`);
    });

    console.log('\n✅ Database initialization complete!');
    console.log('\nYou can now start the backend server with: npm run dev\n');

  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
