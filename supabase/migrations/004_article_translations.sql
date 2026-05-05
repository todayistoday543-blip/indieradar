-- Article translations cache table
-- Stores on-demand translations of article content per locale
CREATE TABLE IF NOT EXISTS article_translations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  locale text NOT NULL,
  summary text,
  insight text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, locale)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_article_translations_lookup
  ON article_translations(article_id, locale);

-- RLS: allow public read, service role write
ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read translations" ON article_translations
  FOR SELECT USING (true);

CREATE POLICY "Service role insert translations" ON article_translations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update translations" ON article_translations
  FOR UPDATE USING (true);
