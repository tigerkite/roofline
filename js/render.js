import { U } from "./utils.js";

export const Render = (() => {
  function draw(ctx, W, H, s, level, cfg, g, linePath, lineLens) {
    ctx.clearRect(0, 0, W, H);

    // Screen shake
    const shaking = s.shake && s.shake.t > 0;
    if (shaking) {
      ctx.save();
      const intensity = s.shake.t / s.shake.max;
      ctx.translate(s.shake.x * intensity, s.shake.y * intensity);
    }

    // soft floor
    ctx.fillStyle = "rgba(233,179,108,.18)";
    U.rr(ctx, 12, 12, W - 24, H - 24, 24, true, false);

    // HUD board
    const board = { x: 24, y: 22, w: 380, h: 76 };
    ctx.fillStyle = "#3B2A1F";
    ctx.strokeStyle = "rgba(226,199,167,.95)";
    ctx.lineWidth = 2;
    U.rr(ctx, board.x, board.y, board.w, board.h, 18, true, true);

    ctx.font = "1100 14px system-ui";
    ctx.fillStyle = "#FFF8EB";
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Level " + level.id + ": " + level.name, board.x + 14, board.y + 24);

    // Progress bar
    const pct = Math.min(1, s.served / level.goal);
    const barX = board.x + 14;
    const barY = board.y + 32;
    const barW = board.w - 28;
    const barH = 10;
    ctx.fillStyle = "rgba(255,248,235,.25)";
    U.rr(ctx, barX, barY, barW, barH, 5, true, false);
    if (pct > 0) {
      ctx.fillStyle = pct >= 1 ? "#2F9E44" : "#FFE66D";
      U.rr(ctx, barX, barY, Math.max(4, barW * pct), barH, 5, true, false);
    }

    // Stats line
    const p95 = s.p95Cached == null ? "\u2014" : s.p95Cached.toFixed(1) + "s";
    ctx.font = "1000 12px system-ui";
    ctx.fillStyle = "rgba(255,248,235,.92)";
    let statLine = "Served " + s.served + "/" + level.goal + "  \u2022  P95 " + p95 + "  \u2022  " + Math.max(0, Math.ceil(s.tLeft)) + "s";
    if (s.lost > 0) statLine = "Served " + s.served + "/" + level.goal + "  \u2022  Lost " + s.lost + "  \u2022  " + Math.max(0, Math.ceil(s.tLeft)) + "s";
    ctx.fillText(statLine, board.x + 14, board.y + 58);

    // Timer urgency
    const timeLeft = Math.max(0, s.tLeft);
    if (timeLeft <= 10 && timeLeft > 0 && s.running) {
      ctx.fillStyle = timeLeft <= 5 ? "rgba(217,72,15,.85)" : "rgba(217,72,15,.55)";
      ctx.font = "1100 12px system-ui";
      ctx.fillText("\u26A0 HURRY!", board.x + 14, board.y + 72);
    }

    // Streak display
    if (s.serveStreak >= 3 && s.running) {
      ctx.font = "1100 12px system-ui";
      ctx.fillStyle = s.serveStreak >= 10 ? "#D9480F" : s.serveStreak >= 5 ? "#E9B36C" : "#6B4C3A";
      const streakTxt = (s.serveStreak >= 10 ? "\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25 " : s.serveStreak >= 5 ? "\uD83D\uDD25\uD83D\uDD25 " : "\uD83D\uDD25 ") + s.serveStreak + "x streak";
      ctx.fillText(streakTxt, board.x + board.w - 120, board.y + 72);
    }

    // Bottleneck indicator
    const bn = { x: board.x + board.w + 12, y: board.y + 16, w: 160, h: 34 };
    const bnColor = s.bottleneck === "OK" ? "#D4EDDA" :
                    s.bottleneck === "Bandwidth" ? "#FFD2D2" :
                    s.bottleneck === "Compute" ? "#FFE8CC" : "#FFE7BE";
    ctx.fillStyle = bnColor;
    ctx.strokeStyle = "rgba(226,199,167,.95)";
    U.rr(ctx, bn.x, bn.y, bn.w, bn.h, 999, true, true);
    ctx.fillStyle = "#3B2A1F";
    ctx.font = "1000 12px system-ui";
    ctx.fillText("Bottleneck: " + s.bottleneck, bn.x + 12, bn.y + 22);

    const zone = (r, fill) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = "rgba(226,199,167,.9)";
      ctx.lineWidth = 2;
      U.rr(ctx, r.x, r.y, r.w, r.h, 18, true, true);
    };

    // Queue zone — glows when crowded
    const qlen = s.queue.length;
    const queueFill = qlen > 15 ? "rgba(217,72,15,.15)" : qlen > 10 ? "rgba(217,72,15,.08)" : "#FFF1D8";
    zone(g.queue, queueFill);
    zone(g.counter, "#FFF1D8");
    zone(g.bar, "#FFF1D8");
    zone(g.pantry, "#FFE7BE");
    zone(g.pickup, "rgba(47,158,68,.12)");
    zone(g.remake, "rgba(217,72,15,.12)");

    // labels
    ctx.font = "1000 12px system-ui";
    ctx.fillStyle = "rgba(59,42,31,.75)";
    ctx.textAlign = "start";
    ctx.fillText("LINE", g.queue.x + 14, g.queue.y + 22);
    ctx.fillText("COUNTER", g.counter.x + 14, g.counter.y + 22);
    ctx.fillText("PICKUP", g.pickup.x + 14, g.pickup.y + 22);
    ctx.fillText("REMAKE", g.remake.x + 14, g.remake.y + 22);

    // icons
    ctx.font = "28px system-ui";
    ctx.fillText("\uD83E\uDDD1\u200D\uD83C\uDF73", g.bar.x + 14, g.bar.y + 44);
    ctx.fillText("\uD83E\uDDFA", g.pantry.x + 14, g.pantry.y + 44);
    ctx.fillText("\uD83E\uDE91", g.queue.x + 14, g.queue.y + 44);
    ctx.fillText("\uD83D\uDECE\uFE0F", g.counter.x + 14, g.counter.y + 44);

    ctx.font = "22px system-ui";
    ctx.fillText("\uD83E\uDD5B", g.pantry.x + 18, g.pantry.y + 82);
    ctx.fillText("\uD83E\uDED8", g.pantry.x + 50, g.pantry.y + 82);

    // queue path
    ctx.strokeStyle = "rgba(107,76,58,.20)";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(linePath[0].x, linePath[0].y);
    for (let i = 1; i < linePath.length; i++) ctx.lineTo(linePath[i].x, linePath[i].y);
    ctx.stroke();

    // stations
    const cols = Math.min(3, s.stations.length);
    const stSpacing = (g.bar.w - 24) / cols;

    for (let i = 0; i < s.stations.length; i++) {
      const col = i % cols,
        row = Math.floor(i / cols);
      const x = g.bar.x + 14 + col * stSpacing;
      const y = g.bar.y + 58 + row * 92;
      const st = s.stations[i];
      st.x = x;
      st.y = y;

      ctx.fillStyle = st.stall > 0 ? "rgba(217,72,15,.12)" : "#FFF8EB";
      ctx.strokeStyle = "rgba(226,199,167,.95)";
      U.rr(ctx, x, y, Math.min(180, stSpacing - 14), 76, 16, true, true);

      ctx.font = "22px system-ui";
      ctx.textAlign = "start";
      ctx.fillText("\uD83E\uDDD1\u200D\uD83C\uDF73", x + 10, y + 46);
      ctx.font = "14px system-ui";
      ctx.fillStyle = "rgba(59,42,31,.85)";

      if (st.stall > 0) {
        ctx.fillStyle = "#D9480F";
        ctx.fillText("\u2026waiting", x + 44, y + 46);
      } else if (st.busy) {
        ctx.fillStyle = "#2F9E44";
        ctx.fillText("making", x + 44, y + 46);
      } else {
        ctx.fillText("ready", x + 44, y + 46);
      }
    }

    // customers — centered on path with patience bars
    ctx.font = "24px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const drawN = Math.min(s.queue.length, 30);
    for (let i = 0; i < drawN; i++) {
      const c = s.queue[i];
      ctx.fillText("\uD83E\uDDCD", c.x, c.y);

      // thought bubble for first few
      if (i < 3) {
        ctx.font = "14px system-ui";
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("\uD83D\uDCAD" + c.order.emoji, c.x + 14, c.y - 18);
        ctx.font = "24px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }

      // patience bar (shows after a moment)
      if (c.patience < 0.92) {
        const pbW = 18, pbH = 3;
        const pbX = c.x - pbW / 2;
        const pbY = c.y - 18;
        ctx.fillStyle = "rgba(59,42,31,.15)";
        ctx.fillRect(pbX, pbY, pbW, pbH);
        const pColor = c.patience > 0.5 ? "#2F9E44" : c.patience > 0.25 ? "#F59F00" : "#D9480F";
        ctx.fillStyle = pColor;
        ctx.fillRect(pbX, pbY, pbW * Math.max(0, c.patience), pbH);
      }

      // rusher indicator
      if (c.custType === "rusher" && i < 12) {
        ctx.font = "10px system-ui";
        ctx.fillText("\u23F1", c.x + 14, c.y + 2);
        ctx.font = "24px system-ui";
      }
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    if (s.queue.length > drawN) {
      ctx.font = "1000 12px system-ui";
      ctx.fillStyle = "rgba(59,42,31,.75)";
      ctx.fillText("+" + (s.queue.length - drawN) + " more", g.queue.x + 14, g.queue.y + 62);
    }

    // tokens
    ctx.font = "20px system-ui";
    for (const t of s.tokens) ctx.fillText(t.emoji, t.x, t.y);

    // runner
    if (s.runner.active) {
      ctx.font = "22px system-ui";
      ctx.fillText("\uD83C\uDFC3", s.runner.x, s.runner.y);
      ctx.font = "16px system-ui";
      ctx.fillText(s.runner.carrying, s.runner.x + 18, s.runner.y - 12);
    }

    // cups floating
    ctx.font = "22px system-ui";
    for (const cup of s.cups) {
      ctx.save();
      ctx.translate(cup.x, cup.y);
      ctx.rotate(cup.rot || 0);
      ctx.fillText(cup.emoji, 0, 0);
      ctx.restore();
    }

    // piles
    const stack = (count, r, tilt, emoji) => {
      ctx.font = "22px system-ui";
      const show = Math.min(18, count);
      for (let i = 0; i < show; i++) {
        const x = r.x + 16 + (i % 6) * 32;
        const y = r.y + 56 + Math.floor(i / 6) * 28;
        ctx.save();
        ctx.translate(x, y);
        if (tilt) ctx.rotate((i % 3 - 1) * 0.12);
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
      }
    };
    stack(s.served, g.pickup, false, "\u2615\uFE0F");
    stack(s.remakes, g.remake, true, "\u2615\uFE0F");

    // speech bubbles
    for (const b of s.bubbles) {
      const progress = 1 - b.t / b.maxT;
      const alpha = b.t < 0.3 ? b.t / 0.3 : 1;
      const yOff = progress * -36;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "1000 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = b.color || "#3B2A1F";
      ctx.fillText(b.text, b.x, b.y + yOff);
      ctx.restore();
    }

    // confetti
    for (const cf of s.confetti) {
      ctx.save();
      ctx.translate(cf.x, cf.y);
      ctx.rotate(cf.rot);
      ctx.fillStyle = cf.c;
      ctx.globalAlpha = Math.min(1, cf.t / 0.4);
      ctx.fillRect(-(cf.w || 3) / 2, -(cf.h || 4) / 2, cf.w || 6, cf.h || 8);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // End screen shake
    if (shaking) ctx.restore();
  }

  return { draw };
})();
