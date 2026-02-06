export const U = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const qname = (q) => (q === 0 ? "Low" : q === 1 ? "Medium" : "High");
  const el = (id) => document.getElementById(id);
  const now = () => performance.now() / 1000;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function rr(ctx, x, y, w, h, r, fill = true, stroke = false) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function resize(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return { w: rect.width, h: rect.height };
  }

  function quantile(arr, q) {
    if (!arr.length) return 0;
    const a = [...arr].sort((x, y) => x - y);
    const i = (a.length - 1) * q;
    const lo = Math.floor(i),
      hi = Math.ceil(i);
    if (lo === hi) return a[lo];
    const t = i - lo;
    return a[lo] * (1 - t) + a[hi] * t;
  }

  function pathLengths(pts) {
    const seg = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      seg.push(len);
      total += len;
    }
    return { seg, total };
  }

  function pointOnPath(pts, lens, dist) {
    let d = clamp(dist, 0, lens.total);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      const len = lens.seg[i];
      if (d <= len) {
        const t = len === 0 ? 0 : d / len;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= len;
    }
    const last = pts[pts.length - 1];
    return { x: last.x, y: last.y };
  }

  return { clamp, qname, el, rr, resize, quantile, now, pick, pathLengths, pointOnPath };
})();
