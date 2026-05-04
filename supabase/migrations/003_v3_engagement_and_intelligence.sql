-- ============================================================
-- Migration 003: Engagement tracking + Market Intelligence
-- ============================================================

-- 1. Profile country fields (for market intelligence)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  country_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  country_name text;

-- 2. Article engagement counters
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  view_count integer default 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  upvote_count integer default 0;

-- 3. Article views table (session-based dedup)
CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.articles(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_article_views_article_session
  ON public.article_views(article_id, session_id, created_at);

-- 4. Article votes table (user-based)
CREATE TABLE IF NOT EXISTS public.article_votes (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.articles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_votes_article
  ON public.article_votes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_votes_user
  ON public.article_votes(user_id);

-- 5. RPC: Atomic view count increment
CREATE OR REPLACE FUNCTION public.increment_view_count(article_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id_param;
END;
$$;

-- 6. RPC: Atomic upvote count increment
CREATE OR REPLACE FUNCTION public.increment_upvote_count(article_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.articles
  SET upvote_count = COALESCE(upvote_count, 0) + 1
  WHERE id = article_id_param;
END;
$$;

-- 7. RPC: Atomic upvote count decrement
CREATE OR REPLACE FUNCTION public.decrement_upvote_count(article_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.articles
  SET upvote_count = GREATEST(COALESCE(upvote_count, 0) - 1, 0)
  WHERE id = article_id_param;
END;
$$;

-- 8. RLS for article_views (public insert for anonymous tracking)
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert article views"
  ON public.article_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read article views"
  ON public.article_views FOR SELECT
  USING (true);

-- 9. RLS for article_votes (authenticated only)
ALTER TABLE public.article_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can vote"
  ON public.article_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.article_votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read votes"
  ON public.article_votes FOR SELECT
  USING (true);

-- 10. Additional indexes for sort queries
CREATE INDEX IF NOT EXISTS idx_articles_view_count
  ON public.articles(view_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_upvote_count
  ON public.articles(upvote_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON public.articles(published_at DESC NULLS LAST);

-- 11. Profiles RLS update for country fields
CREATE POLICY "Users can update own country" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 12. Upsert-friendly profiles policy
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
