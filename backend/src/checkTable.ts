import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTable() {
  try {
    const res = await pool.query(`
      SELECT * FROM condition_reports WHERE artwork_id = 9;
    `);
    
    console.log('Condition Reports for Artwork 9:');
    console.table(res.rows);
  } catch (error) {
    console.error('Error checking table:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
