-- ============================================================
-- VASVÁR ARÉNA — Klán, Levelezés, Piac
-- FUTTATÁS: Supabase Dashboard → SQL Editor → New query → futtasd le egyben
-- ============================================================

-- Klánok
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tag text not null,
  leader_id uuid not null,
  gold int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.clans enable row level security;
drop policy if exists "clans_read" on public.clans;
create policy "clans_read" on public.clans for select using (true);
drop policy if exists "clans_insert" on public.clans;
create policy "clans_insert" on public.clans for insert with check (leader_id = auth.uid());
drop policy if exists "clans_update" on public.clans;
create policy "clans_update" on public.clans for update using (leader_id = auth.uid());

-- Bajnokok: klán-tagság (a meglévő arena_champions táblát bővítjük)
alter table public.arena_champions add column if not exists clan_id uuid references public.clans(id);

-- Levelek (privát üzenet + kereskedés-értesítés egyben)
create table if not exists public.mails (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null,
  from_name text not null,
  to_id uuid not null,
  to_name text not null,
  kind text not null default 'msg',   -- 'msg' | 'trade'
  body text not null default '',
  gold int not null default 0,
  item jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.mails enable row level security;
drop policy if exists "mails_read" on public.mails;
create policy "mails_read" on public.mails for select using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists "mails_insert" on public.mails;
create policy "mails_insert" on public.mails for insert with check (from_id = auth.uid());
drop policy if exists "mails_update" on public.mails;
create policy "mails_update" on public.mails for update using (to_id = auth.uid());
create index if not exists mails_to_idx on public.mails (to_id, read);

-- Piac (játékos-piac + klán-piac egy táblában; clan_id = null -> nyilvános piac)
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  seller_name text not null,
  item jsonb not null,
  price int not null,
  clan_id uuid references public.clans(id),
  sold boolean not null default false,
  buyer_id uuid,
  created_at timestamptz not null default now()
);
alter table public.market_listings enable row level security;
drop policy if exists "market_read" on public.market_listings;
create policy "market_read" on public.market_listings for select using (true);
drop policy if exists "market_insert" on public.market_listings;
create policy "market_insert" on public.market_listings for insert with check (seller_id = auth.uid());
drop policy if exists "market_seller_update" on public.market_listings;
create policy "market_seller_update" on public.market_listings for update using (seller_id = auth.uid());
drop policy if exists "market_buyer_claim" on public.market_listings;
create policy "market_buyer_claim" on public.market_listings for update using (sold = false);
create index if not exists market_open_idx on public.market_listings (sold, clan_id);

-- Megjegyzés: a piac "vevő lezárja a sold=false sort" mintát használ (atomi race-védelem),
-- az eladó aranyát pedig egy 'trade' tipusú levél kézbesíti, amit az eladó a saját postaládájában
-- vesz át (önmagát írja, ami a mails_update szabállyal engedélyezett). Ez egy hobbi-játékhoz
-- elegendő bizalmi modell, nem véd 100%-ig szándékos csalás ellen (nincs szerveroldali validáció).
