-- Migration 007: Add columns that were created in production but never captured in migrations
-- These columns are referenced by the collector and other routes.

-- business_model: e.g., "SaaS", "Marketplace", "Chrome Extension"
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  business_model text;

-- author_profile_url: link to the post author's profile on the source platform
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  author_profile_url text;

-- difficulty_order: integer sort key derived from ja_difficulty (Easy=1, Medium=2, Hard=3)
-- Used by the "easy" sort in /api/articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  difficulty_order integer GENERATED ALWAYS AS (
    CASE ja_difficulty
      WHEN 'Easy'   THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'Hard'   THEN 3
      ELSE 2
    END
  ) STORED;

-- Index for difficulty sort
CREATE INDEX IF NOT EXISTS idx_articles_difficulty_order
  ON public.articles(difficulty_order ASC NULLS LAST);

-- Index for business model category filtering
CREATE INDEX IF NOT EXISTS idx_articles_business_model
  ON public.articles(business_model);
