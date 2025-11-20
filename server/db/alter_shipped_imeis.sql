-- Safe migration to add metadata columns to shipped_imeis table
-- This migration checks if columns exist before adding them

DO $$
BEGIN
    -- Add source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shipped_imeis'
                   AND column_name = 'source') THEN
        ALTER TABLE shipped_imeis
        ADD COLUMN source TEXT DEFAULT 'unknown' NOT NULL;
    END IF;

    -- Add model column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shipped_imeis'
                   AND column_name = 'model') THEN
        ALTER TABLE shipped_imeis
        ADD COLUMN model TEXT;
    END IF;

    -- Add grade column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shipped_imeis'
                   AND column_name = 'grade') THEN
        ALTER TABLE shipped_imeis
        ADD COLUMN grade TEXT;
    END IF;

    -- Add supplier column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shipped_imeis'
                   AND column_name = 'supplier') THEN
        ALTER TABLE shipped_imeis
        ADD COLUMN supplier TEXT;
    END IF;

    -- Create index on source if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'shipped_imeis'
                   AND indexname = 'idx_shipped_imeis_source') THEN
        CREATE INDEX idx_shipped_imeis_source ON shipped_imeis(source);
    END IF;

    -- Create index on created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'shipped_imeis'
                   AND indexname = 'idx_shipped_imeis_created_at') THEN
        CREATE INDEX idx_shipped_imeis_created_at ON shipped_imeis(created_at);
    END IF;
END
$$;