'use strict';
/* CrazyGames SDK wrapper — saját domainen csendben inaktív */
window.CG = (function () {
  let sdk = null, ok = false, fightCount = 0, wantsLoadingDone = false;
  let readyResolve;
  const ready = new Promise(r => { readyResolve = r; });
  async function init() {
    try {
      if (!window.CrazyGames) return;
      sdk = window.CrazyGames.SDK;
      await sdk.init();
      if (sdk.environment !== 'crazygames' && sdk.environment !== 'local') { sdk = null; return; }
      ok = true;
      try { sdk.game.loadingStart(); if (wantsLoadingDone) sdk.game.loadingStop(); } catch (e) {}
      const s = sdk.game.settings;
      if (s && s.muteAudio && window.state) state.muted = true;
      sdk.game.addSettingsChangeListener(ns => { if (ns.muteAudio && window.state) state.muted = true; });
      // első CG-indításnál a meglévő localStorage-mentés átmásolása a data module-ba
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (sdk.data.getItem(k) === null) sdk.data.setItem(k, localStorage.getItem(k));
        }
      } catch (e) {}
    } catch (e) { sdk = null; ok = false; }
    finally { readyResolve(); }
  }
  const guard = f => { try { if (ok) f(); } catch (e) {} };
  return {
    init,
    ready,
    available: () => ok,
    loadingDone: () => { wantsLoadingDone = true; try { if (ok) sdk.game.loadingStop(); } catch (e) {} },
    locale: () => {
      try { return (ok && sdk.user.systemInfo.locale) || null; } catch (e) { return null; }
    },
    storage: {
      getItem: k => (ok && sdk.data) ? sdk.data.getItem(k) : localStorage.getItem(k),
      setItem: (k, v) => { if (ok && sdk.data) sdk.data.setItem(k, v); else localStorage.setItem(k, v); },
      removeItem: k => { if (ok && sdk.data) sdk.data.removeItem(k); else localStorage.removeItem(k); },
    },
    start: () => guard(() => sdk.game.gameplayStart()),
    stop: () => guard(() => sdk.game.gameplayStop()),
    happy: () => guard(() => sdk.game.happytime()),
    fightEnded() {
      fightCount++;
      if (ok && fightCount % 4 === 0) {
        try {
          const was = window.state && state.muted;
          sdk.ad.requestAd('midgame', {
            adStarted: () => { if (window.state) state.muted = true; },
            adFinished: () => { if (window.state) state.muted = was; },
            adError: () => { if (window.state) state.muted = was; },
          });
        } catch (e) {}
      }
    },
    rewarded(cb) {
      if (!ok) return false;
      try {
        const was = state.muted;
        sdk.ad.requestAd('rewarded', {
          adStarted: () => { state.muted = true; },
          adFinished: () => { state.muted = was; if (cb) cb(); },
          adError: () => { state.muted = was; },
        });
        return true;
      } catch (e) { return false; }
    },
  };
})();
CG.init();
