import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Get user profile
 */
router.get('/profile/:walletAddress', async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    const result = await pool.query(
      'SELECT wallet_address, role, name, bio, verification_status, created_at FROM users WHERE wallet_address = $1',
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

export default router;
