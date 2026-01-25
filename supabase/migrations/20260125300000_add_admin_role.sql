-- Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create partial index for efficient admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Add comment
COMMENT ON COLUMN profiles.is_admin IS 'Whether the user has admin privileges to access the admin dashboard';
