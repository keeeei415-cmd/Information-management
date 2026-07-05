-- ============================================================
-- 情報管理アプリ スキーマ
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- タブ ----------
create table if not exists public.tabs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- カード ----------
create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  tab_id      uuid not null references public.tabs(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  category    text,
  tags        text[] not null default '{}',
  pinned      boolean not null default false,
  completed   boolean not null default false,
  color       text not null default 'default',
  due_date    timestamptz,
  position    integer not null default 0,

  -- ▼ 将来の機能拡張用 (今は未使用。アプリ側は deleted_at is null のみ取得)
  archived_at timestamptz,            -- アーカイブ機能
  deleted_at  timestamptz,            -- ゴミ箱機能 (ソフトデリート)
  metadata    jsonb not null default '{}',  -- チェックリスト・添付・リマインダー等

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cards_tab_id_idx on public.cards (tab_id);
create index if not exists cards_tags_idx   on public.cards using gin (tags);
create index if not exists cards_due_idx    on public.cards (due_date);

-- ---------- updated_at 自動更新 ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tabs_set_updated_at on public.tabs;
create trigger tabs_set_updated_at
  before update on public.tabs
  for each row execute function public.set_updated_at();

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
-- 現状は「個人利用・ログインなし」を想定し、anon キーでの全操作を許可する。
-- ※ URL と anon キーを知っていれば誰でも読み書きできる点に注意。
--    複数ユーザー対応・ログイン導入時は README の「認証の追加」を参照。
alter table public.tabs  enable row level security;
alter table public.cards enable row level security;

drop policy if exists "tabs_anon_all"  on public.tabs;
create policy "tabs_anon_all"  on public.tabs  for all using (true) with check (true);

drop policy if exists "cards_anon_all" on public.cards;
create policy "cards_anon_all" on public.cards for all using (true) with check (true);

-- ---------- 初期データ (任意: 不要なら削除) ----------
insert into public.tabs (name, position)
select * from (values ('ToDo', 0), ('メモ', 1)) as v(name, position)
where not exists (select 1 from public.tabs);
