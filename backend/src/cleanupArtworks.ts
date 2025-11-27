import pool from './config/database';

async function cleanupArtworks() {
  try {
    console.log('Fetching all artworks...\n');
    
    // Get all artworks
    const result = await pool.query(
      'SELECT id, blockchain_id, name, seller_address, price, created_at FROM artworks ORDER BY created_at DESC'
    );
    
    console.log(`Found ${result.rows.length} artworks:\n`);
    result.rows.forEach((artwork, index) => {
      console.log(`${index + 1}. ID: ${artwork.id}, Blockchain ID: ${artwork.blockchain_id}`);
      console.log(`   Name: ${artwork.name}`);
      console.log(`   Seller: ${artwork.seller_address}`);
      console.log(`   Price: ${artwork.price} ETH`);
      console.log(`   Created: ${artwork.created_at}\n`);
    });
    
    // Delete all artworks
    console.log('Deleting all artworks...');
    const deleteResult = await pool.query('DELETE FROM artworks');
    console.log(`✅ Deleted ${deleteResult.rowCount} artworks successfully!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

cleanupArtworks();
