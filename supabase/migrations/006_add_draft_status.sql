-- Migration 006: Add 'draft' to articles status constraint
-- Previously allowed: published, pending, rejected
-- Now also allows: draft (for non-business articles demoted from feed)

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles ADD CONSTRAINT articles_status_check
  CHECK (status = ANY (ARRAY['published'::text, 'pending'::text, 'rejected'::text, 'draft'::text]));
