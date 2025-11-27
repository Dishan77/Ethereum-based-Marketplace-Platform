-- Artist Profiles table
CREATE TABLE IF NOT EXISTS artist_profiles (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    date_of_birth DATE,
    expertise VARCHAR(255),
    experience VARCHAR(100),
    education TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    website VARCHAR(255),
    social_media JSONB,
    art_styles JSONB,
    certifications TEXT,
    portfolio_images JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_artist_profiles_wallet ON artist_profiles(wallet_address);

-- Add trigger for updated_at
CREATE TRIGGER update_artist_profiles_updated_at BEFORE UPDATE ON artist_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add new column to users table to track registration submission
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_profile_submitted BOOLEAN DEFAULT FALSE;
