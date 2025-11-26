import { Router, Response } from 'express';
import QRCode from 'qrcode';
import pool from '../config/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { marketplaceContract } from '../config/blockchain';

const router = Router();

/**
 * Generate QR code for artwork
 */
router.post('/generate', 
  authenticateToken, 
  requireRole('seller', 'admin'), 
  async (req: AuthRequest, res: Response) => {
    try {
      const { artworkId } = req.body;

      if (!artworkId) {
        res.status(400).json({ error: 'Artwork ID required' });
        return;
      }

      // Verify artwork exists in database
      const artworkResult = await pool.query(
        'SELECT * FROM artworks WHERE id = $1',
        [artworkId]
      );

      if (artworkResult.rows.length === 0) {
        res.status(404).json({ error: 'Artwork not found' });
        return;
      }

      const artwork = artworkResult.rows[0];

      // Generate verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${artworkId}`;

      // Generate QR code as Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      // Update artwork with QR code URL
      await pool.query(
        'UPDATE artworks SET qr_code_url = $1 WHERE id = $2',
        [qrCodeDataUrl, artworkId]
      );

      res.json({
        qrCode: qrCodeDataUrl,
        verificationUrl,
        artworkId
      });
    } catch (error) {
      console.error('Generate QR error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  }
);

/**
 * Verify artwork authenticity via QR scan
 */
router.get('/verify/:artworkId', async (req: AuthRequest, res: Response) => {
  try {
    const { artworkId } = req.params;

    // Get artwork from database
    const artworkResult = await pool.query(
      'SELECT * FROM artworks WHERE id = $1',
      [artworkId]
    );

    if (artworkResult.rows.length === 0) {
      res.status(404).json({ 
        error: 'Artwork not found',
        verified: false 
      });
      return;
    }

    const artwork = artworkResult.rows[0];

    // Get blockchain details
    const itemDetails = await marketplaceContract.getItemDetails(artwork.blockchain_id);
    const timeline = await marketplaceContract.getOwnershipTimeline(artwork.blockchain_id);

    // Log scan
    await pool.query(
      'INSERT INTO qr_scans (artwork_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [artworkId, req.ip, req.headers['user-agent']]
    );

    // Get total scans
    const scansResult = await pool.query(
      'SELECT COUNT(*) as scan_count FROM qr_scans WHERE artwork_id = $1',
      [artworkId]
    );

    res.json({
      verified: true,
      artwork: {
        id: artwork.id,
        blockchainId: artwork.blockchain_id,
        name: itemDetails[0].name,
        seller: artwork.seller_address,
        currentOwner: itemDetails[0].owner,
        ipfsHash: artwork.ipfs_metadata_hash,
        category: artwork.category,
        tags: artwork.tags,
        ownershipCount: Number(itemDetails[1]),
        ownershipTimeline: timeline.map((record: any) => ({
          owner: record.owner,
          timestamp: Number(record.timestamp),
          conditionHash: record.conditionHash,
          price: record.price.toString()
        }))
      },
      scanCount: Number(scansResult.rows[0].scan_count)
    });
  } catch (error) {
    console.error('Verify artwork error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Get scan statistics for artwork (seller/admin only)
 */
router.get('/scans/:artworkId',
  authenticateToken,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { artworkId } = req.params;

      const scansResult = await pool.query(
        'SELECT scanned_at, ip_address, location FROM qr_scans WHERE artwork_id = $1 ORDER BY scanned_at DESC LIMIT 100',
        [artworkId]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) as total_scans FROM qr_scans WHERE artwork_id = $1',
        [artworkId]
      );

      res.json({
        totalScans: Number(countResult.rows[0].total_scans),
        recentScans: scansResult.rows
      });
    } catch (error) {
      console.error('Get scans error:', error);
      res.status(500).json({ error: 'Failed to fetch scan statistics' });
    }
  }
);

export default router;
