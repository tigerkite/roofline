// js/app.js
// Barista Pipeline — main app controller

import { U } from "./utils.js";
import { Levels } from "./levels.js";
import { Modal } from "./modal.js";
import { Model } from "./model.js";
import { Render } from "./render.js";
import { Sounds } from "./sounds.js";

export const App = (() => {
  const ui = {
    cv: U.el("cv"),

    btnGo: U.el("btnGo"),
    btnPause: U.el("btnPause"),
    btnReset: U.el("btnReset"),
    btnHelp: U.el("btnHelp"),
    btnInfo: U.el("btnInfo"),
    btnSpeed: U.el("btnSpeed"),
    btnSound: U.el("btnSound"),

    leverCompute: U.el("leverCompute"),
    leverBW: U.el("leverBW"),
    leverBatch: U.el("leverBatch"),
    leverQuality: U.el("leverQuality"),

    sCompute: U.el("sCompute"),
    sBW: U.el("sBW"),
    sBatch: U.el("sBatch"),
    sQuality: U.el("sQuality"),

    valCompute: U.el("valCompute"),
    valBW: U.el("valBW"),
    valBatch: U.el("valBatch"),
    valQuality: U.el("valQuality"),

    infoPanel: U.el("infoPanel"),

    overlay: U.el("overlay"),
    mTag: U.el("mTag"),
    mTitle: U.el("mTitle"),
    mText: U.el("mText"),
    mNerd: U.el("mNerd"),
    mExtra: U.el("mExtra"),
    mBack: U.el("mBack"),
    mNext: U.el("mNext"),
    mClose: U.el("mClose"),

    toast: U.el("toast"),
  };

  const ctx = ui.cv.getContext("2d");
  let size = { w: ui.cv.getBoundingClientRect().width, h: ui.cv.getBoundingClientRect().height };

  const state = new Model.State();
  const modal = Modal.mount(ui);

  // Speed multiplier
  let speedMult = 1;
  const SPEEDS = [1, 2, 3];
  let speedIdx = 0;
  let soundInited = false;

  function toast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.style.display = "block";
    setTimeout(() => (ui.toast.style.display = "none"), 1200);
  }

  // Layout: zones never overlap. Footer for pickup/remake fully below playfield.
  function geom(W, H) {
    const pad = 24;
    const topY = 110;

    const footerH = 170;
    const footerY = H - footerH - pad;
    const mainBottom = footerY - 12;

    const queue = { x: pad, y: topY, w: W * 0.44, h: Math.max(260, mainBottom - topY) };
    queue.h = Math.min(queue.h, mainBottom - queue.y);

    const counter = { x: queue.x + queue.w + 14, y: queue.y, w: W * 0.10, h: 100 };

    const bar = { x: queue.x + queue.w + 14, y: queue.y + 120, w: W * 0.32, h: 280 };
    bar.h = Math.min(bar.h, Math.max(180, mainBottom - bar.y));

    const pantry = { x: bar.x + bar.w + 14, y: bar.y, w: 130, h: 110 };

    const zoneW = Math.min(250, (W - pad * 3) / 2);
    const zoneH = footerH - 20;

    const remake = { x: pad, y: footerY, w: zoneW, h: zoneH };
    const pickup = { x: W - pad - zoneW, y: footerY, w: zoneW, h: zoneH };

    return { queue, counter, bar, pantry, pickup, remake, worldBottom: H };
  }

  // Responsive serpentine path inside queue box
  function linePathFor(g) {
    const q = g.queue;
    const xL = q.x + 24;
    const xR = q.x + q.w - 24;
    const yTop = q.y + 58;
    const yBot = q.y + q.h - 18;
    const rowH = (yBot - yTop) / 3;

    return [
      { x: xR, y: yTop },
      { x: xL, y: yTop },
      { x: xL, y: yTop + rowH },
      { x: xR, y: yTop + rowH },
      { x: xR, y: yTop + 2 * rowH },
      { x: xL, y: yTop + 2 * rowH },
      { x: xL, y: yBot },
      { x: xR, y: yBot },
    ];
  }

  function cfg() {
    return {
      compute: parseInt(ui.sCompute.value, 10),
      bw: parseFloat(ui.sBW.value),
      batch: parseInt(ui.sBatch.value, 10),
      quality: parseInt(ui.sQuality.value, 10),
    };
  }

  function updateLeverText() {
    const c = cfg();
    ui.valCompute.textContent = String(c.compute);
    ui.valBW.textContent = c.bw.toFixed(2) + "\u00D7";
    ui.valBatch.textContent = c.batch === 0 ? "Off" : String(c.batch);
    ui.valQuality.textContent = (c.quality === 0 ? "Low" : c.quality === 1 ? "Medium" : "High");
  }

  [ui.sCompute, ui.sBW, ui.sBatch, ui.sQuality].forEach((s) => s.addEventListener("input", updateLeverText));

  let levelIdx = 0;
  function level() { return Levels.L[levelIdx]; }

  function applyUnlocks() {
    const L = level();
    ui.leverBatch.classList.toggle("hidden", !L.unlock.batch);
    ui.leverQuality.classList.toggle("hidden", !L.unlock.quality);
    if (!L.unlock.batch) ui.sBatch.value = "0";
    if (!L.unlock.quality) ui.sQuality.value = "1";
    updateLeverText();
  }

  function setLevel(i) {
    const prev = levelIdx;
    levelIdx = U.clamp(i, 0, Levels.L.length - 1);
    if (levelIdx !== prev) state.lv4Attempts = 0;
    applyUnlocks();

    toast("Level " + level().id + ": " + level().name);
    const g = geom(size.w, size.h);
    const path = linePathFor(g);
    const lens = U.pathLengths(path);

    Model.reset(state, level(), cfg(), g, lens);
    state.levelIdx = levelIdx;
  }

  function reset() {
    const g = geom(size.w, size.h);
    const path = linePathFor(g);
    const lens = U.pathLengths(path);
    Model.reset(state, level(), cfg(), g, lens);
    toast("Reset");
  }

  // Star rating (1-3)
  function calcStars() {
    const p95 = state.p95Cached;
    const total = state.served + state.remakes;
    const remakeRate = total > 0 ? state.remakes / total : 0;
    const L = level();
    const timeLeft = Math.max(0, state.tLeft);
    const timePct = timeLeft / L.duration;

    let stars = 1;
    if (p95 !== null && p95 < 8 && remakeRate < 0.25 && state.lost <= 3) stars = 2;
    if (p95 !== null && p95 < 5 && remakeRate < 0.15 && state.lost === 0 && timePct > 0.10) stars = 3;
    return stars;
  }

  // Roofline SVG
  const rooflineSvg = `
    <div class="rooflineWrap">
      <div class="rooflineCaption">
        <b>The Roofline Model:</b><br>
        Throughput rises with <b>compute</b> (baristas) until you hit the <b>bandwidth ceiling</b> (pantry speed).
        Beyond that knee, adding more compute doesn't help \u2014 you're bandwidth-limited.
      </div>
      <svg viewBox="0 0 520 210" width="100%" height="auto" aria-label="Roofline diagram">
        <rect x="0" y="0" width="520" height="210" rx="16" fill="#FFF8EB" stroke="#E2C7A7" stroke-width="2"/>
        <line x1="70" y1="170" x2="470" y2="170" stroke="#6B4C3A" stroke-width="3" stroke-linecap="round"/>
        <line x1="70" y1="170" x2="70" y2="40" stroke="#6B4C3A" stroke-width="3" stroke-linecap="round"/>
        <text x="255" y="198" font-size="12" fill="#6B4C3A" text-anchor="middle">Arithmetic intensity (batching, cache hits)</text>
        <text x="18" y="105" font-size="12" fill="#6B4C3A" text-anchor="middle" transform="rotate(-90 18 105)">Throughput</text>
        <line x1="70" y1="170" x2="300" y2="80" stroke="#E9B36C" stroke-width="6" stroke-linecap="round"/>
        <text x="105" y="145" font-size="11" fill="#D9480F" font-weight="bold">Bandwidth-limited</text>
        <line x1="300" y1="80" x2="470" y2="80" stroke="#3B2A1F" stroke-width="6" stroke-linecap="round"/>
        <text x="340" y="68" font-size="11" fill="#3B2A1F" font-weight="bold">Compute-limited</text>
        <circle cx="300" cy="80" r="7" fill="#D9480F"/>
        <text x="310" y="100" font-size="12" fill="#D9480F" font-weight="bold">the knee</text>
        <text x="160" y="80" font-size="28" fill="#D9480F">YOU</text>
        <line x1="170" y1="85" x2="170" y2="140" stroke="#D9480F" stroke-width="2" stroke-dasharray="4"/>
        <circle cx="170" cy="140" r="5" fill="#D9480F"/>
      </svg>
    </div>
  `;

  function openClearAndAdvance() {
    const L = level();
    const g = geom(size.w, size.h);
    const stars = calcStars();

    Sounds.levelClear();

    // Confetti bursts
    Model.burstConfetti(state, g.counter.x + g.counter.w / 2, g.counter.y + 30, 150);
    setTimeout(() => Model.burstConfetti(state, W_cache / 2, 200, 100), 300);
    if (stars === 3) {
      setTimeout(() => Model.burstConfetti(state, W_cache * 0.3, 150, 80), 500);
      setTimeout(() => Model.burstConfetti(state, W_cache * 0.7, 150, 80), 700);
    }

    const isFinal = levelIdx >= Levels.L.length - 1;

    const starEmoji = "\u2B50".repeat(stars) + "\u2606".repeat(3 - stars);
    const starHtml = '<div style="text-align:center;font-size:36px;letter-spacing:10px;margin:4px 0;">' + starEmoji + '</div>'
      + '<div style="text-align:center;font-size:12px;color:#6B4C3A;margin-bottom:6px;">'
      + (stars === 3 ? 'Perfect! Low P95, no lost customers, time to spare!' : stars === 2 ? 'Great! Try for 3 stars: low P95, zero lost, faster clear.' : 'Cleared! Optimise for better stars: lower P95, fewer remakes.')
      + '</div>';

    const clearHtml = starHtml + (isFinal ? rooflineSvg + `
      <div class="rooflineCaption" style="margin-top:12px;">
        <b>Game translation:</b> adding baristas helps until pantry/data movement becomes the limiter.
        Then more compute doesn't help \u2014 you need better bandwidth/caching\u2026 or new hardware.
      </div>
      <div class="rooflineCaption" style="margin-top:8px;">
        <a href="https://www.amazon.com/NVD-RTX-PRO-6000-Blackwell/dp/B0F7Y644FQ?th=1" target="_blank" rel="noopener noreferrer">
          \uD83D\uDE02 Fine\u2026 upgrade hardware (RTX PRO 6000 Blackwell)
        </a>
      </div>
    ` : "");

    modal.openClear({
      title: isFinal ? "You beat the game! \uD83C\uDFC1" : "Level " + L.id + " cleared!",
      text: isFinal
        ? "Incredible!\n\nWhat you learned:\n" + L.learn
        : "Nice work!\n\nWhat you learned:\n" + L.learn + (L.unlockMsg ? "\n\nUnlocked:\n" + L.unlockMsg : ""),
      hoverHint: "AI/ML insight: " + L.learn,
      nextLabel: isFinal ? "Close" : "Next level \u27A1",
      extraHtml: clearHtml,
      onNext: () => {
        if (!isFinal) setLevel(levelIdx + 1);
        else toast("\uD83C\uDFC1 GG");
      },
    });
  }

  function openBandwidthWallLose() {
    const L = level();
    state.lv4Attempts++;
    const attempts = state.lv4Attempts;

    let title, text;
    if (attempts <= 1) {
      title = "\u23F1 Time's Up!";
      text = "You served " + state.served + "/" + L.goal + " drinks.\n\nHmm, the pantry couldn't keep up no matter what you tried.\n\nNotice: adding more baristas made the pantry even MORE strained\u2026";
    } else if (attempts <= 2) {
      title = "\uD83E\uDDF1 The Bandwidth Wall";
      text = "You served " + state.served + "/" + L.goal + " drinks.\n\nStill stuck! Every barista shares the same pantry.\nMore baristas = more contention = more waiting.\n\nThis is the Roofline Model in action.";
    } else {
      title = "\uD83D\uDEA7 Hardware Limit Reached";
      text = "You served " + state.served + "/" + L.goal + " drinks.\n\nNo amount of optimisation can overcome a hardware bottleneck.\nYour pantry (memory bandwidth) is the ceiling.\n\nIn ML: this is why we need faster memory, not just more GPUs.";
    }

    const loseHtml = rooflineSvg + `
      <div class="rooflineCaption" style="margin-top:12px; font-size:14px;">
        <b>\uD83E\uDDEA The lesson:</b> Your compute (baristas) is fine.
        The pantry (bandwidth) is the bottleneck.
        No software optimisation can fix a hardware ceiling.
      </div>
      <div class="rooflineCaption" style="margin-top:12px; text-align:center;">
        <b style="font-size:16px;">Upgrade the pantry?</b>
      </div>
      <div style="text-align:center; margin-top:8px;">
        <a href="https://www.amazon.com/NVD-RTX-PRO-6000-Blackwell/dp/B0F7Y644FQ?th=1"
           target="_blank" rel="noopener noreferrer"
           style="display:inline-block; padding:12px 24px; background:linear-gradient(180deg,#76B900,#5A8F00);
                  color:white; border-radius:999px; text-decoration:none; font-weight:900; font-size:15px;
                  box-shadow:0 4px 16px rgba(0,0,0,.25); border:2px solid #4A7A00;">
          \uD83D\uDED2 Upgrade Hardware \u2014 RTX PRO 6000
        </a>
      </div>
      <div class="rooflineCaption" style="margin-top:8px; text-align:center; font-size:11px; color:#6B4C3A;">
        (or try again\u2026 but you know how this ends \uD83D\uDE09)
      </div>
    `;

    modal.openLose({
      tag: attempts >= 3 ? "\uD83D\uDEA7 HARDWARE LIMIT" : "\u23F1 TIME'S UP",
      title,
      text,
      hoverHint: "Roofline Model: throughput hits a ceiling when bandwidth becomes the bottleneck, regardless of compute.",
      extraHtml: loseHtml,
      nextLabel: "Try Again \uD83D\uDD04",
      onNext: () => reset(),
    });
  }

  function openNormalLose() {
    const L = level();
    modal.openLose({
      title: "\u23F1 Time's Up!",
      text: "You served " + state.served + "/" + L.goal + " drinks.\n\nTip: adjust the sliders before hitting GO!\nMore baristas, faster pantry \u2014 find the right balance.",
      nextLabel: "Try Again",
      onNext: () => reset(),
    });
  }

  function checkWinLose() {
    const L = level();
    if (!state.running) return;

    if (state.served >= L.goal) {
      state.running = false;
      toast("\u2728 Level clear!");
      openClearAndAdvance();
      return;
    }

    if (state.tLeft <= 0) {
      state.running = false;
      if (L.bwContention) openBandwidthWallLose();
      else openNormalLose();
    }
  }

  // Process model events → sound effects
  function processEvents() {
    for (const ev of state.events) {
      if (ev.type === "serve") Sounds.serve();
      else if (ev.type === "remake") Sounds.remake();
      else if (ev.type === "leave") Sounds.leave();
      else if (ev.type === "combo") Sounds.combo();
    }
    state.events.length = 0;
  }

  // Buttons
  ui.btnGo.addEventListener("click", () => {
    if (!soundInited) { Sounds.init(); soundInited = true; }
    state.running = true;
    toast("GO!");
  });
  ui.btnPause.addEventListener("click", () => {
    state.running = false;
    toast("Paused");
  });
  ui.btnReset.addEventListener("click", reset);

  // Speed
  ui.btnSpeed.addEventListener("click", () => {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    speedMult = SPEEDS[speedIdx];
    ui.btnSpeed.textContent = "Speed: " + speedMult + "\u00D7";
    toast("Speed " + speedMult + "\u00D7");
  });

  // Info/lightbulb
  ui.btnInfo.addEventListener("click", () => {
    const panel = ui.infoPanel;
    if (panel.style.display === "none" || !panel.style.display) {
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  });

  // Sound toggle
  if (ui.btnSound) {
    ui.btnSound.addEventListener("click", () => {
      if (!soundInited) { Sounds.init(); soundInited = true; }
      const on = Sounds.toggle();
      ui.btnSound.textContent = on ? "\uD83D\uDD0A" : "\uD83D\uDD07";
      toast(on ? "Sound on" : "Sound off");
    });
  }

  // Resize
  const doResize = () => { size = U.resize(ui.cv, ctx); };
  window.addEventListener("resize", doResize);
  doResize();

  let W_cache = size.w;

  // Loop
  let last = performance.now();
  function loop(ts) {
    const rawDt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    const dt = rawDt * speedMult;

    const L = level();
    const c = cfg();
    const g = geom(size.w, size.h);
    const path = linePathFor(g);
    const lens = U.pathLengths(path);
    W_cache = size.w;

    if (state.running) {
      Model.step(state, dt, L, c, g, path, lens);
      processEvents();

      // Countdown tick
      if (state.tLeft <= 10 && state.tLeft > 0) {
        const sec = Math.ceil(state.tLeft);
        if (sec !== state.lastTickSec) {
          state.lastTickSec = sec;
          Sounds.tick();
        }
      }
    }

    Model.stepConfetti(state, rawDt);
    checkWinLose();
    Render.draw(ctx, size.w, size.h, state, L, c, g, path, lens);
    requestAnimationFrame(loop);
  }

  // init
  updateLeverText();
  setLevel(0);
  modal.openTutorial();
  requestAnimationFrame(loop);

  return { setLevel };
})();
