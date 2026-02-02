-- Migration: Community Platform Features

-- 1. Extend user_profiles with community fields
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company VARCHAR(100),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS guides_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_guides_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified_pro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- 2. Badges system
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- 3. Guide ratings
CREATE TABLE IF NOT EXISTS guide_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guide_id, user_id)
);

-- 4. Guide verifications (community verified guides)
CREATE TABLE IF NOT EXISTS guide_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  verified_by TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_verifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Service role can award badges" ON user_badges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view ratings" ON guide_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON guide_ratings FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can update own ratings" ON guide_ratings FOR UPDATE
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Anyone can view verifications" ON guide_verifications FOR SELECT USING (true);
CREATE POLICY "Users can insert verifications" ON guide_verifications FOR INSERT
  WITH CHECK (verified_by = auth.jwt() ->> 'sub');

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_guide_ratings_guide ON guide_ratings(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_verifications_guide ON guide_verifications(guide_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- 8. Seed default badges
INSERT INTO badges (slug, name, description, icon, category, requirements) VALUES
  ('first-guide', 'First Guide', 'Published your first community guide', 'BookOpen', 'milestone', '{"guides_count": 1}'),
  ('five-guides', 'Guide Creator', 'Published 5 community guides', 'Award', 'milestone', '{"guides_count": 5}'),
  ('ten-guides', 'Guide Master', 'Published 10 community guides', 'Trophy', 'milestone', '{"guides_count": 10}'),
  ('dante-expert', 'Dante Expert', 'Published 3+ Dante integration guides', 'Zap', 'expertise', '{"specialty": "Dante", "guides_count": 3}'),
  ('crestron-expert', 'Crestron Expert', 'Published 3+ Crestron integration guides', 'Zap', 'expertise', '{"specialty": "Crestron", "guides_count": 3}'),
  ('qsc-expert', 'Q-SYS Expert', 'Published 3+ QSC Q-SYS guides', 'Zap', 'expertise', '{"specialty": "QSC", "guides_count": 3}'),
  ('helpful', 'Helpful', 'Received 10+ ratings on your guides', 'Heart', 'contribution', '{"ratings_received": 10}'),
  ('verified-pro', 'Verified Pro', 'Verified AV professional with certifications', 'CheckCircle', 'special', '{"is_verified": true}'),
  ('early-adopter', 'Early Adopter', 'Joined Sqyros during beta', 'Sparkles', 'special', '{"early_adopter": true}')
ON CONFLICT (slug) DO NOTHING;
