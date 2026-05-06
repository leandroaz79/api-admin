-- Migration: Add encrypted API key storage
-- Date: 2026-05-06
-- Description: Adds api_key_encrypted column to licenses table for secure key storage

-- Add api_key_encrypted column to licenses table
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Add comment
COMMENT ON COLUMN licenses.api_key_encrypted IS 'Encrypted API key using AES-256-GCM (format: iv:encrypted:authTag)';

-- Create index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_licenses_encrypted_key ON licenses(api_key_encrypted);

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'licenses'
  AND column_name = 'api_key_encrypted';
