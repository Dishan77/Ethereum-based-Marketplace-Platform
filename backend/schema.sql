-- KALA 2.0 Database Schema for Neon DB (PostgreSQL)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'seller', 'customer')),
    name VARCHAR(255),
    bio TEXT,
    govt_id VARCHAR(100),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Artworks table
CREATE TABLE IF NOT EXISTS artworks (
    id SERIAL PRIMARY KEY,
    blockchain_id INTEGER NOT NULL,
    seller_address VARCHAR(42) NOT NULL,
    qr_code_url TEXT,
    ipfs_metadata_hash TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Create index for faster blockchain_id lookups
CREATE INDEX IF NOT EXISTS idx_artworks_blockchain_id ON artworks(blockchain_id);
CREATE INDEX IF NOT EXISTS idx_artworks_seller ON artworks(seller_address);

-- QR Scans table
CREATE TABLE IF NOT EXISTS qr_scans (
    id SERIAL PRIMARY KEY,
    artwork_id INTEGER NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

-- Create index for faster artwork scan lookups
CREATE INDEX IF NOT EXISTS idx_qr_scans_artwork ON qr_scans(artwork_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    artwork_id INTEGER NOT NULL,
    reviewer_address VARCHAR(42) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    UNIQUE(artwork_id, reviewer_address)
);

-- Create index for faster artwork review lookups
CREATE INDEX IF NOT EXISTS idx_reviews_artwork ON reviews(artwork_id);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    artwork_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
    UNIQUE(user_address, artwork_id)
);

-- Create index for faster user wishlist lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_address);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    artwork_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
    UNIQUE(user_address, artwork_id)
);

-- Create index for faster user cart lookups
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_address);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Create index for faster user notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_address);

-- Update trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artworks_updated_at BEFORE UPDATE ON artworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
