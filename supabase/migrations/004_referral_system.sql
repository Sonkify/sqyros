-- =============================================
-- Sqyros: Referral System
-- =============================================

-- 1. Referral codes table (one per user)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  code VARCHAR(12) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referred_id TEXT UNIQUE NOT NULL,
  referral_code VARCHAR(12) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  rewarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(target_user_id TEXT)
RETURNS VARCHAR(12) AS $$
DECLARE
  new_code VARCHAR(12);
  code_exists BOOLEAN;
BEGIN
  -- Check if user already has a code
  SELECT code INTO new_code FROM referral_codes WHERE user_id = target_user_id;
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate unique 8-char alphanumeric code
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert the new code
  INSERT INTO referral_codes (user_id, code) VALUES (target_user_id, new_code);
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to track a referral signup
CREATE OR REPLACE FUNCTION track_referral(referral_code_input VARCHAR(12), new_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  referrer TEXT;
BEGIN
  -- Find the referrer
  SELECT user_id INTO referrer FROM referral_codes WHERE code = referral_code_input;
  
  IF referrer IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Don't allow self-referral
  IF referrer = new_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this user was already referred
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
  VALUES (referrer, new_user_id, referral_code_input, 'completed');
  
  -- Update referrer's reputation (bonus 25 points per referral)
  UPDATE user_profiles 
  SET reputation_score = reputation_score + 25
  WHERE id = referrer;
  
  -- Check for referral badges
  PERFORM check_referral_badges(referrer);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check and award referral badges
CREATE OR REPLACE FUNCTION check_referral_badges(target_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  referral_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO referral_count FROM referrals WHERE referrer_id = target_user_id;
  
  -- First Referral badge
  IF referral_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'First Referral'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Referral Pro badge (10+ referrals)
  IF referral_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT target_user_id, id FROM badges WHERE name = 'Referral Pro'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure name is unique in badges table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'badges_name_unique') THEN
    ALTER TABLE badges ADD CONSTRAINT badges_name_unique UNIQUE (name);
  END IF;
END;
$$;

-- 7. Add referral badges to badges table
INSERT INTO badges (slug, name, description, icon, category) VALUES
  ('first-referral', 'First Referral', 'Referred your first user to Sqyros', 'UserPlus', 'referral'),
  ('referral-pro', 'Referral Pro', 'Referred 10 users to Sqyros', 'Users', 'referral')
ON CONFLICT (name) DO NOTHING;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- 9. RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY "Users can read own referral code" ON referral_codes
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can read referrals they made
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (referrer_id = current_setting('request.jwt.claims', true)::json->>'sub');
