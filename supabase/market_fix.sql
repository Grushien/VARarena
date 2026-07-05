-- ============================================================
-- VASVÁR ARÉNA — Piac-javítás (vásárlás + visszavonás)
-- FUTTATÁS: Supabase Dashboard → SQL Editor → New query → futtasd le egyben
-- Két hiba volt az előző RLS-szabályokban:
--  1) a vevő UPDATE-jét a WITH CHECK is a régi "sold=false" állapothoz mérte,
--     ezért a vásárlás (sold=false -> true) mindig elbukott.
--  2) hiányzott a DELETE szabály, ezért az eladó soha nem tudta visszavonni
--     a saját hirdetését.
-- ============================================================

drop policy if exists "market_buyer_claim" on public.market_listings;
create policy "market_buyer_claim" on public.market_listings
  for update
  using (sold = false)
  with check (sold = true and buyer_id = auth.uid());

drop policy if exists "market_seller_delete" on public.market_listings;
create policy "market_seller_delete" on public.market_listings
  for delete using (seller_id = auth.uid());
