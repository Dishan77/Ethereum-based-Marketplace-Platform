import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * Get all users (admin only)
 */
router.get('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT wallet_address, role, name, bio, verification_status, artist_profile_submitted, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get user profile
 */
router.get('/profile/:walletAddress', async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    const result = await pool.query(
      'SELECT wallet_address, role, name, bio, verification_status, artist_profile_submitted, created_at FROM users WHERE wallet_address = $1',
      [walletAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Update user profile (authenticated)
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio } = req.body;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE wallet_address = $3 RETURNING *',
      [name, bio, walletAddress]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Request seller verification
 */
router.post('/verify-seller', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { govtId } = req.body;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await pool.query(
      'UPDATE users SET govt_id = $1, verification_status = $2, role = $3 WHERE wallet_address = $4 RETURNING *',
      [govtId, 'pending', 'seller', walletAddress]
    );

    res.json({ 
      message: 'Verification request submitted',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify seller error:', error);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

/**
 * Admin: Approve/reject seller verification
 */
router.post('/verify-seller/:walletAddress', 
  authenticateToken, 
  requireRole('admin'), 
  async (req: AuthRequest, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { status } = req.body; // 'verified' or 'rejected'

      if (!['verified', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const result = await pool.query(
        'UPDATE users SET verification_status = $1 WHERE wallet_address = $2 RETURNING *',
        [status, walletAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ 
        message: `Seller ${status}`,
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Admin verify error:', error);
      res.status(500).json({ error: 'Failed to update verification status' });
    }
  }
);

/**
 * Get all pending verifications (admin only)
 */
router.get('/pending-verifications',
  authenticateToken,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT wallet_address, name, govt_id, created_at FROM users WHERE verification_status = $1',
        ['pending']
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Get pending verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch pending verifications' });
    }
  }
);

/**
 * Artist registration endpoint
 */
router.post('/artist-registration', authenticateToken, upload.array('portfolioImages', 10), async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      name,
      dateOfBirth,
      bio,
      expertise,
      experience,
      education,
      phone,
      email,
      address,
      city,
      country,
      website,
      socialMedia,
      artStyles,
      certifications
    } = req.body;

    // Handle uploaded portfolio images
    const portfolioImages = req.files ? (req.files as Express.Multer.File[]).map(f => `/uploads/portfolios/${f.filename}`) : [];

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update artist profile
      await client.query(
        `INSERT INTO artist_profiles (
          wallet_address, date_of_birth, expertise, experience, education,
          phone, email, address, city, country, website, social_media,
          art_styles, certifications, portfolio_images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          date_of_birth = EXCLUDED.date_of_birth,
          expertise = EXCLUDED.expertise,
          experience = EXCLUDED.experience,
          education = EXCLUDED.education,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          website = EXCLUDED.website,
          social_media = EXCLUDED.social_media,
          art_styles = EXCLUDED.art_styles,
          certifications = EXCLUDED.certifications,
          portfolio_images = EXCLUDED.portfolio_images,
          updated_at = CURRENT_TIMESTAMP`,
        [
          walletAddress,
          dateOfBirth,
          expertise,
          experience,
          education,
          phone,
          email,
          address,
          city,
          country,
          website,
          socialMedia,
          artStyles,
          certifications,
          JSON.stringify(portfolioImages)
        ]
      );

      // Update user table
      const userResult = await client.query(
        `UPDATE users 
         SET name = $1, 
             bio = $2, 
             artist_profile_submitted = true,
             role = CASE WHEN role = 'customer' THEN 'seller' ELSE role END,
             verification_status = 'pending',
             updated_at = CURRENT_TIMESTAMP 
         WHERE wallet_address = $3
         RETURNING *`,
        [name, bio, walletAddress]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Artist registration submitted successfully',
        user: userResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Artist registration error:', error);
    res.status(500).json({ error: 'Failed to submit artist registration' });
  }
});

/**
 * Get artist profile
 */
router.get('/artist-profile/:walletAddress', async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    const result = await pool.query(
      `SELECT ap.*, u.name, u.bio, u.verification_status 
       FROM artist_profiles ap
       JOIN users u ON ap.wallet_address = u.wallet_address
       WHERE ap.wallet_address = $1`,
      [walletAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Artist profile not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get artist profile error:', error);
    res.status(500).json({ error: 'Failed to fetch artist profile' });
  }
});

export default router;
