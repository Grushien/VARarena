-- ============================================================
-- VASVÁR ARÉNA — Klán: több fejlesztési irány + tagszám lekérdezés
-- FUTTATÁS: Supabase Dashboard → SQL Editor → New query → futtasd le egyben
-- (a clan_upgrades.sql-t már lefuttattad, ez csak ráépül arra)
-- ============================================================

alter table public.clans add column if not exists level_hp int not null default 1;
alter table public.clans add column if not exists level_fame int not null default 1;

-- Általánosított fejlesztés-függvény: 'gold' (arany/XP jutalom), 'hp' (életerő), 'fame' (hírnév)
create or replace function public.upgrade_clan_track(p_clan_id uuid, p_track text)
returns int language plpgsql security definer as $$
declare v_level int; v_gold int; v_cost int; v_col text;
begin
  if p_track not in ('gold', 'hp', 'fame') then raise exception 'invalid_track'; end if;
  v_col := case p_track when 'gold' then 'level' when 'hp' then 'level_hp' else 'level_fame' end;
  execute format('select %I from public.clans where id = $1 and leader_id = auth.uid()', v_col)
    into v_level using p_clan_id;
  if v_level is null then raise exception 'not_leader'; end if;
  select gold into v_gold from public.clans where id = p_clan_id;
  v_cost := case p_track when 'gold' then 500 * v_level when 'hp' then 400 * v_level else 600 * v_level end;
  if v_gold < v_cost then raise exception 'not_enough_gold'; end if;
  execute format('update public.clans set gold = gold - $1, %I = %I + 1 where id = $2', v_col, v_col)
    using v_cost, p_clan_id;
  return v_level + 1;
end; $$;

grant execute on function public.upgrade_clan_track(uuid, text) to anon, authenticated;

-- Nyilvános klánlista tagszámmal, csatlakozáshoz (böngészhető lista a Klán fülön)
create or replace function public.list_clans(p_limit int default 30)
returns table(id uuid, name text, tag text, level int, member_count bigint)
language sql stable as $$
  select c.id, c.name, c.tag, c.level, count(a.user_id) as member_count
  from public.clans c
  left join public.arena_champions a on a.clan_id = c.id
  group by c.id, c.name, c.tag, c.level
  order by member_count desc, c.level desc
  limit p_limit;
$$;

grant execute on function public.list_clans(int) to anon, authenticated;
