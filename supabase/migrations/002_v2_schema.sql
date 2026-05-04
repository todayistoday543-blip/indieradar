-- 記事テーブルにフィールド追加
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  author_id uuid references public.profiles(id) on delete set null;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  source_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  source_type text default 'auto';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  ad_revenue_usd numeric(10,4) default 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS
  status text default 'published';

-- 広告収益還元テーブル
CREATE TABLE IF NOT EXISTS public.revenue_shares (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.articles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  period_month text not null,
  impressions integer default 0,
  revenue_usd numeric(10,4) default 0,
  paid_out boolean default false,
  created_at timestamptz default now()
);

-- プロフィールテーブルにフィールド追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  total_earnings_usd numeric(10,4) default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  subscription_plan text default 'free';

-- RLS: revenue_shares
ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "著者は自分の収益を閲覧できる" ON public.revenue_shares
  FOR SELECT USING (auth.uid() = author_id);

-- RLS更新: ユーザー投稿記事は本人のみ編集可
CREATE POLICY "著者は自分の記事を編集できる" ON public.articles
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "ユーザー投稿は全員が送信できる" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = author_id AND source_type = 'user');

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_source_type ON public.articles(source_type);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_author ON public.revenue_shares(author_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_period ON public.revenue_shares(period_month);
