-- Migration: Add metadata columns to shipped_imeis table
-- This migration adds source tracking and metadata for better IMEI management

-- Add new columns to the existing shipped_imeis table
ALTER TABLE shipped_imeis
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown' NOT NULL,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Create index on source for better performance
CREATE INDEX IF NOT EXISTS idx_shipped_imeis_source ON shipped_imeis(source);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_shipped_imeis_created_at ON shipped_imeis(created_at);

-- Update existing records to have 'unknown' source (already handled by default)
-- This is a no-op since the default value handles it, but included for clarity
UPDATE shipped_imeis
SET source = 'unknown'
WHERE source IS NULL;