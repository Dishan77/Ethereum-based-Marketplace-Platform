import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

export interface JWTPayload {
  walletAddress: string;
  role: string;
}

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (walletAddress: string, role: string): string => {
  const payload: JWTPayload = {
    walletAddress,
    role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify MetaMask signature
 */
export const verifySignature = (message: string, signature: string): string => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress;
  } catch (error) {
    throw new Error('Invalid signature');
  }
};

/**
 * Generate nonce message for signing
 */
export const generateNonceMessage = (walletAddress: string, nonce: string): string => {
  return `Welcome to KALA Marketplace!\n\nSign this message to authenticate.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nThis signature will not trigger any blockchain transaction or cost gas.`;
};
