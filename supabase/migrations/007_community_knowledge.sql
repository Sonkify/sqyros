-- =============================================
-- Sqyros: Community Knowledge & Tips System
-- =============================================

-- 1. Community tips/knowledge table
CREATE TABLE IF NOT EXISTS guide_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  tip_type VARCHAR(30) NOT NULL DEFAULT 'tip',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tip types: 'tip', 'warning', 'troubleshooting', 'alternative', 'gotcha'

-- 2. Votes tracking to prevent double voting
CREATE TABLE IF NOT EXISTS guide_tip_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID REFERENCES guide_tips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tip_id, user_id)
);

-- 3. General knowledge base (not tied to specific guides)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  upvotes INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories: 'common_issue', 'firmware_tip', 'network_config', 'factory_reset', 
--             'compatibility', 'best_practice', 'workaround', 'undocumented_feature'

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_guide_tips_guide ON guide_tips(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_tips_user ON guide_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_tips_type ON guide_tips(tip_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_device ON knowledge_base(device_brand, device_model);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- 5. RLS policies
ALTER TABLE guide_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_tip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Anyone can read tips
CREATE POLICY "Anyone can read guide tips" ON guide_tips FOR SELECT USING (true);
CREATE POLICY "Anyone can read knowledge base" ON knowledge_base FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can add tips" ON guide_tips FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can add knowledge" ON knowledge_base FOR INSERT WITH CHECK (true);

-- Users can update their own
CREATE POLICY "Users can update own tips" ON guide_tips FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can update own knowledge" ON knowledge_base FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Voting policies
CREATE POLICY "Anyone can read votes" ON guide_tip_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON guide_tip_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can change own vote" ON guide_tip_votes FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 6. Function to handle voting
CREATE OR REPLACE FUNCTION vote_on_tip(tip_uuid UUID, voter_id TEXT, vote VARCHAR(10))
RETURNS VOID AS $$
DECLARE
  existing_vote VARCHAR(10);
BEGIN
  -- Check for existing vote
  SELECT vote_type INTO existing_vote 
  FROM guide_tip_votes 
  WHERE tip_id = tip_uuid AND user_id = voter_id;
  
  IF existing_vote IS NULL THEN
    -- New vote
    INSERT INTO guide_tip_votes (tip_id, user_id, vote_type) VALUES (tip_uuid, voter_id, vote);
    IF vote = 'up' THEN
      UPDATE guide_tips SET upvotes = upvotes + 1 WHERE id = tip_uuid;
    ELSE
      UPDATE guide_tips SET downvotes = downvotes + 1 WHERE id = tip_uuid;
    END IF;
  ELSIF existing_vote != vote THEN
    -- Changing vote
    UPDATE guide_tip_votes SET vote_type = vote WHERE tip_id = tip_uuid AND user_id = voter_id;
    IF vote = 'up' THEN
      UPDATE guide_tips SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = tip_uuid;
    ELSE
      UPDATE guide_tips SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = tip_uuid;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Badge for knowledge contributors
INSERT INTO badges (slug, name, description, icon, category) VALUES
  ('first-tip', 'First Tip', 'Shared your first field tip with the community', 'Lightbulb', 'community'),
  ('knowledge-sharer', 'Knowledge Sharer', 'Shared 10 tips with the community', 'BookOpen', 'community'),
  ('field-expert', 'Field Expert', 'Your tips received 50 upvotes', 'Award', 'community')
ON CONFLICT (name) DO NOTHING;
