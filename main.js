"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- hero: A* on a grid, routed around the pointer ---------- */
(function hero() {
  const hero = document.querySelector(".hero"), cv = document.getElementById("field"), cap = document.getElementById("live");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const RED = "#ff3a2d", BONE = "232,228,218";
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
    ctx.font = "500 11px 'IBM Plex Mono', monospace"; ctx.fillStyle = `rgba(${BONE},0.8)`; ctx.textBaseline = "middle";
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
    a.addEventListener("pointerenter", () => { const im = [...document.querySelectorAll(a.getAttribute("href") + " img")].find((i) => !/\.gif$/.test(i.src) && !i.src.startsWith("data:image/gif")); if (im) img.src = im.src; img.classList.add("on"); });
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
