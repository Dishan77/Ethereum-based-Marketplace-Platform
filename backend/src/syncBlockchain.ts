import { ethers } from 'ethers';
import pool from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "listItem",
    "inputs": [
      { "name": "_name", "type": "string" },
      { "name": "_price", "type": "uint256" },
      { "name": "_ipfsMetadataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "itemCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
];

export async function syncDatabaseToBlockchain() {
  console.log('\n🔄 Starting blockchain sync...');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    const onChainCount = await contract.itemCount();
    console.log(`📊 Current blockchain item count: ${onChainCount.toString()}`);

    const result = await pool.query(`
      SELECT id, blockchain_id, name, price, seller_address, ipfs_metadata_hash
      FROM artworks
      ORDER BY id ASC
    `);

    const artworks = result.rows;
    console.log(`📚 Found ${artworks.length} artworks in database`);

    if (artworks.length === 0) {
      console.log('✅ No artworks to sync');
      return { synced: 0, skipped: 0, errors: 0 };
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const artwork of artworks) {
      try {
        console.log(`📤 Syncing artwork ${artwork.id}: "${artwork.name}" (${artwork.price} ETH)`);
        
        const priceInWei = ethers.parseEther(artwork.price);
        const tx = await contract.listItem(
          artwork.name,
          priceInWei,
          artwork.ipfs_metadata_hash
        );

        console.log(`   ⏳ Transaction: ${tx.hash}`);
        await tx.wait();

        const newBlockchainId = await contract.itemCount();
        
        await pool.query(
          'UPDATE artworks SET blockchain_id = $1 WHERE id = $2',
          [Number(newBlockchainId), artwork.id]
        );

        console.log(`   ✅ Synced -> blockchain ID ${newBlockchainId}`);
        synced++;

      } catch (error: any) {
        console.error(`❌ Error syncing artwork ${artwork.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Summary: Synced:', synced, 'Errors:', errors);
    return { synced, skipped, errors };

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  syncDatabaseToBlockchain()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
