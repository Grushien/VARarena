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
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Online] push hiba:', e.message || e);
    }
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
    isReady: () => ready,
    myId: () => myId,
    hasKey: () => !!CFG.key,
  };
})();
