// Opening cutscene: plays once per browser session when the game is opened on the home page.
// Any click, tap or key skips straight to the menu; otherwise it ends by itself.
(() => {
  const X = window.XC;
  if (!X || location.pathname.replace(/\/+$/, '') !== '') return;
  try {
    if (sessionStorage.getItem('xplodit.intro.seen')) return;
    sessionStorage.setItem('xplodit.intro.seen', '1');
  } catch { /* storage blocked: just play it */ }

  const DURATION = 14.5;
  const FONT = '"Luckiest Guy", Bungee, sans-serif';
  const LOOKS = [
    { skin: '#FFD3A5', hair: '#5C3A21', hatColor: '#E63946', primary: '#3A86FF', secondary: '#22223B', items: { hat: 'cap', hair: 'short', face: 'happy', eyewear: 'none', top: 'tee', bottom: 'pants', shoes: 'sneakers', back: 'none', bomb: 'classic', trail: 'none', dance: 'flex' } },
    { skin: '#C68642', hair: '#FF70A6', hatColor: '#FFBE0B', primary: '#FF7F11', secondary: '#7B2CBF', items: { hat: 'none', hair: 'pigtails', face: 'cheeky', eyewear: 'none', top: 'hawaii', bottom: 'skirt', shoes: 'bunny', back: 'butterfly', bomb: 'donut', trail: 'hearts', dance: 'floss' } },
    { skin: '#A0E7E5', hair: '#1B1B2F', hatColor: '#8AC926', primary: '#2EC4B6', secondary: '#264653', items: { hat: 'dino', hair: 'short', face: 'angry', eyewear: 'none', top: 'armor', bottom: 'cargo', shoes: 'boots', back: 'sword', bomb: 'skull', trail: 'fire', dance: 'robot' } },
    { skin: '#FFE0BD', hair: '#F4D35E', hatColor: '#7B2CBF', primary: '#B5179E', secondary: '#1B1B2F', items: { hat: 'wizard', hair: 'long', face: 'love', eyewear: 'nerd', top: 'cape', bottom: 'stars', shoes: 'rockets', back: 'none', bomb: 'planet', trail: 'stars', dance: 'spin' } }
  ];

  const overlay = document.createElement('div');
  overlay.id = 'xplodit-intro';
  overlay.setAttribute('role', 'button');
  overlay.setAttribute('aria-label', 'Abertura do Xplodit. Clique para pular.');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#1b1b2f;cursor:pointer;transition:opacity .35s ease;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  overlay.appendChild(canvas);
  const hint = document.createElement('div');
  hint.textContent = 'Clique para pular ⏭';
  hint.style.cssText = 'position:absolute;right:18px;bottom:16px;font:16px "Luckiest Guy",Bungee,sans-serif;letter-spacing:1px;color:#fff;background:rgba(27,27,47,.6);border:3px solid #1b1b2f;border-radius:999px;padding:8px 16px;box-shadow:0 4px 0 #1b1b2f;';
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  let done = false;
  let raf = 0;
  const finish = () => {
    if (done) return;
    done = true;
    overlay.style.opacity = '0';
    setTimeout(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey, true);
      overlay.remove();
    }, 360);
  };
  const onKey = (e) => { e.preventDefault(); e.stopPropagation(); finish(); };
  overlay.addEventListener('pointerdown', finish);
  window.addEventListener('keydown', onKey, true);

  // ------------------------------------------------------------------ scene helpers

  const stars = Array.from({ length: 90 }, (_, i) => ({ x: X.hash(i, 1), y: X.hash(i, 2) * 0.75, r: 0.5 + X.hash(i, 3) * 1.8, p: X.hash(i, 4) * 6 }));
  const confetti = Array.from({ length: 140 }, (_, i) => ({
    a: X.hash(i, 5) * Math.PI * 2, v: 0.4 + X.hash(i, 6) * 1.1, c: ['#ffd60a', '#e63946', '#3a86ff', '#80ed99', '#ff70a6', '#fff'][i % 6], s: 4 + X.hash(i, 7) * 8, spin: X.hash(i, 8) * 10
  }));
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const bounce = (t) => {
    t = clamp01(t);
    if (t < 0.55) return (t / 0.55) * (t / 0.55);
    if (t < 0.8) { const k = (t - 0.675) / 0.125; return 1 - 0.18 * (1 - k * k); }
    const k = (t - 0.9) / 0.1; return 1 - 0.05 * (1 - k * k);
  };

  function rays(cx, cy, colorA, colorB, rot) {
    const R = Math.hypot(W, H);
    ctx.fillStyle = colorA; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colorB;
    for (let i = 0; i < 16; i++) {
      const a = rot + (i / 16) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.lineTo(cx + Math.cos(a + Math.PI / 16) * R, cy + Math.sin(a + Math.PI / 16) * R);
      ctx.closePath(); ctx.fill();
    }
  }

  function title(text, x, y, size, fill, rot = 0, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.fillStyle = X.OUT; ctx.fillText(text, size * 0.06, size * 0.1);
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = X.OUT; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function ground(y, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x / 90) * 6);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = X.OUT; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x / 90) * 6);
    ctx.stroke();
  }

  // ------------------------------------------------------------------ timeline

  let start = 0;
  const frame = (nowMs) => {
    if (!overlay.isConnected) return;
    const t = (nowMs - start) / 1000;
    if (t >= DURATION) finish();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const u = Math.min(W, H) / 10;
    const floorY = H * 0.78;
    const cx = W / 2;
    let shake = 0;
    if (t > 8.6 && t < 9.6) shake = (9.6 - t) * 26;
    ctx.save();
    if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    if (t < 2.6) {
      // A: night, a fuse burns its way across the screen
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#10002b'); g.addColorStop(1, '#3c096c');
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      for (const s of stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s.p)); ctx.fillStyle = '#fff'; X.circle(ctx, s.x * W, s.y * H, s.r); ctx.fill(); }
      ctx.globalAlpha = 1;
      X.circle(ctx, W * 0.82, H * 0.2, u * 0.9); X.fo(ctx, '#fff3b0', u);
      X.circle(ctx, W * 0.82 + u * 0.3, H * 0.2 - u * 0.2, u * 0.18); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fill();
      ground(floorY, '#240046');
      const path = (k) => ({ x: -u + k * (cx + u), y: floorY - u * 0.6 - Math.sin(k * Math.PI * 3) * u * 0.6 });
      const k = ease(t / 2.6);
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = u * 0.12; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = Math.floor(k * 60); i <= 60; i++) { const p = path(i / 60); ctx.lineTo(p.x, p.y); }
      ctx.stroke();
      const sp = path(k);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ['#ffd60a', '#ff7f11', '#fff'][i % 3];
        X.star(ctx, sp.x + (Math.random() - 0.5) * u * 0.6, sp.y + (Math.random() - 0.5) * u * 0.6, u * 0.12, u * 0.04, 4); ctx.fill();
      }
      X.star(ctx, sp.x, sp.y, u * 0.35, u * 0.14, 8, t * 8); X.fo(ctx, '#ffd60a', u, 0.03);
      const a = clamp01(Math.min(t - 0.3, 2.3 - t) * 2);
      title('Numa arena não muito distante...', cx, H * 0.36, Math.floor(u * 0.5), '#fff', 0, a);
    } else if (t < 8.6) {
      // B + C: giant bomb lands, bombers arrive, panic
      rays(cx, floorY - u * 2, '#ff9e00', '#ffbe0b', t * 0.15);
      ground(floorY, '#8ac926');
      const drop = bounce((t - 2.6) / 0.9);
      const by = -u * 3 + (floorY - u * 1.9 + u * 3) * drop;
      const urgency = clamp01((t - 6.3) / 2.3);
      const squash = t < 3.5 ? 1 : 1 + Math.sin(t * (10 + urgency * 30)) * 0.04 * (1 + urgency * 3);
      ctx.save();
      ctx.translate(cx, by + u * 1.9);
      ctx.scale(squash, 2 - squash);
      ctx.translate(-cx, -(by + u * 1.9));
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      X.oval(ctx, cx, floorY + u * 0.1, u * 1.8 * drop, u * 0.3); ctx.fill();
      X.drawBomb(ctx, cx, by, u * (1.9 + urgency * 0.5), 'classic', t < 3.6 ? 9 : 2.4 - urgency * 2.2, nowMs, null, { s: u * 4 });
      ctx.restore();

      // bombers: run in (3.4-5.2), freeze in shock (5.2-6.3), run away (6.3-8.6)
      const lanes = [-1, -1, 1, 1];
      LOOKS.forEach((look, i) => {
        const side = lanes[i];
        const lane = i % 2;
        const home = side * (u * 2.7 + lane * u * 1.3);
        const enter = ease((t - 3.4 - i * 0.15) / 1.4);
        const leave = clamp01((t - 6.3 - i * 0.08) / 1.6);
        let x = cx + side * (W / 2 + u) * (1 - enter) + home * enter;
        x += side * leave * leave * (W * 0.8);
        const y = floorY + lane * u * 0.35;
        const moving = (enter > 0 && enter < 1) || leave > 0;
        const shocked = t > 5.2 && t < 6.3;
        const hop = shocked ? Math.abs(Math.sin((t - 5.2) * 9)) * u * 0.4 : 0;
        const facing = leave > 0 ? (side < 0 ? 3 : 4) : enter < 1 ? (side < 0 ? 4 : 3) : 2;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        X.oval(ctx, x, y, u * 0.4, u * 0.1); ctx.fill();
        X.drawCharacter(ctx, x, y - hop, u * 1.5, look, { facing, moving, now: nowMs + i * 300, armUp: shocked || leave > 0, hurt: leave > 0.05, blinkSeed: i });
        if (shocked) title('!', x + u * 0.3, y - u * 2.2 - hop, Math.floor(u * 0.8), '#e63946', 0.15);
        if (leave > 0) {
          ctx.fillStyle = '#4cc9f0';
          X.heart(ctx, x - side * u * 0.5, y - u * 1.6 + Math.sin(t * 20 + i) * u * 0.1, u * 0.12); ctx.fill();
        }
      });
      if (t > 6.6) title('OH-OH...', cx, H * 0.16, Math.floor(u * (0.8 + Math.sin(t * 12) * 0.05)), '#fff', -0.05);
    } else if (t < 9.8) {
      // D: KABOOM
      const k = (t - 8.6) / 1.2;
      rays(cx, H / 2, '#fff3b0', '#ffd60a', t * 1.5);
      const r = u * (2 + k * 14);
      for (const [c, m] of [['#ff5400', 1], ['#ffbe0b', 0.75], ['#fffbe6', 0.45]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const rr = r * m * (0.8 + 0.2 * X.hash(i, 1)); ctx.lineTo(cx + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }
      X.drawBurst(ctx, cx, H / 2, u * (2.4 + Math.min(1, k * 4) * 0.6), 'KABOOM!', '#ffd60a', '#e63946', -0.12);
      if (k < 0.15) { ctx.fillStyle = `rgba(255,255,255,${1 - k / 0.15})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    } else {
      // E: logo
      rays(cx, H * 0.42, '#ffbe0b', '#ffd60a', t * 0.25);
      const k = t - 9.8;
      for (const c of confetti) {
        const d = k * c.v * u * 4;
        const x = cx + Math.cos(c.a) * d, y = H * 0.42 + Math.sin(c.a) * d + k * k * u * 0.6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.spin * k);
        ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
        ctx.restore();
      }
      ground(floorY + u * 0.4, '#8ac926');
      LOOKS.forEach((look, i) => {
        const pop = bounce((k - 0.9 - i * 0.18) / 0.6);
        const x = cx + (i - 1.5) * u * 1.9;
        const y = floorY + u * 0.4 + (1 - pop) * u * 3;
        X.drawCharacter(ctx, x, y, u * 1.4, look, { facing: 2, now: nowMs, dance: k > 1.6 ? k - 1.6 + i * 0.2 : -1, blinkSeed: i });
      });
      const word = 'XPLODIT';
      const size = Math.floor(Math.min(u * 2.2, W / 6.2));
      ctx.font = `${size}px ${FONT}`;
      const widths = [...word].map(ch => ctx.measureText(ch).width * 0.98);
      const total = widths.reduce((a, b) => a + b, 0);
      let x = cx - total / 2;
      [...word].forEach((ch, i) => {
        const p = bounce((k - i * 0.09) / 0.55);
        const y = H * 0.36 - (1 - p) * H * 0.7 + Math.sin(nowMs / 250 + i) * u * 0.06;
        const colors = ['#e63946', '#ff7f11', '#ffd60a', '#80ed99', '#4cc9f0', '#7b2cbf', '#ff70a6'];
        if (p > 0) title(ch, x + widths[i] / 2, y, size, colors[i], Math.sin(i * 1.7) * 0.12);
        x += widths[i];
      });
      const tag = clamp01((k - 1.4) * 2);
      if (tag > 0) {
        ctx.save();
        ctx.translate(cx, H * 0.53); ctx.rotate(-0.03); ctx.scale(tag, tag);
        X.rrect(ctx, -u * 3.6, -u * 0.42, u * 7.2, u * 0.84, u * 0.42); X.fo(ctx, '#e63946', u, 0.06);
        ctx.restore();
        title('Plante. Exploda. Domine!', cx, H * 0.53, Math.floor(u * 0.5 * tag), '#fff', -0.03);
      }
      if (t > DURATION - 0.6) { ctx.fillStyle = `rgba(27,27,47,${(t - (DURATION - 0.6)) / 0.6})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    }
    ctx.restore();
    raf = requestAnimationFrame(frame);
  };

  const begin = () => { start = performance.now(); raf = requestAnimationFrame(frame); };
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise(r => setTimeout(r, 700))]).then(begin, begin);
  } else begin();
})();
