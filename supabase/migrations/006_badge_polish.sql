-- =============================================
-- Sqyros: Badge System Polish
-- =============================================

-- 1. Add verification-related badges
INSERT INTO badges (slug, name, description, icon, category) VALUES
  ('first-verification', 'First Verification', 'Verified your first community guide', 'ShieldCheck', 'verification'),
  ('verification-pro', 'Verification Pro', 'Verified 10 community guides', 'Shield', 'verification'),
  ('community-helper', 'Community Helper', 'Verified 25 community guides', 'Heart', 'verification'),
  ('streak-7', 'Week Streak', 'Created guides 7 days in a row', 'Flame', 'engagement'),
  ('popular-guide', 'Popular Guide', 'A guide you created reached 100 views', 'TrendingUp', 'achievement')
ON CONFLICT (name) DO NOTHING;

-- 2. Function to check and award verification badges
CREATE OR REPLACE FUNCTION check_verification_badges(verifier_id TEXT)
RETURNS VOID AS $$
DECLARE
  verification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO verification_count 
  FROM guide_verifications 
  WHERE verified_by = verifier_id AND status = 'verified';
  
  -- First Verification badge
  IF verification_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT verifier_id, id FROM badges WHERE name = 'First Verification'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Verification Pro badge (10+)
  IF verification_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT verifier_id, id FROM badges WHERE name = 'Verification Pro'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Community Helper badge (25+)
  IF verification_count >= 25 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT verifier_id, id FROM badges WHERE name = 'Community Helper'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for verification badges
CREATE OR REPLACE FUNCTION trigger_verification_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    PERFORM check_verification_badges(NEW.verified_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_guide_verified ON guide_verifications;
CREATE TRIGGER trigger_guide_verified
  AFTER INSERT OR UPDATE ON guide_verifications
  FOR EACH ROW EXECUTE FUNCTION trigger_verification_badge();

-- 4. Function to check and award popular guide badge
CREATE OR REPLACE FUNCTION check_popular_guide_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_count >= 100 AND (OLD.view_count IS NULL OR OLD.view_count < 100) THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT NEW.user_id, id FROM badges WHERE name = 'Popular Guide'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_popular_guide ON saved_guides;
CREATE TRIGGER trigger_popular_guide
  AFTER UPDATE ON saved_guides
  FOR EACH ROW
  WHEN (NEW.view_count >= 100)
  EXECUTE FUNCTION check_popular_guide_badge();
