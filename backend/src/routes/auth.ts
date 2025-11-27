import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { generateToken, verifySignature, generateNonceMessage } from '../utils/auth';
import crypto from 'crypto';

const router = Router();

// In-memory nonce storage (use Redis in production)
const nonces = new Map<string, { nonce: string; timestamp: number }>();

/**
 * Request nonce for wallet authentication
 */
router.post('/nonce', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: 'Invalid wallet address' });
      return;
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const message = generateNonceMessage(walletAddress, nonce);

    // Store nonce (expires in 5 minutes)
    nonces.set(walletAddress.toLowerCase(), {
      nonce,
      timestamp: Date.now()
    });

    res.json({ message, nonce });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * Verify signature and authenticate user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      res.status(400).json({ error: 'Wallet address and signature required' });
      return;
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const nonceData = nonces.get(normalizedAddress);

    if (!nonceData) {
      res.status(400).json({ error: 'Nonce not found. Request a new nonce first.' });
      return;
    }

    // Check if nonce is expired (5 minutes)
    if (Date.now() - nonceData.timestamp > 5 * 60 * 1000) {
      nonces.delete(normalizedAddress);
      res.status(400).json({ error: 'Nonce expired. Request a new nonce.' });
      return;
    }

    // Verify signature
    const message = generateNonceMessage(walletAddress, nonceData.nonce);
    const recoveredAddress = verifySignature(message, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      console.error('Signature verification failed:', {
        expected: normalizedAddress,
        recovered: recoveredAddress.toLowerCase(),
        message
      });
      res.status(401).json({ 
        error: 'Invalid signature',
        details: `Expected ${normalizedAddress} but recovered ${recoveredAddress.toLowerCase()}`
      });
      return;
    }

    // Delete used nonce
    nonces.delete(normalizedAddress);

    // Check if user exists in database
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [normalizedAddress]
    );

    let user = userQuery.rows[0];

    // Create user if doesn't exist (default role: customer)
    if (!user) {
      const insertQuery = await pool.query(
        'INSERT INTO users (wallet_address, role) VALUES ($1, $2) RETURNING *',
        [normalizedAddress, 'customer']
      );
      user = insertQuery.rows[0];
    }

    // Generate JWT token
    const token = generateToken(user.wallet_address, user.role);

    res.json({
      token,
      user: {
        walletAddress: user.wallet_address,
        role: user.role,
        name: user.name,
        verificationStatus: user.verification_status,
        artistProfileSubmitted: user.artist_profile_submitted || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Get current user profile
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // This would use the authenticateToken middleware
    res.json({ message: 'Protected route - requires authentication middleware' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
