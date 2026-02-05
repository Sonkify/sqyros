CREATE OR REPLACE FUNCTION calculate_reputation(target_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  guide_points INTEGER;
  rating_points INTEGER;
  verified_points INTEGER;
  total INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*) * 10, 0) INTO guide_points
  FROM saved_guides
  WHERE user_id = target_user_id AND is_public = true;

  SELECT COALESCE(ROUND(AVG(rating) * 20), 0) INTO rating_points
  FROM guide_ratings
  WHERE guide_id IN (
    SELECT id FROM saved_guides WHERE user_id = target_user_id AND is_public = true
  );

  SELECT COALESCE(COUNT(*) * 50, 0) INTO verified_points
  FROM guide_verifications
  WHERE guide_id IN (
    SELECT id FROM saved_guides WHERE user_id = target_user_id
  ) AND status = 'verified';

  total := guide_points + rating_points + verified_points;

  UPDATE user_profiles
  SET reputation_score = total,
      guides_count = (SELECT COUNT(*) FROM saved_guides WHERE user_id = target_user_id AND is_public = true)
  WHERE id = target_user_id;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION check_and_award_badges(target_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  public_count INTEGER;
  rating_avg NUMERIC;
  rep_score INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_count
  FROM saved_guides WHERE user_id = target_user_id AND is_public = true;

  SELECT COALESCE(AVG(rating), 0) INTO rating_avg
  FROM guide_ratings
  WHERE guide_id IN (SELECT id FROM saved_guides WHERE user_id = target_user_id);

  SELECT COALESCE(reputation_score, 0) INTO rep_score
  FROM user_profiles WHERE id = target_user_id;

  IF public_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'First Guide'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF public_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'Guide Master'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF rating_avg >= 4.5 AND public_count >= 3 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'Top Rated'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF rep_score >= 100 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'Rising Star'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF rep_score >= 500 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'AV Expert'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION on_guide_shared()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    PERFORM calculate_reputation(NEW.user_id);
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_guide_shared ON saved_guides;
CREATE TRIGGER trigger_guide_shared
  AFTER UPDATE OF is_public ON saved_guides
  FOR EACH ROW
  EXECUTE FUNCTION on_guide_shared();


CREATE OR REPLACE FUNCTION on_guide_rated()
RETURNS TRIGGER AS $$
DECLARE
  guide_owner TEXT;
BEGIN
  SELECT user_id INTO guide_owner FROM saved_guides WHERE id = NEW.guide_id;
  IF guide_owner IS NOT NULL THEN
    PERFORM calculate_reputation(guide_owner);
    PERFORM check_and_award_badges(guide_owner);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_guide_rated ON guide_ratings;
CREATE TRIGGER trigger_guide_rated
  AFTER INSERT OR UPDATE ON guide_ratings
  FOR EACH ROW
  EXECUTE FUNCTION on_guide_rated();


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_id_badge_id_key'
  ) THEN
    ALTER TABLE user_badges ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
  END IF;
END;
$$;
