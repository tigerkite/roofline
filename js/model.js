import { U } from "./utils.js";

export const Model = (() => {
  const ORDERS = [
    { emoji: "\u2615\uFE0F", name: "coffee" },
    { emoji: "\uD83C\uDF75", name: "tea" },
    { emoji: "\uD83E\uDD64", name: "cold brew" },
  ];

  const FAST_MSGS  = ["\u26A1 Fast!", "Wow!", "\u2615 Yes!", "Speedy!"];
  const OK_MSGS    = ["Thanks!", "Nice!", "\u2615 Yum!", "\uD83D\uDC4D"];
  const SLOW_MSGS  = ["Finally\u2026", "About time", "Phew!", "\uD83D\uDE05"];
  const REMAKE_MSGS = ["Oops!", "Redo!", "Yikes!", "Again?"];
  const LEAVE_MSGS  = ["Too slow!", "Bye! \uD83D\uDE24", "Ugh!", "Nope!", "\u2615\u2192\uD83D\uDEAB"];

  class State {
    constructor() {
      this.running = false;
      this.levelIdx = 0;
      this.tLeft = 0;

      this.queue = [];
      this.tokens = [];
      this.cups = [];
      this.stations = [];

      this.spawnAcc = 0;
      this.served = 0;
      this.remakes = 0;
      this.lost = 0;
      this.serveStreak = 0;

      this.waitSamples = [];
      this.p95Cached = null;
      this.bottleneck = "OK";

      this.runner = { active: false, x: 0, y: 0, tx: 0, ty: 0, carrying: "\uD83E\uDD5B" };
      this.sparkles = [];
      this.confetti = [];
      this.bubbles = [];
      this.shake = { x: 0, y: 0, t: 0, max: 0 };
      this.events = [];
      this.lastTickSec = -1;

      this.lv4Attempts = 0;
    }
  }

  function reset(state, level, cfg, g, pathLens) {
    state.running = false;
    state.tLeft = level.duration;

    state.queue.length = 0;
    state.tokens.length = 0;
    state.cups.length = 0;
    state.spawnAcc = 0;

    state.served = 0;
    state.remakes = 0;
    state.lost = 0;
    state.serveStreak = 0;
    state.waitSamples.length = 0;
    state.p95Cached = null;

    state.bottleneck = "OK";

    state.stations = Array.from({ length: cfg.compute }, () => ({
      busy: false,
      t: 0,
      batch: [],
      stall: 0,
      x: 0,
      y: 0,
    }));

    state.runner.active = false;
    state.runner.x = g.pantry.x + 58;
    state.runner.y = g.pantry.y + 78;
    state.runner.tx = state.runner.x;
    state.runner.ty = state.runner.y;

    state.sparkles.length = 0;
    state.confetti.length = 0;
    state.bubbles.length = 0;
    state.shake = { x: 0, y: 0, t: 0, max: 0 };
    state.events.length = 0;
    state.lastTickSec = -1;
  }

  function ensureStations(state, n) {
    if (state.stations.length === n) return;
    const old = state.stations;
    state.stations = Array.from({ length: n }, (_, i) => old[i] || { busy: false, t: 0, batch: [], stall: 0, x: 0, y: 0 });
  }

  function spawnCustomer(state, linePath, lineLens) {
    const o = U.pick(ORDERS);
    const backPoint = U.pointOnPath(linePath, lineLens, lineLens.total);

    // Customer type: rushers increase in later levels
    const lvl = state.levelIdx;
    const rusherChance = Math.min(0.55, 0.05 + lvl * 0.15);
    const chillChance  = Math.max(0.05, 0.20 - lvl * 0.04);
    const r = Math.random();
    let patienceBase, custType;
    if (r < rusherChance) {
      custType = "rusher"; patienceBase = 16;
    } else if (r < rusherChance + chillChance) {
      custType = "chill"; patienceBase = 42;
    } else {
      custType = "regular"; patienceBase = 28;
    }

    state.queue.push({
      id: Math.random().toString(16).slice(2),
      order: o,
      born: U.now(),
      x: backPoint.x,
      y: backPoint.y,
      targetDist: lineLens.total,
      dist: lineLens.total,
      patience: 1.0,
      patienceRate: 1.0 / patienceBase,
      custType,
    });
  }

  function step(state, dt, level, cfg, g, linePath, lineLens) {
    ensureStations(state, cfg.compute);

    // spawn
    state.spawnAcc += level.trafficRps * dt;
    while (state.spawnAcc >= 1) {
      spawnCustomer(state, linePath, lineLens);
      state.spawnAcc -= 1;
    }

    // queue slots
    const spacing = 46;
    for (let i = 0; i < state.queue.length; i++) {
      state.queue[i].targetDist = Math.min(lineLens.total, i * spacing);
    }

    // walking
    const walkSpeed = 110;
    for (const c of state.queue) {
      const delta = c.dist - c.targetDist;
      if (Math.abs(delta) < 1) continue;
      const stepDist = Math.min(Math.abs(delta), walkSpeed * dt);
      c.dist += delta > 0 ? -stepDist : stepDist;
      const p = U.pointOnPath(linePath, lineLens, c.dist);
      c.x = p.x;
      c.y = p.y;
    }

    // patience drain — customers leave if patience runs out
    for (let i = state.queue.length - 1; i >= 0; i--) {
      const c = state.queue[i];
      c.patience -= c.patienceRate * dt;
      if (c.patience <= 0) {
        state.queue.splice(i, 1);
        state.lost++;
        state.serveStreak = 0;
        state.events.push({ type: "leave" });
        state.bubbles.push({
          text: U.pick(LEAVE_MSGS), x: c.x, y: c.y,
          t: 1.4, maxT: 1.4, color: "#dc2626",
        });
      }
    }

    // config
    const batchSize = level.unlock.batch ? cfg.batch : 0;
    const q = level.unlock.quality ? cfg.quality : 1;
    const remakeP = level.remakeByQ[q];

    const qSlow = q === 0 ? 0.92 : q === 1 ? 1.0 : 1.18;
    const batchEff = batchSize <= 1 ? 1.0 : 1.0 - Math.min(0.25, 0.055 * (batchSize - 1));

    const bw = cfg.bw;
    const stallBase = level.bwStallBase * (1.25 - Math.min(0.9, (bw - 0.6) / 1.4));

    // Bandwidth contention (Level 4): stall scales with compute + batch
    const contentionMult = level.bwContention
      ? cfg.compute * Math.max(1, Math.ceil(batchSize / 2))
      : 1;
    const stallRate = stallBase * contentionMult;

    // runner
    const runner = state.runner;
    const runnerSpeed = 140 * bw;

    const moveTo = (obj, tx, ty, speed) => {
      const dx = tx - obj.x,
        dy = ty - obj.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) return true;
      const s = Math.min(d, speed * dt);
      obj.x += (dx / d) * s;
      obj.y += (dy / d) * s;
      return false;
    };

    const frontPoint = U.pointOnPath(linePath, lineLens, 0);
    const frontReady =
      state.queue[0] && Math.hypot(state.queue[0].x - frontPoint.x, state.queue[0].y - frontPoint.y) < 10;

    for (const st of state.stations) {
      if (st.stall > 0) {
        st.stall -= dt;
        continue;
      }

      // bandwidth stall
      if (Math.random() < stallRate * dt) {
        st.stall = (0.65 + Math.random() * 0.65) / Math.max(0.7, bw);
        if (!runner.active) {
          runner.active = true;
          runner.carrying = Math.random() < 0.5 ? "\uD83E\uDD5B" : "\uD83E\uDED8";
          runner.x = g.pantry.x + 58;
          runner.y = g.pantry.y + 78;
          runner.tx = st.x + 62;
          runner.ty = st.y + 56;
        }
        continue;
      }

      if (!st.busy) {
        if (!frontReady) continue;

        if (batchSize <= 1) {
          const c = state.queue.shift();
          if (c) {
            state.tokens.push({ x: frontPoint.x + 16, y: frontPoint.y - 10, tx: st.x + 50, ty: st.y + 44, emoji: "\uD83E\uDED8", c });
            st.busy = true;
            st.batch = [c];
            st.t = level.serviceBase * qSlow;
          }
        } else {
          if (state.queue.length >= batchSize && batchSize >= 2) {
            const kth = state.queue[batchSize - 1];
            const kthReady = kth && Math.abs(kth.dist - kth.targetDist) < 6;
            if (!kthReady) continue;

            const batch = state.queue.splice(0, batchSize);
            for (const c of batch) state.tokens.push({ x: frontPoint.x + 16, y: frontPoint.y - 10, tx: st.x + 50, ty: st.y + 44, emoji: "\uD83E\uDED8", c });

            st.busy = true;
            st.batch = batch;
            st.t = level.serviceBase * qSlow * batchEff * (0.90 + 0.08 * batchSize);
          }
        }
      } else {
        st.t -= dt;
        if (st.t <= 0) {
          for (const c of st.batch) {
            const wait = U.now() - c.born;
            state.waitSamples.push(wait);

            const bad = Math.random() < remakeP;

            state.cups.push({
              x: st.x + 140,
              y: st.y + 46,
              tx: bad ? g.remake.x + 60 + Math.random() * 120 : g.pickup.x + 60 + Math.random() * 120,
              ty: bad ? g.remake.y + 70 + Math.random() * 30 : g.pickup.y + 70 + Math.random() * 30,
              emoji: c.order.emoji,
              rot: bad ? Math.random() * 0.8 - 0.4 : 0,
              bad,
            });

            if (bad) {
              state.remakes += 1;
              state.serveStreak = 0;
              state.events.push({ type: "remake" });
              state.bubbles.push({
                text: U.pick(REMAKE_MSGS), x: st.x + 100, y: st.y + 20,
                t: 1.2, maxT: 1.2, color: "#dc2626",
              });
              // screen shake
              state.shake = {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 6,
                t: 0.12, max: 0.12,
              };
              c.born = U.now();
              c.dist = lineLens.total;
              c.patience = 0.7; // returning customer is less patient
              state.queue.push(c);
            } else {
              state.served += 1;
              state.serveStreak += 1;
              const msgList = wait < 4 ? FAST_MSGS : wait < 10 ? OK_MSGS : SLOW_MSGS;
              state.events.push({ type: "serve" });
              state.bubbles.push({
                text: U.pick(msgList), x: st.x + 100, y: st.y + 20,
                t: 1.2, maxT: 1.2, color: "#059669",
              });
              if (state.serveStreak > 0 && state.serveStreak % 5 === 0) {
                state.events.push({ type: "combo" });
                state.bubbles.push({
                  text: "\uD83D\uDD25 " + state.serveStreak + "x!",
                  x: g.pickup.x + g.pickup.w / 2, y: g.pickup.y - 10,
                  t: 1.6, maxT: 1.6, color: "#dc2626",
                });
              }
            }
          }
          st.busy = false;
          st.batch = [];
        }
      }
    }

    // runner motion
    if (runner.active) {
      const arrived = moveTo(runner, runner.tx, runner.ty, runnerSpeed);
      if (arrived) {
        runner.tx = g.pantry.x + 58;
        runner.ty = g.pantry.y + 78;
        const back = moveTo(runner, runner.tx, runner.ty, runnerSpeed);
        if (back) runner.active = false;
      }
    }

    // animate tokens/cups
    const move = (obj, rate) => {
      obj.x += (obj.tx - obj.x) * U.clamp(rate * dt, 0, 1);
      obj.y += (obj.ty - obj.y) * U.clamp(rate * dt, 0, 1);
    };
    for (const t of state.tokens) move(t, 6.2);
    state.tokens = state.tokens.filter((t) => Math.hypot(t.tx - t.x, t.ty - t.y) > 10);

    for (const cup of state.cups) move(cup, 4.2);
    state.cups = state.cups.filter((c) => Math.hypot(c.tx - c.x, c.ty - c.y) > 12);

    // p95 cache
    if (state.waitSamples.length >= 4) {
      state.p95Cached = U.quantile(state.waitSamples, 0.95);
    }

    // bottleneck label
    const stalled = state.stations.filter((s) => s.stall > 0).length;
    const busy = state.stations.filter((s) => s.busy && s.stall <= 0).length;
    const qlen = state.queue.length;

    if (stalled >= Math.max(1, Math.floor(state.stations.length / 2))) state.bottleneck = "Bandwidth";
    else if (busy === state.stations.length && qlen > 6) state.bottleneck = "Compute";
    else if (level.unlock.batch && cfg.batch >= 3 && qlen > 10) state.bottleneck = "Batch";
    else if (level.unlock.quality && state.remakes > Math.max(4, state.served * 0.35)) state.bottleneck = "Remakes";
    else if (qlen > 12) state.bottleneck = "Traffic";
    else state.bottleneck = "OK";

    state.tLeft -= dt;
  }

  // Runs with real dt even when paused
  function stepConfetti(state, dt) {
    for (const cf of state.confetti) {
      cf.x += cf.vx * dt;
      cf.y += cf.vy * dt;
      cf.vy += 550 * dt;
      cf.rot += cf.vr * dt;
      cf.t -= dt;
    }
    state.confetti = state.confetti.filter(cf => cf.t > 0);

    // shake decay
    if (state.shake.t > 0) state.shake.t -= dt;

    // bubbles
    for (const b of state.bubbles) b.t -= dt;
    state.bubbles = state.bubbles.filter(b => b.t > 0);
  }

  function burstConfetti(state, x, y, count) {
    const n = count || 120;
    const colors = ["#fff", "#f8f8f8", "#e5e7eb", "#2563eb", "#1d4ed8", "#059669", "#dc2626", "#6b7280", "#374151"];
    for (let i = 0; i < n; i++) {
      state.confetti.push({
        x, y,
        vx: Math.random() * 520 - 260,
        vy: Math.random() * -520 - 140,
        vr: Math.random() * 12 - 6,
        rot: Math.random() * Math.PI,
        t: 2.2 + Math.random() * 1.0,
        c: colors[Math.floor(Math.random() * colors.length)],
        w: 4 + Math.random() * 5,
        h: 6 + Math.random() * 6,
      });
    }
  }

  return { State, reset, step, stepConfetti, burstConfetti };
})();
