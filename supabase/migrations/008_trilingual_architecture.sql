-- Migration 008: Trilingual architecture
-- Add English and Spanish content columns.
-- Previously ja_* columns held English content (English-first transition).
-- Now: en_* = English base, ja_* = Japanese, es_* = Spanish.

-- English base columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS en_title   text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS en_summary text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS en_insight text;

-- Spanish columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS es_title   text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS es_summary text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS es_insight text;

-- Backfill: ja_* currently holds English content from the English-first transition.
-- Copy it into the new en_* columns for all existing rows.
UPDATE public.articles
SET
  en_title   = ja_title,
  en_summary = ja_summary,
  en_insight = ja_insight
WHERE en_title IS NULL;

-- Indexes for language-specific queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_articles_en_title ON public.articles(en_title) WHERE en_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_es_title ON public.articles(es_title) WHERE es_title IS NOT NULL;
