"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const C = { red: "#ff3a2d", bone: "#e8e4da", dim: "#8a8f93", faint: "#565b5f", line: "#23272a", ink: "#0b0c0d" };
const MONO = "'IBM Plex Mono', monospace";

/* ---------- hero: A* on a grid, routed around the pointer ---------- */
(function hero() {
  const hero = document.querySelector(".hero"), cv = document.getElementById("field"), cap = document.getElementById("live");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const RED = C.red, BONE = "232,228,218";
  let CELL = 20, W = 0, H = 0, cw = 0, ch = 0, grid, S, G, mouse = null, sol = null, solveT = 0, visible = true, dpr = 1;

  const rng = (seed) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  function layout() {
    const r = hero.getBoundingClientRect();
    cw = r.width; ch = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CELL = Math.max(16, Math.round(cw / 70));
    W = Math.floor(cw / CELL); H = Math.floor(ch / CELL);
    S = [0, Math.floor(H * 0.7)]; G = [W - 1, Math.floor(H * 0.3)];
    grid = new Uint8Array(W * H);
    const r1 = rng(11), blocks = Math.floor(W * H / 55);
    for (let b = 0; b < blocks; b++) {
      const bw = 1 + Math.floor(r1() * 4), bh = 1 + Math.floor(r1() * 3), bx = Math.floor(r1() * (W - bw)), by = Math.floor(r1() * (H - bh));
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) grid[y * W + x] = 1;
    }
    for (const [cx, cy] of [S, G]) for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = 0;
    solve();
  }

  const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || grid[y * W + x] === 1 || (mouse && (x - mouse[0]) ** 2 + (y - mouse[1]) ** 2 <= 11);

  function astar() {
    const N = W * H, g = new Float32Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [], order = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const a = 2 * c + 1, b = a + 1; let m = c; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const h = (x, y) => { const dx = Math.abs(x - G[0]), dy = Math.abs(y - G[1]); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    const s = S[1] * W + S[0], goal = G[1] * W + G[0];
    g[s] = 0; push(h(S[0], S[1]), s);
    while (heap.length) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1; order.push(i);
      if (i === goal) { const path = []; for (let c = i; c >= 0; c = par[c]) path.push(c); return { path: path.reverse(), order }; }
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (blocked(nx, ny)) continue;
        if (dx && dy && (blocked(x + dx, y) || blocked(x, y + dy))) continue;
        const n = ny * W + nx, ng = g[i] + (dx && dy ? 1.4142 : 1);
        if (ng < g[n]) { g[n] = ng; par[n] = i; push(ng + h(nx, ny), n); }
      }
    }
    return { path: null, order };
  }

  function solve() {
    const t0 = performance.now(); sol = astar(); const ms = performance.now() - t0; solveT = performance.now();
    cap.innerHTML = sol.path
      ? `A* on a ${W}&times;${H} grid<br><b>${sol.path.length}</b> cells long, <b>${sol.order.length}</b> searched, ${ms.toFixed(1)} ms<br>move the pointer: it re-routes`
      : `A* on a ${W}&times;${H} grid<br><b>no route</b> after searching ${sol.order.length} cells<br>move the pointer away`;
  }

  function draw(now) {
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = `rgba(${BONE},0.07)`;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y * W + x]) ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
    const shown = reduce ? sol.order.length : Math.min(sol.order.length, Math.floor((now - solveT) / 1000 * 3200));
    for (let k = 0; k < shown; k++) {
      const i = sol.order[k], age = shown - k;
      ctx.fillStyle = `rgba(${BONE},${age < 30 ? 0.5 : 0.16})`;
      ctx.fillRect((i % W) * CELL + CELL / 2 - 1.5, ((i / W) | 0) * CELL + CELL / 2 - 1.5, 3, 3);
    }
    if (sol.path && shown === sol.order.length) {
      ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.shadowColor = RED; ctx.shadowBlur = 14;
      ctx.beginPath(); sol.path.forEach((i, k) => { const px = (i % W) * CELL + CELL / 2, py = ((i / W) | 0) * CELL + CELL / 2; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      if (!reduce) {
        const t = ((now / 1000) * 22) % sol.path.length, a = Math.floor(t), i = sol.path[a], j = sol.path[Math.min(a + 1, sol.path.length - 1)], f = t - a;
        const px = lerp((i % W), (j % W), f) * CELL + CELL / 2, py = lerp(((i / W) | 0), ((j / W) | 0), f) * CELL + CELL / 2;
        ctx.fillStyle = "#fff"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    ctx.font = "500 11px " + MONO; ctx.fillStyle = `rgba(${BONE},0.8)`; ctx.textBaseline = "middle";
    for (const [p, l] of [[S, "A"], [G, "B"]]) { const x = p[0] * CELL + CELL / 2, y = p[1] * CELL + CELL / 2; ctx.strokeStyle = `rgba(${BONE},0.8)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); ctx.fillText(l, x + 16, y); }
    if (mouse) { const x = mouse[0] * CELL + CELL / 2, y = mouse[1] * CELL + CELL / 2; ctx.strokeStyle = `rgba(${BONE},0.35)`; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, Math.sqrt(11) * CELL, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  function loop(now) { if (visible && grid) draw(now); requestAnimationFrame(loop); }

  function move(e) {
    const r = cv.getBoundingClientRect(), m = [Math.floor((e.clientX - r.left) / CELL), Math.floor((e.clientY - r.top) / CELL)];
    if (!mouse || mouse[0] !== m[0] || mouse[1] !== m[1]) { mouse = m; solve(); }
  }
  hero.addEventListener("pointermove", move);
  hero.addEventListener("pointerleave", () => { mouse = null; solve(); });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { layout(); requestAnimationFrame(loop); });
})();

/* ---------- index: preview follows the pointer ---------- */
(function peek() {
  const img = document.getElementById("peek");
  if (!img || matchMedia("(hover: none)").matches) return;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const tick = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18; img.style.transform = `translate(${x}px, ${y}px)`; raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0; };
  document.querySelectorAll(".row-link").forEach((a) => {
    a.addEventListener("pointerenter", () => { const im = [...document.querySelectorAll(a.getAttribute("href") + " .figs img, " + a.getAttribute("href") + " .view img")].find((i) => !/\.gif$/.test(i.src)); if (im) img.src = im.src; img.classList.add("on"); });
    a.addEventListener("pointerleave", () => img.classList.remove("on"));
    a.addEventListener("pointermove", (e) => {
      tx = Math.min(e.clientX + 28, innerWidth - 380); ty = Math.max(12, Math.min(e.clientY - 80, innerHeight - img.offsetHeight - 12));
      if (!img.classList.contains("on") || (x === 0 && y === 0)) { x = tx; y = ty; }
      if (!raf) raf = requestAnimationFrame(tick);
    });
  });
})();

/* ---------- rail: where am I ---------- */
(function rail() {
  const links = [...document.querySelectorAll(".rail li a")];
  if (!links.length) return;
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((es) => es.forEach((e) => { const a = map.get(e.target.id); if (a && e.isIntersecting) { links.forEach((l) => l.classList.remove("on")); a.classList.add("on"); } }), { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".entry").forEach((s) => io.observe(s));
})();

/* ---------- stages: tabs, copy button, iframe on demand ---------- */
document.querySelectorAll(".stage").forEach((st) => {
  const tabs = [...st.querySelectorAll(".tabs button")], panes = [...st.querySelectorAll(".pane")];
  tabs.forEach((b) => b.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.toggle("on", x === b));
    panes.forEach((p) => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
  }));
  const start = st.querySelector(".start");
  if (start) start.addEventListener("click", () => {
    const v = start.closest(".view"), f = document.createElement("iframe");
    f.src = v.dataset.src; f.title = v.dataset.title; v.replaceChildren(f); v.classList.remove("poster");
  });
  const cp = st.querySelector(".copy-btn");
  if (cp) cp.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(st.querySelector("pre").textContent); cp.textContent = "Copied"; }
    catch { cp.textContent = "Select it"; }
    setTimeout(() => (cp.textContent = "Copy"), 1400);
  });
});

/* ---------- replays: recorded runs drawn on a canvas ----------
   Each player takes the recorded data and returns { dur, draw(ctx, W, H, f), caption(f) } with f in [0, 1]. */
const RUNS = {};
document.querySelectorAll('script[type="application/json"][id^="run-"]').forEach((s) => { RUNS[s.id.slice(4)] = JSON.parse(s.textContent); });

const at = (arr, f) => arr[Math.min(arr.length - 1, Math.round(f * (arr.length - 1)))];
const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en") : v.toFixed(d));
function text(ctx, s, x, y, col = C.dim, size = 11, align = "left") { ctx.font = `500 ${size}px ${MONO}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y); }
function poly(ctx, pts, col, w = 1.6, dash) { if (pts.length < 2) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round"; if (dash) ctx.setLineDash(dash); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore(); }
function dot(ctx, x, y, r, col, glow) { ctx.save(); if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 14; } ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }

/* a time chart inside a box: series = [{v, col, label}], null values are gaps */
function chart(ctx, box, xs, series, f, o = {}) {
  const { x, y, w, h } = box, n = xs.length, i = Math.round(f * (n - 1));
  let lo = o.lo ?? 0, hi = o.hi ?? -Infinity;
  if (hi === -Infinity) series.forEach((s) => s.v.forEach((v) => { if (v != null) { if (v > hi) hi = v; if (v < lo) lo = v; } }));
  if (hi <= lo) hi = lo + 1;
  const X = (k) => x + ((xs[k] - xs[0]) / (xs[n - 1] - xs[0] || 1)) * w, Y = (v) => y + h - ((v - lo) / (hi - lo)) * h;
  ctx.strokeStyle = C.line; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) { const gy = y + (h * g) / 4; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); text(ctx, fmt(hi - ((hi - lo) * g) / 4, o.dec ?? 0) + (o.yunit ? " " + o.yunit : ""), x - 6, gy, C.faint, 10, "right"); }
  text(ctx, fmt(xs[0], 0) + (o.xunit || ""), x, y + h + 11, C.faint, 10, "left"); text(ctx, fmt(xs[n - 1], 0) + (o.xunit || ""), x + w, y + h + 11, C.faint, 10, "right");
  series.forEach((s) => { let run = []; for (let k = 0; k <= i; k++) { const v = s.v[k]; if (v == null) { poly(ctx, run, s.col, s.w || 1.6, s.dash); run = []; } else run.push([X(k), Y(v)]); } poly(ctx, run, s.col, s.w || 1.6, s.dash); });
  ctx.strokeStyle = C.faint; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(X(i), y); ctx.lineTo(X(i), y + h); ctx.stroke(); ctx.setLineDash([]);
  series.forEach((s, k) => { const v = s.v[i]; text(ctx, `${s.label}${v == null ? "" : "  " + fmt(v, o.dec ?? 0)}`, x + w - 4, y + 10 + k * 15, s.col, 10, "right"); });
}

const PLAYERS = {
  lines(d, o) {
    const xs = d[o.x], S = o.series.map(([k, label, col]) => ({ label, col: C[col], v: d[k] }));
    if (o.norm) S.forEach((s) => { const m = Math.max(...s.v.filter((v) => v != null).map(Math.abs)) || 1; s.v = s.v.map((v) => (v == null ? null : v / m)); });
    return {
      dur: o.dur || 20,
      draw(ctx, W, H, f) { chart(ctx, { x: 58, y: 22, w: W - 76, h: H - 54 }, xs, S, f, { xunit: o.xunit ? " " + o.xunit : "", yunit: o.norm ? "" : o.yunit, dec: o.norm ? 2 : 0, lo: o.norm ? -1 : 0, hi: o.norm ? 1 : undefined }); },
      caption(f) { return `t = ${fmt(at(xs, f), 1)} ${o.xunit || ""}`; },
    };
  },

  hover(d, o) {
    const xs = d.pos.map((p) => p[0]), ys = d.pos.map((p) => p[1]);
    const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 0.6, y0 = Math.min(...ys) - 0.6, y1 = Math.max(...ys) + 0.6;
    return {
      dur: o.dur || d.t[d.t.length - 1],
      draw(ctx, W, H, f) {
        const n = d.t.length, i = Math.round(f * (n - 1)), lw = Math.round(W * 0.6), pad = 22;
        const sc = Math.min((lw - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0)), cx = pad + ((lw - 2 * pad) - (x1 - x0) * sc) / 2, cy = pad + ((H - 2 * pad) - (y1 - y0) * sc) / 2;
        const P = (p) => [cx + (p[0] - x0) * sc, cy + (y1 - p[1]) * sc];
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; for (let g = Math.ceil(x0); g <= x1; g++) { const [gx] = P([g, 0]); ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx, cy + (y1 - y0) * sc); ctx.stroke(); } for (let g = Math.ceil(y0); g <= y1; g++) { const [, gy] = P([0, g]); ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + (x1 - x0) * sc, gy); ctx.stroke(); }
        text(ctx, "from above, 1 m grid", cx, H - 10, C.faint, 10);
        poly(ctx, d.ref.map(P), C.faint, 1, [3, 4]);
        poly(ctx, d.pos.slice(0, i + 1).map(P), C.bone, 1.4);
        poly(ctx, d.est.slice(0, i + 1).map(P), C.red, 1.2);
        const [px, py] = P(d.pos[i]); ctx.save(); ctx.strokeStyle = C.bone; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - 8, py - 8); ctx.lineTo(px + 8, py + 8); ctx.moveTo(px - 8, py + 8); ctx.lineTo(px + 8, py - 8); ctx.stroke(); ctx.restore();
        [[-8, -8], [8, 8], [-8, 8], [8, -8]].forEach(([a, b]) => dot(ctx, px + a, py + b, 2.5, C.bone));
        const [ex, ey] = P(d.est[i]); dot(ctx, ex, ey, 3, C.red, true);
        text(ctx, "truth", lw - pad, 14, C.bone, 10, "right"); text(ctx, "estimate", lw - pad, 29, C.red, 10, "right"); text(ctx, "reference", lw - pad, 44, C.faint, 10, "right");
        chart(ctx, { x: lw + 44, y: 22, w: W - lw - 60, h: H - 54 }, d.t, [{ v: d.pos.map((p) => p[2]), col: C.bone, label: "altitude" }, { v: d.est.map((p) => p[2]), col: C.red, label: "estimate", w: 1.1 }], f, { xunit: " s", yunit: "m", dec: 1, lo: 1, hi: 2 });
      },
      caption(f) { const i = Math.round(f * (d.t.length - 1)), p = d.pos[i], q = d.est[i]; const err = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); return `t = ${fmt(d.t[i])} s, estimate ${fmt(err, 2)} m from the truth`; },
    };
  },

  kartlagg(d, o) {
    const rows = d.grid.length, cols = d.grid[0].length, n = d.truth.length;
    return {
      dur: o.dur || 25,
      draw(ctx, W, H, f) {
        const i = Math.round(f * (n - 1)), cell = Math.min((W - 24) / cols, (H - 44) / rows), ox = (W - cols * cell) / 2, oy = 12;
        const P = (p) => [ox + (p[0] / d.res) * cell, oy + (rows - p[1] / d.res) * cell];
        ctx.fillStyle = "rgba(232,228,218,0.16)";  // "1" is free floor in the export, so the walls are the "0" cells
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (d.grid[r][c] !== "1") ctx.fillRect(ox + c * cell, oy + (rows - 1 - r) * cell, cell + 0.5, cell + 0.5);
        poly(ctx, d.odo.slice(0, i + 1).map(P), C.faint, 1.2, [3, 3]);
        poly(ctx, d.truth.slice(0, i + 1).map(P), C.bone, 1.4);
        poly(ctx, d.slam.slice(0, i + 1).map(P), C.red, 1.4);
        const [rx, ry] = P(d.truth[i]), yaw = d.yaw[i]; dot(ctx, rx, ry, 4, C.bone); poly(ctx, [[rx, ry], [rx + Math.cos(yaw) * 14, ry - Math.sin(yaw) * 14]], C.bone, 2);
        const [sx, sy] = P(d.slam[i]); dot(ctx, sx, sy, 3, C.red, true);
        const [odx, ody] = P(d.odo[i]); dot(ctx, odx, ody, 2.5, C.faint);
        text(ctx, "truth", W - 14, H - 40, C.bone, 10, "right"); text(ctx, "slam estimate", W - 14, H - 26, C.red, 10, "right"); text(ctx, "wheel odometry", W - 14, H - 12, C.faint, 10, "right");
        text(ctx, `${(cols * d.res).toFixed(0)} x ${(rows * d.res).toFixed(0)} m office, ${d.res} m cells`, 14, H - 12, C.faint, 10);
      },
      caption(f) { const i = Math.round(f * (n - 1)), t = d.truth[i], s = d.slam[i], od = d.odo[i]; return `step ${i + 1} of ${n}: SLAM is ${fmt(Math.hypot(t[0] - s[0], t[1] - s[1]), 2)} m off, odometry ${fmt(Math.hypot(t[0] - od[0], t[1] - od[1]), 2)} m`; },
    };
  },

  cartpole(d, o) {
    const n = d.x.length, L = 0.6;
    return {
      dur: o.dur || n * d.dt,
      draw(ctx, W, H, f) {
        const ft = f * (n - 1), a = Math.floor(ft), b = Math.min(n - 1, a + 1), k = ft - a, s = d.x[a].map((v, j) => v + (d.x[b][j] - v) * k);
        const sc = W / 3.4, gx = W / 2, gy = H * 0.66, cw = 0.36 * sc, chh = 0.2 * sc;
        ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(W - 10, gy); ctx.stroke();
        for (let m = -1.5; m <= 1.5; m += 0.5) { const tx = gx + m * sc; ctx.beginPath(); ctx.moveTo(tx, gy); ctx.lineTo(tx, gy + 6); ctx.stroke(); text(ctx, m.toFixed(1), tx, gy + 16, C.faint, 10, "center"); }
        const trail = []; for (let q = 0; q <= a; q++) { const z = d.x[q]; trail.push([gx + (z[0] + L * Math.sin(z[1])) * sc, gy - chh + L * Math.cos(z[1]) * sc]); }
        poly(ctx, trail, "rgba(255,58,45,0.35)", 1);
        const cx = gx + s[0] * sc, px = cx, py = gy - chh, tx = px + L * Math.sin(s[1]) * sc, ty = py + L * Math.cos(s[1]) * sc;
        ctx.fillStyle = C.bone; ctx.fillRect(cx - cw / 2, gy - chh, cw, chh); dot(ctx, cx - cw / 3, gy + 3, 4, C.ink); dot(ctx, cx + cw / 3, gy + 3, 4, C.ink);
        poly(ctx, [[px, py], [tx, ty]], C.red, 3); dot(ctx, tx, ty, 6, C.red, true); dot(ctx, px, py, 3, C.ink);
        const up = ((Math.abs(((s[1] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)) * 180) / Math.PI;
        text(ctx, `t = ${(ft * d.dt).toFixed(2)} s`, 14, 16, C.dim, 11); text(ctx, `${up.toFixed(0)} deg from upright`, 14, 32, C.red, 11); text(ctx, `cart at ${s[0].toFixed(2)} m`, 14, 48, C.dim, 11);
      },
      caption(f) { const i = Math.round(f * (n - 1)); return `step ${i} of ${n - 1}, t = ${(i * d.dt).toFixed(2)} s`; },
    };
  },

  rtsched(d, o) {
    const keys = [["none", "no protocol"], ["pip", "priority inheritance"], ["icpp", "immediate ceiling"]], n = d.none.line.length;
    const col = { L: C.faint, M: C.dim, H: C.red };
    return {
      dur: o.dur || 12,
      draw(ctx, W, H, f) {
        const tick = f * n, x0 = Math.min(176, W * 0.26), cw = (W - x0 - 20) / n, rh = (H - 60) / 3;
        keys.forEach(([k, label], r) => {
          const s = d[k], y = 18 + r * rh;
          text(ctx, label, x0 - 12, y + rh * 0.35, C.bone, 11, "right");
          text(ctx, `H done at ${s.hfin}`, x0 - 12, y + rh * 0.35 + 15, s.hfin === Math.min(...keys.map(([q]) => d[q].hfin)) ? C.red : C.faint, 10, "right");
          for (let t = 0; t < Math.min(n, Math.ceil(tick)); t++) {
            const c = s.line[t]; if (c !== ".") { ctx.fillStyle = col[c]; ctx.fillRect(x0 + t * cw + 1, y, cw - 2, rh * 0.55); }
            if (s.held[t] === "1") { ctx.fillStyle = "rgba(232,228,218,0.5)"; ctx.fillRect(x0 + t * cw + 1, y + rh * 0.62, cw - 2, 3); }
          }
          const hx = x0 + s.hfin * cw; ctx.strokeStyle = C.red; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(hx, y - 4); ctx.lineTo(hx, y + rh * 0.72); ctx.stroke(); ctx.setLineDash([]);
        });
        const cx = x0 + Math.min(n, tick) * cw; ctx.strokeStyle = C.bone; ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, H - 36); ctx.stroke();
        for (let t = 0; t <= n; t += 5) text(ctx, String(t), x0 + t * cw, H - 26, C.faint, 10, "center");
        text(ctx, "H high priority", W - 16, H - 10, C.red, 10, "right"); text(ctx, "M medium", W - 120, H - 10, C.dim, 10, "right"); text(ctx, "L low, holds the resource", W - 190, H - 10, C.faint, 10, "right"); text(ctx, "bar under a cell: resource held", x0, H - 10, C.faint, 10);
      },
      caption(f) { return `tick ${Math.floor(f * n)} of ${n}`; },
    };
  },

  plcsim(d, o) {
    const NAMES = { 0: "idle", 1: "filling A", 2: "filling B", 3: "mixing", 4: "draining", 9: "alarm" }, n = d.t.length;
    return {
      dur: o.dur || 20,
      draw(ctx, W, H, f) {
        const i = Math.round(f * (n - 1)), st = d.state[i], lvl = d.level[i];
        const tw = Math.min(150, W * 0.22), th = H - 90, tx = 60, ty = 30;
        ctx.strokeStyle = C.bone; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + th); ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx + tw, ty); ctx.stroke();
        const fh = (lvl / 100) * th; ctx.fillStyle = "rgba(255,58,45,0.55)"; ctx.fillRect(tx + 1, ty + th - fh, tw - 2, fh);
        text(ctx, `${lvl.toFixed(0)} %`, tx + tw / 2, ty + th - fh - 10, C.bone, 11, "center");
        const lamp = (x, y, on, label) => { dot(ctx, x, y, 5, on ? C.red : C.line, on); text(ctx, label, x + 12, y, on ? C.bone : C.faint, 10); };
        lamp(tx - 34, ty + 6, st === 1, ""); text(ctx, "A", tx - 46, ty + 6, st === 1 ? C.bone : C.faint, 10, "right");
        lamp(tx + tw + 20, ty + 6, st === 2, "B");
        lamp(tx + tw + 20, ty + th / 2, st === 3, "mixer");
        lamp(tx + tw / 2, ty + th + 18, st === 4, "out");
        lamp(tx + tw + 20, ty + th - 8, st === 9, "alarm");
        text(ctx, NAMES[st] || String(st), tx, H - 14, C.red, 12);
        chart(ctx, { x: tx + tw + 130, y: 22, w: W - tx - tw - 150, h: H - 54 }, d.t, [{ v: d.level, col: C.bone, label: "level %" }], f, { xunit: " s", dec: 0, lo: 0, hi: 100 });
      },
      caption(f) { const i = Math.round(f * (n - 1)); return `t = ${d.t[i].toFixed(0)} s, state ${d.state[i]}: ${NAMES[d.state[i]] || "?"}`; },
    };
  },
};

document.querySelectorAll('.stage[data-demo="replay"]').forEach((st) => {
  const data = RUNS[st.dataset.data], mk = PLAYERS[st.dataset.player];
  if (!data || !mk) return;
  const opts = JSON.parse(st.querySelector(".opts").textContent || "{}"), pl = mk(data, opts);
  const cv = st.querySelector(".cv"), ctx = cv.getContext("2d"), play = st.querySelector(".play"), scrub = st.querySelector(".scrub"), tnow = st.querySelector(".tnow");
  let W = 0, H = 0, f = 0, playing = !reduce, visible = false, last = 0;
  const size = () => { const r = cv.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(); };
  const render = () => { if (!W) return; ctx.clearRect(0, 0, W, H); pl.draw(ctx, W, H, f); scrub.value = Math.round(f * 1000); tnow.textContent = pl.caption(f); play.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;"; };
  const loop = (now) => { if (visible && playing) { if (last) { f += (now - last) / 1000 / pl.dur; if (f >= 1) f -= 1; } last = now; render(); } else last = 0; requestAnimationFrame(loop); };
  play.addEventListener("click", () => { playing = !playing; render(); });
  scrub.addEventListener("input", () => { f = scrub.value / 1000; playing = false; render(); });
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(cv);
  if (reduce) f = 1;
  requestAnimationFrame(loop);
});

/* ---------- cansim: real bit-by-bit arbitration, new ids every round ---------- */
(function arbitration() {
  const el = document.getElementById("arb");
  if (!el) return;
  const names = ["brake", "engine", "radio"], rows = [], mk = (label, cls) => { const r = document.createElement("div"); r.className = "r " + (cls || ""); r.innerHTML = `<b>${label}</b>` + '<span class="c"></span>'.repeat(11); el.querySelector(".grid").appendChild(r); return [r.firstChild, [...r.querySelectorAll(".c")]]; };
  names.forEach((n) => rows.push(mk(n)));
  const bus = mk("bus", "bus"), foot = el.querySelector("footer");
  let R, k = 0, wait = 0;
  const hex = (v) => "0x" + v.toString(16).toUpperCase().padStart(3, "0");
  function round() {
    const ids = []; while (ids.length < 3) { const v = 1 + Math.floor(Math.random() * 0x7fe); if (!ids.includes(v)) ids.push(v); }
    const act = [1, 1, 1], lost = [-1, -1, -1], bits = ids.map(() => []), b = [];
    for (let i = 0; i < 11; i++) {
      const want = ids.map((v) => (v >> (10 - i)) & 1); let bv = 1; ids.forEach((_, j) => { if (act[j]) bv &= want[j]; });
      ids.forEach((_, j) => { bits[j].push([want[j], act[j]]); if (act[j] && want[j] && !bv) { act[j] = 0; lost[j] = i; } }); b.push(bv);
    }
    R = { ids, lost, bits, b, win: act.indexOf(1) };
    rows.forEach(([lab], j) => (lab.textContent = hex(ids[j]))); k = 0;
    [...rows.map((r) => r[1]), bus[1]].forEach((cs) => cs.forEach((c) => { c.className = "c hid"; }));
    foot.textContent = "three nodes start together";
  }
  function step() {
    if (wait > 0) { wait--; return; }
    if (k === 11) { foot.textContent = `${hex(R.ids[R.win])} keeps the bus: the lowest id wins`; wait = 7; k = 12; return; }
    if (k > 11) { round(); return; }
    rows.forEach(([, cs], j) => { const c = cs[k], [v, a] = R.bits[j][k]; c.className = "c on" + (v ? " one" : "") + (a ? "" : " out"); });
    const c = bus[1][k]; c.className = "c on" + (R.b[k] ? " one" : "");
    const dropped = R.lost.findIndex((l) => l === k);
    if (dropped >= 0) foot.textContent = `${names[dropped]} sent a 1, saw a 0: backs off at bit ${k + 1}`;
    k++;
  }
  round(); if (!reduce) setInterval(step, 520); else { while (k < 11) step(); step(); }
})();
