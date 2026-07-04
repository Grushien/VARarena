-- ============================================================
-- VASVÁR ARÉNA — Supabase adatbázis-beállítás
-- FUTTATÁS: Supabase Dashboard → SQL Editor → New query →
--           illeszd be ezt az egészet → RUN gomb
-- ============================================================

-- A bajnokok táblája: minden játékos egy sor (élő ranglista + PvP)
create table if not exists public.arena_champions (
  user_id uuid primary key default auth.uid(),
  name text not null default 'Bajnok',
  level int not null default 1,
  fame int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  skin text not null default 'ronin',
  stats jsonb not null default '{}'::jsonb,
  gear jsonb not null default '{}'::jsonb,
  maxhp int not null default 90,
  updated_at timestamptz not null default now()
);

-- Sor-szintű biztonság: mindenki olvashat, de csak a sajátját írhatja
alter table public.arena_champions enable row level security;

drop policy if exists "read_all" on public.arena_champions;
create policy "read_all" on public.arena_champions
  for select using (true);

drop policy if exists "insert_own" on public.arena_champions;
create policy "insert_own" on public.arena_champions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own" on public.arena_champions;
create policy "update_own" on public.arena_champions
  for update using (auth.uid() = user_id);

-- Gyors ranglista- és ellenfél-lekérdezésekhez
create index if not exists arena_champions_fame_idx on public.arena_champions (fame desc);
create index if not exists arena_champions_level_idx on public.arena_champions (level);
