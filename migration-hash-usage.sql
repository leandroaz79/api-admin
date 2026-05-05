-- Migration: Add hash columns and usage_logs table

-- Add hash columns to tenants (keep old column for backward compatibility)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_admin_key_hash TEXT;

-- Add hash columns to licenses (keep old column for backward compatibility)
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  model TEXT,
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage_logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_id ON usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_license_id ON usage_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs(model);

-- Add unique constraint on hash columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_api_admin_key_hash ON tenants(api_admin_key_hash) WHERE api_admin_key_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_api_key_hash ON licenses(api_key_hash) WHERE api_key_hash IS NOT NULL;
