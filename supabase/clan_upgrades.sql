-- ============================================================
-- VASVÁR ARÉNA — Klán-kassza + fejlesztés
-- FUTTATÁS: Supabase Dashboard → SQL Editor → New query → futtasd le egyben
-- (a clans_mail_market.sql-t már lefuttattad, ez csak ráépül arra)
-- ============================================================

alter table public.clans add column if not exists level int not null default 1;

-- Adományozás: bárki (klántag) hozzáadhat aranyat a kasszához, atomi növeléssel
create or replace function public.donate_to_clan(p_clan_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  update public.clans set gold = gold + p_amount where id = p_clan_id;
end; $$;

-- Fejlesztés: csak a vezető, csak ha van elég arany a kasszában (szerveroldali ellenőrzés!)
create or replace function public.upgrade_clan(p_clan_id uuid)
returns int language plpgsql security definer as $$
declare v_level int; v_gold int; v_cost int;
begin
  select level, gold into v_level, v_gold from public.clans where id = p_clan_id and leader_id = auth.uid();
  if v_level is null then raise exception 'not_leader'; end if;
  v_cost := 500 * v_level;
  if v_gold < v_cost then raise exception 'not_enough_gold'; end if;
  update public.clans set gold = gold - v_cost, level = level + 1 where id = p_clan_id;
  return v_level + 1;
end; $$;

grant execute on function public.donate_to_clan(uuid, int) to anon, authenticated;
grant execute on function public.upgrade_clan(uuid) to anon, authenticated;
