'use strict';
/* ============================================================
   VASVÁR ARÉNA — Online modul (Supabase)
   Élő ranglista + aszinkron PvP (más játékosok mentett bajnokai ellen).
   Ha nincs kulcs vagy nincs net, a játék helyi riválisokkal fut tovább.
============================================================ */
window.Online = (function () {
  const CFG = {
    url: 'https://yisdmopntamxyswemadr.supabase.co',
    key: 'sb_publishable_dC0NrBDolccFiZklsan32g__bsSdZ1N',
  };

  let client = null;
  let ready = false;
  let myId = null;
  let lastPush = 0;

  async function init() {
    if (!CFG.key || typeof supabase === 'undefined') return false;
    try {
      client = supabase.createClient(CFG.url, CFG.key);
      let session = (await client.auth.getSession()).data.session;
      if (!session) {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      myId = session.user.id;
      ready = true;
      console.log('[Online] kapcsolódva, azonosító:', myId.slice(0, 8));
      return true;
    } catch (e) {
      console.warn('[Online] init hiba (offline mód):', e.message || e);
      ready = false;
      return false;
    }
  }

  /* a felszerelés tömör összefoglalója a PvP-hez */
  function gearSummary(st) {
    const g = {};
    for (const slot in st.equipment) {
      const it = st.equipment[slot];
      if (!it) continue;
      g[slot] = { n: it.name, r: it.rarity, d: it.dmg, a: it.armor, s: it.stats };
    }
    return g;
  }

  /* saját bajnok feltöltése (10 mp-es küszöbbel, hogy ne spammeljük) */
  async function pushProfile(st) {
    if (!ready) return;
    const now = Date.now();
    if (now - lastPush < 10000) return;
    lastPush = now;
    try {
      const total = k => st.stats[k] + Object.values(st.equipment)
        .reduce((s, it) => s + ((it && it.stats && it.stats[k]) || 0), 0);
      await client.from('arena_champions').upsert({
        user_id: myId,
        name: st.name,
        level: st.level,
        fame: st.fame,
        wins: st.wins,
        losses: st.losses,
        skin: st.skin,
        stats: {
          ero: total('ero'), ugyesseg: total('ugyesseg'), reflex: total('reflex'),
          technika: total('technika'), kitartas: total('kitartas'),
        },
        gear: gearSummary(st),
        maxhp: 40 + total('kitartas') * 9 + st.level * 6,
        clan_id: st.clanId || null,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Online] push hiba:', e.message || e);
    }
  }

  function guard(fallback) {
    return !ready ? Promise.resolve(fallback) : null;
  }

  /* ---------------- KLÁN ---------------- */
  async function createClan(name, tag) {
    if (guard()) return { error: 'offline' };
    try {
      const { data, error } = await client.from('clans')
        .insert({ name, tag, leader_id: myId }).select().single();
      if (error) throw error;
      return { data };
    } catch (e) { return { error: e.message || String(e) }; }
  }
  async function getMyClan(clanId) {
    if (!clanId) return null;
    const g = guard(null); if (g !== null) return g;
    try {
      const { data } = await client.from('clans').select('*').eq('id', clanId).single();
      return data || null;
    } catch (e) { return null; }
  }
  async function clanMembers(clanId) {
    const g = guard([]); if (g !== null) return g;
    try {
      const { data } = await client.from('arena_champions')
        .select('user_id,name,level,fame,skin').eq('clan_id', clanId).order('fame', { ascending: false });
      return data || [];
    } catch (e) { return []; }
  }
  async function findClanByTag(nameOrTag) {
    const g = guard(null); if (g !== null) return g;
    try {
      const { data } = await client.from('clans').select('*')
        .or(`name.ilike.${nameOrTag},tag.ilike.${nameOrTag}`).limit(1).maybeSingle();
      return data || null;
    } catch (e) { return null; }
  }
  async function setMyClan(clanId) {
    if (guard()) return false;
    try {
      await client.from('arena_champions').update({ clan_id: clanId }).eq('user_id', myId);
      return true;
    } catch (e) { return false; }
  }
  async function donateToClan(clanId, amount) {
    if (guard()) return false;
    try {
      const { error } = await client.rpc('donate_to_clan', { p_clan_id: clanId, p_amount: amount });
      if (error) throw error;
      return true;
    } catch (e) { console.warn('[Online] adomány hiba:', e.message || e); return false; }
  }
  async function upgradeClan(clanId, track) {
    if (guard()) return { error: 'offline' };
    try {
      const { data, error } = await client.rpc('upgrade_clan_track', { p_clan_id: clanId, p_track: track || 'gold' });
      if (error) throw error;
      return { level: data };
    } catch (e) { return { error: e.message || String(e) }; }
  }
  async function listClans(limit) {
    const g = guard([]); if (g !== null) return g;
    try {
      const { data, error } = await client.rpc('list_clans', { p_limit: limit || 30 });
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn('[Online] klánlista hiba:', e.message || e); return []; }
  }

  /* ---------------- LEVELEK ---------------- */
  async function sendMail(toId, toName, body, kind, gold, item) {
    if (guard()) return false;
    try {
      await client.from('mails').insert({
        from_id: myId, from_name: (window.state && state.name) || 'Bajnok',
        to_id: toId, to_name: toName, kind: kind || 'msg', body: body || '',
        gold: gold || 0, item: item || null,
      });
      return true;
    } catch (e) { console.warn('[Online] mail hiba:', e.message || e); return false; }
  }
  async function inbox() {
    const g = guard([]); if (g !== null) return g;
    try {
      const { data } = await client.from('mails').select('*')
        .eq('to_id', myId).order('created_at', { ascending: false }).limit(40);
      return data || [];
    } catch (e) { return []; }
  }
  async function claimMail(mailId) {
    if (guard()) return false;
    try {
      await client.from('mails').update({ read: true }).eq('id', mailId);
      return true;
    } catch (e) { return false; }
  }
  async function findChampionByName(name) {
    const g = guard(null); if (g !== null) return g;
    try {
      const { data } = await client.from('arena_champions').select('user_id,name')
        .ilike('name', name).limit(1).maybeSingle();
      return data || null;
    } catch (e) { return null; }
  }

  /* ---------------- PIAC ---------------- */
  async function marketList(clanId) {
    const g = guard([]); if (g !== null) return g;
    try {
      let q = client.from('market_listings').select('*').eq('sold', false).order('created_at', { ascending: false }).limit(60);
      q = clanId ? q.eq('clan_id', clanId) : q.is('clan_id', null);
      const { data } = await q;
      return data || [];
    } catch (e) { return []; }
  }
  async function myListings() {
    const g = guard([]); if (g !== null) return g;
    try {
      const { data } = await client.from('market_listings').select('*').eq('seller_id', myId).order('created_at', { ascending: false });
      return data || [];
    } catch (e) { return []; }
  }
  async function createListing(item, price, clanId) {
    if (guard()) return false;
    try {
      await client.from('market_listings').insert({
        seller_id: myId, seller_name: (window.state && state.name) || 'Bajnok',
        item, price, clan_id: clanId || null,
      });
      return true;
    } catch (e) { console.warn('[Online] piac hiba:', e.message || e); return false; }
  }
  async function cancelListing(id) {
    if (guard()) return false;
    try {
      const { data, error } = await client.from('market_listings').delete().eq('id', id).eq('seller_id', myId).select();
      if (error) throw error;
      return !!(data && data.length);
    } catch (e) { console.warn('[Online] visszavonás hiba:', e.message || e); return false; }
  }
  async function buyListing(listing) {
    if (guard()) return { error: 'offline' };
    try {
      const { data, error } = await client.from('market_listings')
        .update({ sold: true, buyer_id: myId }).eq('id', listing.id).eq('sold', false).select();
      if (error) throw error;
      if (!data || !data.length) return { error: 'mar_elkelt' };
      await sendMail(listing.seller_id, listing.seller_name,
        (window.state ? state.name : 'Valaki') + ' megvette: ' + (listing.item.name || listing.item.icon),
        'trade', listing.price, null);
      return { ok: true };
    } catch (e) { return { error: e.message || String(e) }; }
  }

  /* top bajnokok az élő ranglistához */
  async function leaderboard(limit) {
    if (!ready) return null;
    try {
      const { data, error } = await client
        .from('arena_champions')
        .select('user_id,name,level,fame,wins,losses,skin,stats,gear,maxhp')
        .order('fame', { ascending: false })
        .limit(limit || 30);
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Online] ranglista hiba:', e.message || e);
      return null;
    }
  }

  return {
    init, pushProfile, leaderboard,
    createClan, getMyClan, clanMembers, findClanByTag, setMyClan, donateToClan, upgradeClan, listClans,
    sendMail, inbox, claimMail, findChampionByName,
    marketList, myListings, createListing, cancelListing, buyListing,
    isReady: () => ready,
    myId: () => myId,
    hasKey: () => !!CFG.key,
  };
})();
