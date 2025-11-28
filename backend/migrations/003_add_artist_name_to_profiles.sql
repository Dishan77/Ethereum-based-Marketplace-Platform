-- Add artist_name column to artist_profiles table
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS artist_name VARCHAR(255);

-- Update existing records to populate artist_name from users table
UPDATE artist_profiles ap
SET artist_name = u.name
FROM users u
WHERE ap.wallet_address = u.wallet_address;
