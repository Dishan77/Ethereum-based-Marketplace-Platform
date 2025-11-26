import { Router, Response } from 'express';
import pool from '../config/database';
import { marketplaceContract } from '../config/blockchain';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Get all listed artworks
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Get listed items from blockchain
    const listedItemIds = await marketplaceContract.getListedItems();
    
    // Fetch artwork details from database
    const artworks = await Promise.all(
      listedItemIds.map(async (itemId: bigint) => {
        const itemDetails = await marketplaceContract.getItemDetails(itemId);
        
        // Get artwork from database
        const dbResult = await pool.query(
          'SELECT * FROM artworks WHERE blockchain_id = $1',
          [Number(itemId)]
        );

        return {
          blockchainId: Number(itemId),
          name: itemDetails[0].name,
          price: itemDetails[0].price.toString(),
          seller: itemDetails[0].seller,
          ipfsHash: itemDetails[0].ipfsMetadataHash,
          isResale: itemDetails[0].isResale,
          listedAt: Number(itemDetails[0].listedAt),
          ownershipCount: Number(itemDetails[1]),
          ...dbResult.rows[0]
        };
      })
    );

    res.json(artworks);
  } catch (error) {
    console.error('Get artworks error:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

/**
 * Get artwork by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get from blockchain
    const itemDetails = await marketplaceContract.getItemDetails(id);
    const timeline = await marketplaceContract.getOwnershipTimeline(id);
    
    // Get from database
    const dbResult = await pool.query(
      'SELECT * FROM artworks WHERE blockchain_id = $1',
      [id]
    );

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Artwork not found' });
      return;
    }

    // Increment view count
    await pool.query(
      'UPDATE artworks SET views = views + 1 WHERE blockchain_id = $1',
      [id]
    );

    res.json({
      blockchainId: Number(id),
      name: itemDetails[0].name,
      price: itemDetails[0].price.toString(),
      seller: itemDetails[0].seller,
      owner: itemDetails[0].owner,
      isSold: itemDetails[0].isSold,
      isResale: itemDetails[0].isResale,
      ipfsHash: itemDetails[0].ipfsMetadataHash,
      listedAt: Number(itemDetails[0].listedAt),
      ownershipCount: Number(itemDetails[1]),
      ownershipTimeline: timeline.map((record: any) => ({
        owner: record.owner,
        timestamp: Number(record.timestamp),
        conditionHash: record.conditionHash,
        price: record.price.toString()
      })),
      ...dbResult.rows[0]
    });
  } catch (error) {
    console.error('Get artwork error:', error);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

/**
 * Create artwork entry in database (after blockchain listing)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { blockchainId, sellerAddress, ipfsHash, category, tags, qrCodeUrl } = req.body;
    
    if (!blockchainId || !sellerAddress || !ipfsHash) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO artworks (blockchain_id, seller_address, ipfs_metadata_hash, category, tags, qr_code_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [blockchainId, sellerAddress.toLowerCase(), ipfsHash, category, tags, qrCodeUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create artwork error:', error);
    res.status(500).json({ error: 'Failed to create artwork entry' });
  }
});

/**
 * Get artworks by seller
 */
router.get('/seller/:address', async (req: AuthRequest, res: Response) => {
  try {
    const { address } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM artworks WHERE seller_address = $1 ORDER BY created_at DESC',
      [address.toLowerCase()]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get seller artworks error:', error);
    res.status(500).json({ error: 'Failed to fetch seller artworks' });
  }
});

/**
 * Search artworks
 */
router.get('/search/:query', async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.params;
    
    const result = await pool.query(
      `SELECT a.* FROM artworks a 
       JOIN users u ON a.seller_address = u.wallet_address 
       WHERE a.category ILIKE $1 OR $1 = ANY(a.tags)
       ORDER BY a.created_at DESC`,
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Search artworks error:', error);
    res.status(500).json({ error: 'Failed to search artworks' });
  }
});

export default router;
