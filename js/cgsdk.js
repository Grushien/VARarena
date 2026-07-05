'use strict';
/* CrazyGames SDK wrapper — saját domainen csendben inaktív */
window.CG = (function () {
  let sdk = null, ok = false, fightCount = 0;
  async function init() {
    try {
      if (!window.CrazyGames) return;
      sdk = window.CrazyGames.SDK;
      await sdk.init();
      if (sdk.environment !== 'crazygames' && sdk.environment !== 'local') { sdk = null; return; }
      ok = true;
      try { sdk.game.loadingStart(); sdk.game.loadingStop(); } catch (e) {}
      const s = sdk.game.settings;
      if (s && s.muteAudio && window.state) state.muted = true;
      sdk.game.addSettingsChangeListener(ns => { if (ns.muteAudio && window.state) state.muted = true; });
    } catch (e) { sdk = null; ok = false; }
  }
  const guard = f => { try { if (ok) f(); } catch (e) {} };
  return {
    init,
    available: () => ok,
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
window.addEventListener('load', () => CG.init());
