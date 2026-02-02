-- Migration: Adapt database for Clerk authentication

-- 1. Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop ALL RLS policies on ALL tables
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Service role can insert usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Users can view own monthly usage" ON monthly_usage;
DROP POLICY IF EXISTS "Service role can manage monthly usage" ON monthly_usage;
DROP POLICY IF EXISTS "Users can view own guides" ON saved_guides;
DROP POLICY IF EXISTS "Users can insert own guides" ON saved_guides;
DROP POLICY IF EXISTS "Users can update own guides" ON saved_guides;
DROP POLICY IF EXISTS "Users can delete own guides" ON saved_guides;
DROP POLICY IF EXISTS "Anyone can view public guides" ON saved_guides;
DROP POLICY IF EXISTS "Service role can update public guide stats" ON saved_guides;
DROP POLICY IF EXISTS "Users can view own chats" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chats" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chats" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chats" ON chat_sessions;
DROP POLICY IF EXISTS "Service role can insert guide views" ON guide_views;
DROP POLICY IF EXISTS "Users can view their own guide views" ON guide_views;

-- 3. Drop ALL foreign keys
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_user_id_fkey;
ALTER TABLE monthly_usage DROP CONSTRAINT IF EXISTS monthly_usage_user_id_fkey;
ALTER TABLE saved_guides DROP CONSTRAINT IF EXISTS saved_guides_user_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE guide_views DROP CONSTRAINT IF EXISTS guide_views_viewer_id_fkey;
ALTER TABLE guide_views DROP CONSTRAINT IF EXISTS guide_views_guide_id_fkey;

-- 4. Change column types
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
ALTER TABLE user_profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE user_profiles ADD PRIMARY KEY (id);

ALTER TABLE usage_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE monthly_usage ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE saved_guides ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE chat_sessions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE guide_views ALTER COLUMN viewer_id TYPE TEXT;

-- 5. Re-add guide_views foreign key to saved_guides (guide_id stays UUID)
ALTER TABLE guide_views ADD CONSTRAINT guide_views_guide_id_fkey
  FOREIGN KEY (guide_id) REFERENCES saved_guides(id) ON DELETE CASCADE;

-- 6. Recreate all RLS policies using Clerk JWT
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT
  USING (id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT
  WITH CHECK (id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE
  USING (id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view own usage logs" ON usage_logs FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Service role can insert usage logs" ON usage_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own monthly usage" ON monthly_usage FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Service role can manage monthly usage" ON monthly_usage FOR ALL
  USING (true);

CREATE POLICY "Users can view own guides" ON saved_guides FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can insert own guides" ON saved_guides FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can update own guides" ON saved_guides FOR UPDATE
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can delete own guides" ON saved_guides FOR DELETE
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Anyone can view public guides" ON saved_guides FOR SELECT
  USING (is_public = true);
CREATE POLICY "Service role can update public guide stats" ON saved_guides FOR UPDATE
  USING (is_public = true) WITH CHECK (is_public = true);

CREATE POLICY "Users can view own chats" ON chat_sessions FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can insert own chats" ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can update own chats" ON chat_sessions FOR UPDATE
  USING (user_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can delete own chats" ON chat_sessions FOR DELETE
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Service role can insert guide views" ON guide_views FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own guide views" ON guide_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_guides sg
      WHERE sg.id = guide_views.guide_id
      AND sg.user_id = auth.jwt() ->> 'sub'
    )
  );
