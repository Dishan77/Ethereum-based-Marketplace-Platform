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

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add condition_reports table...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '004_add_condition_reports.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(migration);
    
    console.log('✓ Migration completed successfully\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
