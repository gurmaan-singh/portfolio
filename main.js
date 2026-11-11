// A small radar sweep behind the hero, and fade-in as the project cards scroll into view.
document.documentElement.classList.add('js');

(function reveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
})();

(function radar() {
  const canvas = document.getElementById('radar');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RED = '224, 18, 43';
  let size = 0;
  let dpr = 1;

  // A few "aircraft" moving in straight lines, wrapping at the edge, each leaving a short trail.
  const targets = Array.from({ length: 7 }, (_, i) => {
    const a = (i * 2.399) % (Math.PI * 2);
    const r = 0.2 + ((i * 0.37) % 0.65);
    const heading = a + 1.3 + i;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(heading) * 0.012, vy: Math.sin(heading) * 0.012, trail: [] };
  });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    size = Math.max(1, Math.round(rect.width));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }

  function draw(t) {
    const c = size / 2;
    const R = c * 0.96;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${i === 4 ? 0.22 : 0.09})`;
      ctx.beginPath();
      ctx.arc(c, c, (R * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(c - R, c);
    ctx.lineTo(c + R, c);
    ctx.moveTo(c, c - R);
    ctx.lineTo(c, c + R);
    ctx.stroke();

    const angle = reduced ? 0.9 : (t / 5200) % (Math.PI * 2);
    // The sweep: a fading wedge behind the leading edge.
    const steps = 48;
    for (let i = 0; i < steps; i++) {
      const a1 = angle - (i / steps) * 1.1;
      const a0 = angle - ((i + 1) / steps) * 1.1;
      ctx.fillStyle = `rgba(${RED},${0.26 * (1 - i / steps) ** 2})`;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(${RED},0.9)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(angle) * R, c + Math.sin(angle) * R);
    ctx.stroke();

    // Targets glow briefly after the sweep passes over them.
    for (const g of targets) {
      const px = c + g.x * R;
      const py = c + g.y * R;
      const bearing = (Math.atan2(g.y, g.x) + Math.PI * 2) % (Math.PI * 2);
      const since = ((angle - bearing) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const glow = Math.max(0, 1 - since / 2.6);
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.85 * glow})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + glow * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${RED},${0.55 * glow})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      g.trail.forEach(([tx, ty], i) => (i ? ctx.lineTo(c + tx * R, c + ty * R) : ctx.moveTo(c + tx * R, c + ty * R)));
      ctx.stroke();
    }
  }

  let last = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    for (const g of targets) {
      g.x += g.vx * dt * 6;
      g.y += g.vy * dt * 6;
      g.trail.push([g.x, g.y]);
      if (g.trail.length > 30) g.trail.shift();
      if (Math.hypot(g.x, g.y) > 0.98) {
        g.x *= -0.9;
        g.y *= -0.9;
        g.trail.length = 0;
      }
    }
    draw(t);
    if (!reduced) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    draw(performance.now());
  });
  if (reduced) draw(0);
  else requestAnimationFrame(frame);
})();
