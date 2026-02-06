// js/sounds.js — Web Audio synthesised sound effects (no assets needed)

export const Sounds = (() => {
  let ctx = null;
  let enabled = true;
  let lastPlay = {};

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      enabled = false;
    }
  }

  function canPlay(id, gap) {
    if (!ctx || !enabled) return false;
    const now = ctx.currentTime;
    if (lastPlay[id] && now - lastPlay[id] < (gap || 0.08)) return false;
    lastPlay[id] = now;
    return true;
  }

  function tone(freq, dur, type, vol, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.10, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // Ascending chime: drink served
  function serve() {
    if (!canPlay("serve", 0.12)) return;
    tone(523, 0.07, "sine", 0.09);
    tone(659, 0.07, "sine", 0.09, 0.06);
    tone(784, 0.10, "sine", 0.09, 0.12);
  }

  // Descending buzz: remake
  function remake() {
    if (!canPlay("remake", 0.15)) return;
    tone(330, 0.10, "sawtooth", 0.05);
    tone(262, 0.14, "sawtooth", 0.04, 0.07);
  }

  // Sad slide: customer leaves
  function leave() {
    if (!canPlay("leave", 0.25)) return;
    tone(370, 0.10, "triangle", 0.07);
    tone(262, 0.16, "triangle", 0.05, 0.09);
  }

  // Countdown tick
  function tick() {
    if (!canPlay("tick", 0.85)) return;
    tone(880, 0.03, "sine", 0.04);
  }

  // Streak / combo
  function combo() {
    if (!canPlay("combo", 0.25)) return;
    tone(784, 0.05, "sine", 0.09);
    tone(988, 0.05, "sine", 0.09, 0.05);
    tone(1175, 0.08, "sine", 0.09, 0.10);
  }

  // Level clear fanfare
  function levelClear() {
    if (!canPlay("clear", 0.5)) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 0.20, "sine", 0.11, i * 0.09);
    });
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  return { init, serve, remake, leave, tick, combo, levelClear, toggle };
})();
