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
    console.log('🔄 Running migration: Add artist_name to artist_profiles...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '003_add_artist_name_to_profiles.sql');
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
