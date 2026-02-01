-- Shareable Guides Schema Migration
-- Phase 1: Enable public sharing of guides with unique URLs

-- Add public sharing fields to saved_guides table
ALTER TABLE saved_guides
ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast public guide lookups
CREATE INDEX IF NOT EXISTS idx_saved_guides_public_id ON saved_guides(public_id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_saved_guides_public ON saved_guides(is_public, created_at DESC);

-- Function to generate short unique IDs (8 alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate public_id when guide is made public
CREATE OR REPLACE FUNCTION set_public_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_public_id ON saved_guides;
CREATE TRIGGER trigger_set_public_id
BEFORE INSERT OR UPDATE ON saved_guides
FOR EACH ROW EXECUTE FUNCTION set_public_id();

-- Public guide views table for analytics
CREATE TABLE IF NOT EXISTS guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip VARCHAR(45),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on guide_views
ALTER TABLE guide_views ENABLE ROW LEVEL SECURITY;

-- Index for guide views analytics
CREATE INDEX IF NOT EXISTS idx_guide_views_guide_id ON guide_views(guide_id, created_at DESC);

-- RLS Policies for guide_views
CREATE POLICY "Service role can insert guide views"
    ON guide_views FOR INSERT
    WITH CHECK (true);  -- Edge functions use service role

CREATE POLICY "Users can view their own guide views"
    ON guide_views FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM saved_guides sg
            WHERE sg.id = guide_views.guide_id
            AND sg.user_id = auth.uid()
        )
    );

-- RLS Policy for public guide access (anonymous read)
CREATE POLICY "Anyone can view public guides"
    ON saved_guides FOR SELECT
    USING (is_public = true);

-- Policy to allow service role to update view counts
CREATE POLICY "Service role can update public guide stats"
    ON saved_guides FOR UPDATE
    USING (is_public = true)
    WITH CHECK (is_public = true);
