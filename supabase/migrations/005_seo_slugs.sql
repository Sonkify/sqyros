-- =============================================
-- Sqyros: SEO-Friendly Slugs
-- =============================================

-- 1. Add slug column to saved_guides
ALTER TABLE saved_guides 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- 2. Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_saved_guides_slug ON saved_guides(slug) WHERE is_public = true;

-- 3. Function to generate URL-friendly slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT, guide_id UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
  base_slug VARCHAR(200);
  final_slug VARCHAR(255);
  slug_exists BOOLEAN;
  counter INTEGER := 0;
BEGIN
  -- Convert title to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(title);
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Truncate to 200 chars
  base_slug := left(base_slug, 200);
  
  -- If empty, use a random string
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'guide-' || left(md5(random()::text), 8);
  END IF;
  
  -- Check for uniqueness and add counter if needed
  final_slug := base_slug;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM saved_guides 
      WHERE slug = final_slug AND id != guide_id
    ) INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to auto-set slug when guide is made public
CREATE OR REPLACE FUNCTION set_guide_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate slug when guide is made public and has no slug
  IF NEW.is_public = true AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := generate_slug(
      COALESCE(NEW.guide_content->>'title', 'untitled-guide'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-slug generation
DROP TRIGGER IF EXISTS trigger_set_guide_slug ON saved_guides;
CREATE TRIGGER trigger_set_guide_slug
  BEFORE INSERT OR UPDATE ON saved_guides
  FOR EACH ROW EXECUTE FUNCTION set_guide_slug();

-- 6. Generate slugs for existing public guides
UPDATE saved_guides
SET slug = generate_slug(
  COALESCE(guide_content->>'title', 'untitled-guide'),
  id
)
WHERE is_public = true AND slug IS NULL;
