'use strict';
/* ============================================================
   VASVÁR ARÉNA — hangeffektek (WebAudio-szintézis, asset nélkül)
   Némítás: state.muted (a fejléc 🔊 gombja kapcsolja)
============================================================ */
window.Sfx = (function () {
  let ctx = null, master = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }
  // böngésző-szabály: első felhasználói kattintásra éled az audio
  window.addEventListener('pointerdown', () => { if (ensure() && ctx.state === 'suspended') ctx.resume(); }, { once: false });

  function muted() { return !!(window.state && state.muted); }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted() || !ensure()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    if (muted() || !ensure()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain(); g.gain.value = vol || 0.5;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  return {
    hit()     { noise(0.12, 0.8, 500); tone(110, 0.12, 'square', 0.35, 60); },
    crit()    { noise(0.16, 0.9, 700); tone(880, 0.22, 'sawtooth', 0.4, 220); tone(140, 0.15, 'square', 0.4, 70); },
    miss()    { noise(0.22, 0.35, 1600); },
    heal()    { tone(523, 0.14, 'sine', 0.4); tone(784, 0.2, 'sine', 0.4, undefined, 0.1); },
    shield()  { tone(660, 0.1, 'triangle', 0.45); tone(990, 0.16, 'triangle', 0.3, undefined, 0.05); },
    stun()    { tone(220, 0.3, 'square', 0.3, 90); },
    coin()    { tone(988, 0.07, 'square', 0.25); tone(1319, 0.14, 'square', 0.25, undefined, 0.07); },
    level()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.4, undefined, i * 0.1)); },
    victory() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i === 4 ? 0.5 : 0.16, 'triangle', 0.42, undefined, i * 0.13)); },
    defeat()  { tone(300, 0.5, 'sawtooth', 0.35, 120); tone(150, 0.7, 'sawtooth', 0.3, 70, 0.2); },
    click()   { tone(1100, 0.035, 'square', 0.12); },
  };
})();

/* finom klikk-hang a gombokon */
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('.menu-btn, .act, .action-btn, .loc-tile, .skin-chip, .bag-cell, .create-skin')) {
    if (window.Sfx) Sfx.click();
  }
});
