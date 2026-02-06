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
    ctx.fillStyle = "rgba(229,231,235,.6)";
    U.rr(ctx, 12, 12, W - 24, H - 24, 12, true, false);

    // HUD board
    const board = { x: 24, y: 22, w: 380, h: 76 };
    ctx.fillStyle = "#1a1a1a";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    U.rr(ctx, board.x, board.y, board.w, board.h, 8, true, true);

    ctx.font = "600 14px DM Sans, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Level " + level.id + ": " + level.name, board.x + 14, board.y + 24);

    // Progress bar
    const pct = Math.min(1, s.served / level.goal);
    const barX = board.x + 14;
    const barY = board.y + 32;
    const barW = board.w - 28;
    const barH = 10;
    ctx.fillStyle = "rgba(255,255,255,.25)";
    U.rr(ctx, barX, barY, barW, barH, 5, true, false);
    if (pct > 0) {
      ctx.fillStyle = pct >= 1 ? "#059669" : "#2563eb";
      U.rr(ctx, barX, barY, Math.max(4, barW * pct), barH, 5, true, false);
    }

    // Stats line
    const p95 = s.p95Cached == null ? "\u2014" : s.p95Cached.toFixed(1) + "s";
    ctx.font = "500 12px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    let statLine = "Served " + s.served + "/" + level.goal + "  \u2022  P95 " + p95 + "  \u2022  " + Math.max(0, Math.ceil(s.tLeft)) + "s";
    if (s.lost > 0) statLine = "Served " + s.served + "/" + level.goal + "  \u2022  Lost " + s.lost + "  \u2022  " + Math.max(0, Math.ceil(s.tLeft)) + "s";
    ctx.fillText(statLine, board.x + 14, board.y + 58);

    // Timer urgency
    const timeLeft = Math.max(0, s.tLeft);
    if (timeLeft <= 10 && timeLeft > 0 && s.running) {
      ctx.fillStyle = timeLeft <= 5 ? "rgba(220,38,38,.9)" : "rgba(220,38,38,.6)";
      ctx.font = "600 12px DM Sans, sans-serif";
      ctx.fillText("\u26A0 HURRY!", board.x + 14, board.y + 72);
    }

    // Streak display
    if (s.serveStreak >= 3 && s.running) {
      ctx.font = "600 12px DM Sans, sans-serif";
      ctx.fillStyle = s.serveStreak >= 10 ? "#dc2626" : s.serveStreak >= 5 ? "#2563eb" : "#6b7280";
      const streakTxt = (s.serveStreak >= 10 ? "\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25 " : s.serveStreak >= 5 ? "\uD83D\uDD25\uD83D\uDD25 " : "\uD83D\uDD25 ") + s.serveStreak + "x streak";
      ctx.fillText(streakTxt, board.x + board.w - 120, board.y + 72);
    }

    // Bottleneck indicator
    const bn = { x: board.x + board.w + 12, y: board.y + 16, w: 160, h: 34 };
    const bnColor = s.bottleneck === "OK" ? "#d1fae5" :
                    s.bottleneck === "Bandwidth" ? "#fee2e2" :
                    s.bottleneck === "Compute" ? "#eff6ff" : "#f3f4f6";
    ctx.fillStyle = bnColor;
    ctx.strokeStyle = "#e5e7eb";
    U.rr(ctx, bn.x, bn.y, bn.w, bn.h, 6, true, true);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "500 12px JetBrains Mono, monospace";
    ctx.fillText("Bottleneck: " + s.bottleneck, bn.x + 12, bn.y + 22);

    const zone = (r, fill) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      U.rr(ctx, r.x, r.y, r.w, r.h, 8, true, true);
    };

    // Queue zone — glows when crowded
    const qlen = s.queue.length;
    const queueFill = qlen > 15 ? "rgba(220,38,38,.12)" : qlen > 10 ? "rgba(220,38,38,.06)" : "#fff";
    zone(g.queue, queueFill);
    zone(g.counter, "#fff");
    zone(g.bar, "#fff");
    zone(g.pantry, "#f8f8f8");
    zone(g.pickup, "rgba(5,150,105,.08)");
    zone(g.remake, "rgba(220,38,38,.08)");

    // labels
    ctx.font = "600 11px JetBrains Mono, monospace";
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "start";
    ctx.fillText("LINE", g.queue.x + 14, g.queue.y + 22);
    ctx.fillText("COUNTER", g.counter.x + 14, g.counter.y + 22);
    ctx.fillText("PICKUP", g.pickup.x + 14, g.pickup.y + 22);
    ctx.fillText("REMAKE", g.remake.x + 14, g.remake.y + 22);

    // icons
    ctx.font = "28px DM Sans, sans-serif";
    ctx.fillText("\uD83E\uDDD1\u200D\uD83C\uDF73", g.bar.x + 14, g.bar.y + 44);
    ctx.fillText("\uD83E\uDDFA", g.pantry.x + 14, g.pantry.y + 44);
    ctx.fillText("\uD83E\uDE91", g.queue.x + 14, g.queue.y + 44);
    ctx.fillText("\uD83D\uDECE\uFE0F", g.counter.x + 14, g.counter.y + 44);

    ctx.font = "22px DM Sans, sans-serif";
    ctx.fillText("\uD83E\uDD5B", g.pantry.x + 18, g.pantry.y + 82);
    ctx.fillText("\uD83E\uDED8", g.pantry.x + 50, g.pantry.y + 82);

    // queue path
    ctx.strokeStyle = "rgba(107,114,128,.25)";
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

      ctx.fillStyle = st.stall > 0 ? "rgba(220,38,38,.08)" : "#fff";
      ctx.strokeStyle = "#e5e7eb";
      U.rr(ctx, x, y, Math.min(180, stSpacing - 14), 76, 8, true, true);

      ctx.font = "22px DM Sans, sans-serif";
      ctx.textAlign = "start";
      ctx.fillText("\uD83E\uDDD1\u200D\uD83C\uDF73", x + 10, y + 46);
      ctx.font = "13px DM Sans, sans-serif";
      ctx.fillStyle = "#374151";

      if (st.stall > 0) {
        ctx.fillStyle = "#dc2626";
        ctx.fillText("\u2026waiting", x + 44, y + 46);
      } else if (st.busy) {
        ctx.fillStyle = "#059669";
        ctx.fillText("making", x + 44, y + 46);
      } else {
        ctx.fillText("ready", x + 44, y + 46);
      }
    }

    // customers — centered on path with patience bars
    ctx.font = "24px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const drawN = Math.min(s.queue.length, 30);
    for (let i = 0; i < drawN; i++) {
      const c = s.queue[i];
      ctx.fillText("\uD83E\uDDCD", c.x, c.y);

      // thought bubble for first few
      if (i < 3) {
        ctx.font = "14px DM Sans, sans-serif";
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("\uD83D\uDCAD" + c.order.emoji, c.x + 14, c.y - 18);
        ctx.font = "24px DM Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }

      // patience bar (shows after a moment)
      if (c.patience < 0.92) {
        const pbW = 18, pbH = 3;
        const pbX = c.x - pbW / 2;
        const pbY = c.y - 18;
        ctx.fillStyle = "rgba(107,114,128,.2)";
        ctx.fillRect(pbX, pbY, pbW, pbH);
        const pColor = c.patience > 0.5 ? "#059669" : c.patience > 0.25 ? "#2563eb" : "#dc2626";
        ctx.fillStyle = pColor;
        ctx.fillRect(pbX, pbY, pbW * Math.max(0, c.patience), pbH);
      }

      // rusher indicator
      if (c.custType === "rusher" && i < 12) {
        ctx.font = "10px DM Sans, sans-serif";
        ctx.fillText("\u23F1", c.x + 14, c.y + 2);
        ctx.font = "24px DM Sans, sans-serif";
      }
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    if (s.queue.length > drawN) {
      ctx.font = "600 12px JetBrains Mono, monospace";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("+" + (s.queue.length - drawN) + " more", g.queue.x + 14, g.queue.y + 62);
    }

    // tokens
    ctx.font = "20px DM Sans, sans-serif";
    for (const t of s.tokens) ctx.fillText(t.emoji, t.x, t.y);

    // runner
    if (s.runner.active) {
      ctx.font = "22px DM Sans, sans-serif";
      ctx.fillText("\uD83C\uDFC3", s.runner.x, s.runner.y);
      ctx.font = "16px DM Sans, sans-serif";
      ctx.fillText(s.runner.carrying, s.runner.x + 18, s.runner.y - 12);
    }

    // cups floating
    ctx.font = "22px DM Sans, sans-serif";
    for (const cup of s.cups) {
      ctx.save();
      ctx.translate(cup.x, cup.y);
      ctx.rotate(cup.rot || 0);
      ctx.fillText(cup.emoji, 0, 0);
      ctx.restore();
    }

    // piles
    const stack = (count, r, tilt, emoji) => {
      ctx.font = "22px DM Sans, sans-serif";
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
      ctx.font = "600 13px DM Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = b.color || "#1a1a1a";
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
