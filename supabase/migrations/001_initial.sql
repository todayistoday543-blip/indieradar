-- ユーザーテーブル（Supabase Authと連携）
create table public.profiles (
  id uuid references auth.users on delete cascade,
  email text,
  subscription_status text default 'free',
  stripe_customer_id text,
  created_at timestamptz default now(),
  primary key (id)
);

-- 記事テーブル
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  source text not null,
  original_url text not null unique,
  original_title text,
  original_content text,
  ja_title text,
  ja_summary text,
  ja_insight text,
  ja_difficulty text,
  mrr_mentioned integer,
  upvotes integer default 0,
  is_premium boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- RLS設定
alter table public.articles enable row level security;

create policy "無料記事は全員が読める" on public.articles
  for select using (
    is_premium = false
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and subscription_status in ('basic', 'pro')
    )
  );

alter table public.profiles enable row level security;

create policy "自分のプロフィールのみ閲覧" on public.profiles
  for select using (auth.uid() = id);

create policy "自分のプロフィールのみ更新" on public.profiles
  for update using (auth.uid() = id);

create policy "自分のプロフィールのみ挿入" on public.profiles
  for insert with check (auth.uid() = id);

-- 新規ユーザー登録時にprofilesを自動作成するトリガー
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 記事検索用インデックス
create index idx_articles_source on public.articles(source);
create index idx_articles_created_at on public.articles(created_at desc);
create index idx_articles_is_premium on public.articles(is_premium);
