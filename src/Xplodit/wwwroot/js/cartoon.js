// Cartoon drawing kit shared by the game, the shop, the map previews and the intro.
// Everything is procedural: thick dark outlines, flat shading, white highlights.
(() => {
  const OUT = '#1b1b2f';
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ helpers

  function rgb(color) {
    if (!color) return [136, 136, 136];
    if (color.startsWith('rgb')) return color.match(/\d+/g).slice(0, 3).map(Number);
    let c = color.replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function shade(color, amt) {
    const [r, g, b] = rgb(color).map(v => Math.max(0, Math.min(255, v + amt)));
    return `rgb(${r},${g},${b})`;
  }

  function alpha(color, a) {
    const [r, g, b] = rgb(color);
    return `rgba(${r},${g},${b},${a})`;
  }

  function hash(x, y, k = 0) {
    const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
    return v - Math.floor(v);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
  function oval(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }

  function lw(ctx, s, k = 0.045) { ctx.lineWidth = Math.max(1.2, s * k); }

  /** Fill the current path, then outline it. */
  function fo(ctx, fill, s, k = 0.045) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUT;
    lw(ctx, s, k);
    ctx.stroke();
  }

  function star(ctx, cx, cy, outer, inner, points = 5, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + rot + (i * Math.PI) / points;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  function heart(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.35);
    ctx.bezierCurveTo(cx - size * 0.9, cy - size * 0.2, cx - size * 0.45, cy - size * 0.85, cx, cy - size * 0.35);
    ctx.bezierCurveTo(cx + size * 0.45, cy - size * 0.85, cx + size * 0.9, cy - size * 0.2, cx, cy + size * 0.35);
    ctx.closePath();
  }

  function shine(ctx, x, y, rx, ry, a = 0.55) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    oval(ctx, x, y, rx, ry, -0.5);
    ctx.fill();
  }

  // ------------------------------------------------------------------ character

  /**
   * Chibi bomber. (cx, by) = center and feet line, s = tile size.
   * look: { skin, hair, hatColor, primary, secondary, items: {...} }
   * o: { facing, moving, now, dance (seconds into a dance or -1), hurt, blinkSeed, armUp }
   */
  function drawCharacter(ctx, cx, by, s, look, o = {}) {
    const now = o.now || 0;
    const it = (look && look.items) || {};
    const facing = o.facing || 2;
    const backView = facing === 1;
    const side = facing === 3 ? -1 : facing === 4 ? 1 : 0;
    const walk = o.moving ? Math.sin(now / 70) : 0;
    let bob = o.moving ? Math.abs(Math.sin(now / 70)) * s * 0.045 : Math.sin(now / 420) * s * 0.012;

    // Dance poses.
    let armL = 0.25 - walk * 0.5, armR = -0.25 + walk * 0.5;
    let sway = 0, rot = 0, lift = 0, flipX = 1;
    const d = o.dance >= 0 ? o.dance : -1;
    if (d >= 0) {
      switch (it.dance) {
        case 'spin': flipX = Math.cos(d * 9); armL = 1.2; armR = -1.2; break;
        case 'flex': armL = 2.4; armR = -2.4; lift = Math.abs(Math.sin(d * 7)) * s * 0.08; break;
        case 'robot': {
          const q = Math.floor(d * 4) % 4;
          armL = [1.6, 0, 1.6, 3][q]; armR = [-3, -1.6, 0, -1.6][q]; sway = (q % 2 ? 1 : -1) * s * 0.03;
          break;
        }
        case 'floss': sway = Math.sin(d * 10) * s * 0.07; armL = 0.6 + Math.sin(d * 10) * 0.6; armR = -0.6 + Math.sin(d * 10) * 0.6; break;
        case 'backflip': {
          const t = (d % 1.3) / 1.3;
          lift = Math.sin(t * Math.PI) * s * 0.55; rot = t * TAU; armL = 2.6; armR = -2.6;
          break;
        }
        default: armR = -2.3 + Math.sin(d * 12) * 0.5; lift = Math.abs(Math.sin(d * 5)) * s * 0.03; // wave
      }
    } else if (o.armUp) {
      armL = 2.8; armR = -2.8;
    }

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.translate(cx + sway, by - lift);
    if (rot) { ctx.translate(0, -s * 0.45); ctx.rotate(rot); ctx.translate(0, s * 0.45); }
    if (flipX !== 1) ctx.scale(Math.abs(flipX) < 0.15 ? 0.15 * Math.sign(flipX || 1) : flipX, 1);
    // Squash and stretch while walking.
    if (o.moving) ctx.scale(1 + Math.abs(walk) * 0.04, 1 - Math.abs(walk) * 0.04);

    const r = s * 0.3;
    const hy = -s * 0.68 - bob;
    const tTop = -s * 0.43 - bob * 0.6;
    const tW = s * 0.4;
    const tH = s * 0.25;
    const hips = tTop + tH - s * 0.03;
    const feet = -s * 0.05;

    if (!backView) {
      drawBack(ctx, 0, tTop, s, it.back, now, look, false, o.moving);
      drawCapeBehind(ctx, 0, tTop, tW, s, it.top, look, now, false);
    }
    drawHair(ctx, 0, hy, r, it.hair, look.hair, now, s, 'back', backView);
    drawLegs(ctx, 0, hips, feet, s, it.bottom, look, walk);
    drawShoes(ctx, 0, feet, s, it.shoes, walk, now, o.moving);
    drawTop(ctx, 0, tTop, tW, tH, s, it.top, look, now, backView);
    if (backView) drawCapeBehind(ctx, 0, tTop, tW, s, it.top, look, now, true);
    drawArm(ctx, -tW * 0.5, tTop + s * 0.06, s, armL, it.top, look, -1);
    drawArm(ctx, tW * 0.5, tTop + s * 0.06, s, armR, it.top, look, 1);

    // Head
    const fx = side * r * 0.3;
    ctx.fillStyle = look.skin;
    if (!backView) {
      circle(ctx, -r * 0.95 + fx * 0.3, hy + r * 0.05, r * 0.2); fo(ctx, look.skin, s);
      circle(ctx, r * 0.95 + fx * 0.3, hy + r * 0.05, r * 0.2); fo(ctx, look.skin, s);
    }
    circle(ctx, 0, hy, r); fo(ctx, look.skin, s);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    oval(ctx, r * 0.25, hy + r * 0.25, r * 0.7, r * 0.6); ctx.fill();
    shine(ctx, -r * 0.45, hy - r * 0.5, r * 0.22, r * 0.12, 0.35);

    if (!backView) {
      drawFace(ctx, fx, hy, r, it.face, now, o, s, look);
      drawEyewear(ctx, fx, hy, r, it.eyewear, now, s, look);
    }
    drawHair(ctx, 0, hy, r, it.hair, look.hair, now, s, 'front', backView, side);
    drawHat(ctx, 0, hy, r, it.hat, look.hatColor, now, s, backView, side);
    if (backView) drawBack(ctx, 0, tTop, s, it.back, now, look, true, o.moving);

    ctx.restore();
  }

  function drawArm(ctx, sx, sy, s, angle, top, look, dir) {
    const len = s * 0.17;
    // angle 0 = hanging down; positive swings the left arm out, negative the right arm out.
    const ex = sx - Math.sin(angle) * len;
    const ey = sy + Math.cos(angle) * len;
    const sleeve = top === 'skeleton' ? '#1b1b2f' : top === 'space' ? '#f1f3f5' : top === 'armor' ? '#adb5bd'
      : top === 'tuxedo' || top === 'jacket' ? '#2b2d42' : look.primary;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = s * 0.13;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = sleeve;
    ctx.lineWidth = s * 0.085;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    circle(ctx, ex, ey, s * 0.07); fo(ctx, '#ffffff', s, 0.035);
  }

  // ------------------------------------------------------------------ legs & shoes

  function drawLegs(ctx, cx, hips, feet, s, style, look, walk) {
    const c = look.secondary;
    const legW = s * 0.12;
    const len = feet - hips;
    const lx = cx - s * 0.14, rx = cx + s * 0.02;
    const ly = walk * s * 0.04, ry = -walk * s * 0.04;
    const leg = (x, dy, color, from = 0, to = 1) => {
      rrect(ctx, x, hips + len * from + Math.min(0, dy), legW, len * (to - from) + Math.abs(dy) * 0.5, s * 0.03);
      fo(ctx, color, s, 0.035);
    };

    switch (style) {
      case 'shorts':
        leg(lx, ly, look.skin); leg(rx, ry, look.skin);
        leg(lx, ly, c, 0, 0.55); leg(rx, ry, c, 0, 0.55);
        break;
      case 'skirt':
      case 'kilt': {
        leg(lx, ly, look.skin); leg(rx, ry, look.skin);
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, hips - s * 0.02); ctx.lineTo(cx + s * 0.18, hips - s * 0.02);
        ctx.lineTo(cx + s * 0.25, hips + len * 0.6); ctx.lineTo(cx - s * 0.25, hips + len * 0.6); ctx.closePath();
        fo(ctx, c, s, 0.035);
        if (style === 'kilt') {
          ctx.save(); ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = s * 0.02;
          for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * s * 0.07, hips - s * 0.05); ctx.lineTo(cx + i * s * 0.09, hips + len); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, hips + j * len * 0.2 + s * 0.02); ctx.lineTo(cx + s * 0.3, hips + j * len * 0.2 + s * 0.02); ctx.stroke(); }
          ctx.restore();
        }
        break;
      }
      case 'robot':
        for (const [x, dy] of [[lx, ly], [rx, ry]]) {
          leg(x, dy, '#adb5bd');
          ctx.fillStyle = '#6c757d';
          ctx.fillRect(x, hips + len * 0.45, legW, s * 0.025);
          circle(ctx, x + legW / 2, hips + len * 0.5, s * 0.025); fo(ctx, '#ffd60a', s, 0.02);
        }
        break;
      default: {
        leg(lx, ly, c); leg(rx, ry, c);
        if (style === 'jeans') {
          ctx.fillStyle = look.skin;
          rrect(ctx, lx + legW * 0.2, hips + len * 0.45, legW * 0.55, s * 0.035, 3); ctx.fill();
          rrect(ctx, rx + legW * 0.25, hips + len * 0.25, legW * 0.5, s * 0.03, 3); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(lx + legW * 0.8, hips); ctx.lineTo(lx + legW * 0.8, hips + len); ctx.stroke();
        } else if (style === 'cargo') {
          for (const x of [lx - s * 0.015, rx + legW - s * 0.035]) { rrect(ctx, x, hips + len * 0.35, s * 0.05, s * 0.06, 2); fo(ctx, shade(c, -25), s, 0.025); }
        } else if (style === 'stars') {
          ctx.fillStyle = '#ffd60a';
          for (const [x, y] of [[lx + legW * 0.5, 0.3], [rx + legW * 0.4, 0.55], [lx + legW * 0.4, 0.75], [rx + legW * 0.6, 0.2]]) {
            star(ctx, x, hips + len * y, s * 0.03, s * 0.013); ctx.fill();
          }
        }
        // belt
        rrect(ctx, cx - s * 0.17, hips - s * 0.015, s * 0.34, s * 0.04, 2); fo(ctx, shade(c, -40), s, 0.03);
      }
    }
  }

  function drawShoes(ctx, cx, feet, s, style, walk, now, moving) {
    const feetX = [cx - s * 0.08, cx + s * 0.08];
    const lifts = [walk * s * 0.04, -walk * s * 0.04];
    for (let i = 0; i < 2; i++) {
      const x = feetX[i], y = feet + Math.min(0, lifts[i]);
      const side = i === 0 ? -1 : 1;
      switch (style) {
        case 'boots':
        case 'rain':
          rrect(ctx, x - s * 0.07, y - s * 0.09, s * 0.12, s * 0.1, 3); fo(ctx, style === 'rain' ? '#ffd60a' : '#8b5a2b', s, 0.035);
          oval(ctx, x + side * s * 0.01, y + s * 0.01, s * 0.085, s * 0.04); fo(ctx, style === 'rain' ? '#ffbe0b' : '#6f4518', s, 0.035);
          break;
        case 'sandals':
          oval(ctx, x + side * s * 0.01, y + s * 0.01, s * 0.08, s * 0.035); fo(ctx, '#c08552', s, 0.03);
          ctx.strokeStyle = '#e63946'; ctx.lineWidth = s * 0.025;
          ctx.beginPath(); ctx.moveTo(x - s * 0.04, y - s * 0.01); ctx.lineTo(x + s * 0.04, y - s * 0.01); ctx.stroke();
          break;
        case 'hightops':
          rrect(ctx, x - s * 0.065, y - s * 0.07, s * 0.11, s * 0.08, 3); fo(ctx, '#e63946', s, 0.035);
          oval(ctx, x + side * s * 0.015, y + s * 0.01, s * 0.085, s * 0.038); fo(ctx, '#ffffff', s, 0.035);
          break;
        case 'bunny':
          oval(ctx, x + side * s * 0.01, y, s * 0.09, s * 0.055); fo(ctx, '#ffc8dd', s, 0.035);
          oval(ctx, x - s * 0.03, y - s * 0.06, s * 0.018, s * 0.045, -0.3); fo(ctx, '#ffc8dd', s, 0.025);
          oval(ctx, x + s * 0.03, y - s * 0.06, s * 0.018, s * 0.045, 0.3); fo(ctx, '#ffc8dd', s, 0.025);
          break;
        case 'flippers':
          ctx.beginPath();
          ctx.moveTo(x - s * 0.04, y - s * 0.02); ctx.lineTo(x + side * s * 0.13, y + s * 0.03);
          ctx.lineTo(x + side * s * 0.1, y + s * 0.05); ctx.lineTo(x - s * 0.05, y + s * 0.03); ctx.closePath();
          fo(ctx, '#2ec4b6', s, 0.03);
          break;
        case 'skates':
          rrect(ctx, x - s * 0.065, y - s * 0.06, s * 0.12, s * 0.065, 3); fo(ctx, '#ff70a6', s, 0.035);
          ctx.fillStyle = '#adb5bd'; ctx.fillRect(x - s * 0.06, y + s * 0.005, s * 0.12, s * 0.012);
          circle(ctx, x - s * 0.035, y + s * 0.03, s * 0.022); fo(ctx, '#ffd60a', s, 0.02);
          circle(ctx, x + s * 0.035, y + s * 0.03, s * 0.022); fo(ctx, '#ffd60a', s, 0.02);
          break;
        case 'rockets':
          if (moving || Math.sin(now / 40 + i) > 0) {
            ctx.fillStyle = Math.floor(now / 50 + i) % 2 ? '#ffbe0b' : '#ff7f11';
            ctx.beginPath(); ctx.moveTo(x - s * 0.04, y + s * 0.03); ctx.lineTo(x + s * 0.04, y + s * 0.03); ctx.lineTo(x, y + s * (0.1 + Math.random() * 0.05)); ctx.fill();
          }
          rrect(ctx, x - s * 0.065, y - s * 0.07, s * 0.12, s * 0.09, 4); fo(ctx, '#ced4da', s, 0.035);
          ctx.fillStyle = '#e63946'; ctx.fillRect(x - s * 0.06, y - s * 0.04, s * 0.11, s * 0.02);
          break;
        case 'gold':
          oval(ctx, x + side * s * 0.015, y, s * 0.085, s * 0.045); fo(ctx, '#ffd60a', s, 0.035);
          shine(ctx, x - s * 0.02, y - s * 0.015, s * 0.025, s * 0.01, 0.8);
          if (Math.sin(now / 200 + i * 2) > 0.85) { ctx.fillStyle = '#fff'; star(ctx, x + s * 0.05, y - s * 0.04, s * 0.03, s * 0.01, 4); ctx.fill(); }
          break;
        default: // sneakers
          oval(ctx, x + side * s * 0.015, y, s * 0.085, s * 0.045); fo(ctx, '#ffffff', s, 0.035);
          ctx.fillStyle = '#e63946'; ctx.fillRect(x - s * 0.05, y - s * 0.005, s * 0.1, s * 0.015);
      }
    }
  }

  // ------------------------------------------------------------------ torso

  function drawCapeBehind(ctx, cx, tTop, tW, s, top, look, now, front) {
    if (!['cape', 'superhero', 'king'].includes(top)) return;
    const color = top === 'superhero' ? look.secondary : top === 'king' ? '#c1121f' : look.primary;
    const wave = Math.sin(now / 160) * s * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - tW * 0.45, tTop + s * 0.02);
    ctx.lineTo(cx + tW * 0.45, tTop + s * 0.02);
    ctx.lineTo(cx + tW * 0.8 + wave, -s * 0.06);
    ctx.quadraticCurveTo(cx, -s * 0.02 + wave, cx - tW * 0.8 - wave, -s * 0.06);
    ctx.closePath();
    fo(ctx, front ? color : shade(color, -35), s);
    if (top === 'king') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - tW * 0.8, -s * 0.09, tW * 1.6, s * 0.035);
    }
  }

  function drawTop(ctx, cx, top, w, h, s, style, look, now, backView) {
    const c = look.primary;
    const x = cx - w / 2;
    let base = c;
    if (style === 'tuxedo' || style === 'jacket') base = '#2b2d42';
    else if (style === 'skeleton') base = '#1b1b2f';
    else if (style === 'armor') base = '#adb5bd';
    else if (style === 'space') base = '#f1f3f5';
    else if (style === 'king') base = '#c1121f';
    rrect(ctx, x, top, w, h, s * 0.09);
    fo(ctx, base, s);
    if (backView) {
      if (style === 'jersey') { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(s * 0.15)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('10', cx, top + h * 0.55); }
      if (style === 'hoodie') { oval(ctx, cx, top + s * 0.03, w * 0.35, s * 0.06); fo(ctx, shade(c, -20), s, 0.03); }
      return;
    }

    ctx.save();
    rrect(ctx, x, top, w, h, s * 0.09);
    ctx.clip();
    switch (style) {
      case 'stripes':
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < 3; i++) ctx.fillRect(x, top + h * (0.18 + i * 0.3), w, h * 0.12);
        break;
      case 'vest':
        ctx.fillStyle = '#f8f9fa'; ctx.fillRect(cx - w * 0.17, top, w * 0.34, h);
        ctx.fillStyle = '#1b1b2f';
        for (let i = 0; i < 3; i++) { circle(ctx, cx, top + h * (0.25 + i * 0.25), s * 0.012); ctx.fill(); }
        break;
      case 'hoodie':
        rrect(ctx, cx - w * 0.28, top + h * 0.55, w * 0.56, h * 0.35, s * 0.04); fo(ctx, shade(c, -20), s, 0.03);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.015;
        ctx.beginPath(); ctx.moveTo(cx - w * 0.1, top); ctx.lineTo(cx - w * 0.12, top + h * 0.4); ctx.moveTo(cx + w * 0.1, top); ctx.lineTo(cx + w * 0.12, top + h * 0.4); ctx.stroke();
        break;
      case 'overalls':
        rrect(ctx, cx - w * 0.3, top + h * 0.35, w * 0.6, h, s * 0.03); fo(ctx, look.secondary, s, 0.03);
        ctx.fillStyle = look.secondary;
        ctx.fillRect(cx - w * 0.32, top, w * 0.1, h * 0.4); ctx.fillRect(cx + w * 0.22, top, w * 0.1, h * 0.4);
        ctx.fillStyle = '#ffd60a';
        circle(ctx, cx - w * 0.25, top + h * 0.42, s * 0.018); ctx.fill(); circle(ctx, cx + w * 0.25, top + h * 0.42, s * 0.018); ctx.fill();
        break;
      case 'hawaii':
        for (let i = 0; i < 7; i++) {
          const fx = x + hash(i, 1) * w, fy = top + hash(i, 2) * h;
          ctx.fillStyle = ['#fff', '#ffd60a', '#ff70a6'][i % 3];
          for (let p = 0; p < 5; p++) { circle(ctx, fx + Math.cos(p * 1.26) * s * 0.02, fy + Math.sin(p * 1.26) * s * 0.02, s * 0.016); ctx.fill(); }
        }
        break;
      case 'jersey':
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, top + h * 0.82, w, h * 0.18);
        ctx.font = `bold ${Math.floor(s * 0.13)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('10', cx, top + h * 0.45);
        break;
      case 'jacket':
        ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = s * 0.02;
        ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + h); ctx.stroke();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(cx - w * 0.3, top); ctx.lineTo(cx - w * 0.05, top + h * 0.35); ctx.lineTo(cx - w * 0.1, top); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + w * 0.3, top); ctx.lineTo(cx + w * 0.05, top + h * 0.35); ctx.lineTo(cx + w * 0.1, top); ctx.fill();
        break;
      case 'kimono':
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.03;
        ctx.beginPath(); ctx.moveTo(cx - w * 0.3, top); ctx.lineTo(cx + w * 0.1, top + h * 0.65); ctx.moveTo(cx + w * 0.3, top); ctx.lineTo(cx - w * 0.05, top + h * 0.45); ctx.stroke();
        ctx.fillStyle = look.secondary; ctx.fillRect(x, top + h * 0.62, w, h * 0.2);
        break;
      case 'tuxedo':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(cx - w * 0.2, top); ctx.lineTo(cx + w * 0.2, top); ctx.lineTo(cx, top + h * 0.85); ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(cx, top + h * 0.15); ctx.lineTo(cx - w * 0.15, top + h * 0.03); ctx.lineTo(cx - w * 0.15, top + h * 0.27); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, top + h * 0.15); ctx.lineTo(cx + w * 0.15, top + h * 0.03); ctx.lineTo(cx + w * 0.15, top + h * 0.27); ctx.closePath(); ctx.fill();
        break;
      case 'skeleton':
        ctx.strokeStyle = '#f8f9fa'; ctx.lineWidth = s * 0.025;
        ctx.beginPath(); ctx.moveTo(cx, top + h * 0.1); ctx.lineTo(cx, top + h * 0.9); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const yy = top + h * (0.25 + i * 0.22);
          ctx.beginPath(); ctx.moveTo(cx - w * 0.32, yy + s * 0.02); ctx.quadraticCurveTo(cx, yy - s * 0.02, cx + w * 0.32, yy + s * 0.02); ctx.stroke();
        }
        break;
      case 'armor':
        ctx.fillStyle = '#ced4da'; ctx.fillRect(x, top, w, h * 0.45);
        circle(ctx, cx, top + h * 0.45, s * 0.05); fo(ctx, c, s, 0.03);
        ctx.fillStyle = '#495057';
        for (const px of [x + s * 0.03, x + w - s * 0.03]) { circle(ctx, px, top + s * 0.03, s * 0.012); ctx.fill(); }
        break;
      case 'superhero':
        ctx.beginPath(); ctx.moveTo(cx, top + h * 0.15); ctx.lineTo(cx + w * 0.2, top + h * 0.45); ctx.lineTo(cx, top + h * 0.8); ctx.lineTo(cx - w * 0.2, top + h * 0.45); ctx.closePath();
        fo(ctx, '#ffd60a', s, 0.03);
        ctx.fillStyle = OUT; ctx.font = `bold ${Math.floor(s * 0.1)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('X', cx, top + h * 0.48);
        break;
      case 'space':
        rrect(ctx, cx - w * 0.22, top + h * 0.25, w * 0.44, h * 0.4, s * 0.02); fo(ctx, '#495057', s, 0.025);
        ctx.fillStyle = Math.floor(now / 300) % 2 ? '#80ed99' : '#e63946'; circle(ctx, cx - w * 0.1, top + h * 0.45, s * 0.015); ctx.fill();
        ctx.fillStyle = '#4cc9f0'; circle(ctx, cx + w * 0.08, top + h * 0.45, s * 0.015); ctx.fill();
        ctx.fillStyle = c; ctx.fillRect(x, top + h * 0.8, w, h * 0.1);
        break;
      case 'king':
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - w * 0.12, top, w * 0.24, h);
        ctx.fillStyle = OUT;
        for (let i = 0; i < 4; i++) { circle(ctx, cx + (i % 2 ? 0.04 : -0.04) * s, top + h * (0.15 + i * 0.22), s * 0.01); ctx.fill(); }
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = s * 0.02;
        ctx.beginPath(); ctx.arc(cx, top - s * 0.02, w * 0.38, 0.3, Math.PI - 0.3); ctx.stroke();
        break;
      case 'cape':
        circle(ctx, cx, top + s * 0.03, s * 0.03); fo(ctx, '#ffd60a', s, 0.025);
        break;
      default: // tee
        ctx.strokeStyle = shade(c, -45); ctx.lineWidth = s * 0.02;
        ctx.beginPath(); ctx.arc(cx, top, w * 0.18, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    ctx.restore();
    shine(ctx, x + w * 0.22, top + h * 0.25, w * 0.1, h * 0.12, 0.25);
  }

  // ------------------------------------------------------------------ face

  function drawFace(ctx, fx, hy, r, style, now, o, s, look) {
    const ex = r * 0.38;
    const ey = hy + r * 0.02;
    const seed = o.blinkSeed || 0;
    const blink = ((now + seed * 997) % 3600) < 120 && style !== 'robot' && style !== 'love';
    ctx.lineCap = 'round';

    const eyeWhite = (x, rx = r * 0.17, ry = r * 0.23) => { oval(ctx, x, ey, rx, ry); fo(ctx, '#fff', s, 0.03); };
    const pupil = (x, pr = r * 0.11, color = OUT) => {
      ctx.fillStyle = color; circle(ctx, x + fx * 0.25, ey + r * 0.03, pr); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, x + fx * 0.25 - pr * 0.35, ey - pr * 0.3, pr * 0.35); ctx.fill();
    };
    const mouthArc = (y, w, a0 = 0.15, a1 = 0.85) => {
      ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
      ctx.beginPath(); ctx.arc(fx, y, w, a0 * Math.PI, a1 * Math.PI); ctx.stroke();
    };
    const blush = () => {
      ctx.fillStyle = 'rgba(255,90,120,0.35)';
      oval(ctx, fx - r * 0.62, hy + r * 0.3, r * 0.15, r * 0.09); ctx.fill();
      oval(ctx, fx + r * 0.62, hy + r * 0.3, r * 0.15, r * 0.09); ctx.fill();
    };

    if (o.hurt) {
      ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.1);
      for (const x of [fx - ex, fx + ex]) {
        ctx.beginPath(); ctx.moveTo(x - r * 0.12, ey - r * 0.12); ctx.lineTo(x + r * 0.12, ey + r * 0.12);
        ctx.moveTo(x + r * 0.12, ey - r * 0.12); ctx.lineTo(x - r * 0.12, ey + r * 0.12); ctx.stroke();
      }
      oval(ctx, fx, hy + r * 0.48, r * 0.14, r * 0.1); fo(ctx, '#7a0010', s, 0.03);
      return;
    }

    if (blink) {
      ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
      for (const x of [fx - ex, fx + ex]) { ctx.beginPath(); ctx.arc(x, ey, r * 0.13, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
    }

    switch (style) {
      case 'angry':
        if (!blink) { eyeWhite(fx - ex); eyeWhite(fx + ex); pupil(fx - ex); pupil(fx + ex); }
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.beginPath(); ctx.moveTo(fx - ex - r * 0.2, ey - r * 0.36); ctx.lineTo(fx - ex + r * 0.18, ey - r * 0.2);
        ctx.moveTo(fx + ex + r * 0.2, ey - r * 0.36); ctx.lineTo(fx + ex - r * 0.18, ey - r * 0.2); ctx.stroke();
        rrect(ctx, fx - r * 0.22, hy + r * 0.42, r * 0.44, r * 0.14, r * 0.05); fo(ctx, '#fff', s, 0.03);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx - r * 0.22, hy + r * 0.49); ctx.lineTo(fx + r * 0.22, hy + r * 0.49); ctx.stroke();
        break;
      case 'cheeky':
        if (!blink) { eyeWhite(fx + ex); pupil(fx + ex); }
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.beginPath(); ctx.moveTo(fx - ex - r * 0.13, ey); ctx.lineTo(fx - ex + r * 0.1, ey - r * 0.08); ctx.lineTo(fx - ex - r * 0.1, ey - r * 0.16); ctx.stroke();
        mouthArc(hy + r * 0.3, r * 0.22);
        oval(ctx, fx + r * 0.08, hy + r * 0.55, r * 0.1, r * 0.12); fo(ctx, '#ff6b81', s, 0.03);
        blush();
        break;
      case 'surprised':
        if (!blink) { eyeWhite(fx - ex, r * 0.2, r * 0.25); eyeWhite(fx + ex, r * 0.2, r * 0.25); pupil(fx - ex, r * 0.07); pupil(fx + ex, r * 0.07); }
        oval(ctx, fx, hy + r * 0.48, r * 0.11, r * 0.15); fo(ctx, '#7a0010', s, 0.03);
        break;
      case 'sleepy':
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
        for (const x of [fx - ex, fx + ex]) { ctx.beginPath(); ctx.moveTo(x - r * 0.14, ey + r * 0.02); ctx.lineTo(x + r * 0.14, ey + r * 0.02); ctx.stroke(); }
        oval(ctx, fx, hy + r * 0.45, r * 0.07, r * 0.05); fo(ctx, '#7a0010', s, 0.025);
        ctx.fillStyle = OUT; ctx.font = `bold ${Math.floor(r * 0.5)}px Bungee, sans-serif`; ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 300);
        ctx.fillText('z', fx + r * 0.9, hy - r * 0.8 - (now / 40) % (r * 0.4));
        ctx.globalAlpha = 1;
        break;
      case 'cat':
        if (!blink) {
          for (const x of [fx - ex, fx + ex]) {
            oval(ctx, x, ey, r * 0.17, r * 0.22); fo(ctx, '#b5e48c', s, 0.03);
            ctx.fillStyle = OUT; oval(ctx, x + fx * 0.2, ey, r * 0.04, r * 0.17); ctx.fill();
          }
        }
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.3, r * 0.07);
        ctx.beginPath(); ctx.arc(fx - r * 0.09, hy + r * 0.4, r * 0.09, 0, Math.PI); ctx.arc(fx + r * 0.09, hy + r * 0.4, r * 0.09, 0, Math.PI); ctx.stroke();
        ctx.lineWidth = 1;
        for (const sgn of [-1, 1]) for (const dy of [-0.05, 0.08]) {
          ctx.beginPath(); ctx.moveTo(fx + sgn * r * 0.35, hy + r * (0.35 + dy)); ctx.lineTo(fx + sgn * r * 0.85, hy + r * (0.3 + dy * 2)); ctx.stroke();
        }
        ctx.fillStyle = '#ff70a6'; heart(ctx, fx, hy + r * 0.3, r * 0.12); ctx.fill();
        break;
      case 'love':
        for (const x of [fx - ex, fx + ex]) {
          const p = 1 + 0.12 * Math.sin(now / 120);
          heart(ctx, x, ey + r * 0.04, r * 0.24 * p); fo(ctx, '#ff3d6e', s, 0.03);
        }
        mouthArc(hy + r * 0.28, r * 0.24);
        blush();
        break;
      case 'vampire':
        if (!blink) { eyeWhite(fx - ex); eyeWhite(fx + ex); pupil(fx - ex, r * 0.1, '#c1121f'); pupil(fx + ex, r * 0.1, '#c1121f'); }
        mouthArc(hy + r * 0.3, r * 0.24, 0.1, 0.9);
        ctx.fillStyle = '#fff';
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(fx + sgn * r * 0.15, hy + r * 0.5); ctx.lineTo(fx + sgn * r * 0.07, hy + r * 0.5); ctx.lineTo(fx + sgn * r * 0.11, hy + r * 0.66); ctx.closePath();
          fo(ctx, '#fff', s, 0.02);
        }
        break;
      case 'crazy': {
        if (!blink) {
          eyeWhite(fx - ex, r * 0.22, r * 0.27); eyeWhite(fx + ex, r * 0.13, r * 0.16);
          ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.2, r * 0.05);
          for (const [x, rr] of [[fx - ex, r * 0.16], [fx + ex, r * 0.1]]) {
            ctx.beginPath();
            for (let a = 0; a < 12; a += 0.4) { const rad = (a / 12) * rr; ctx.lineTo(x + Math.cos(a + now / 150) * rad, ey + Math.sin(a + now / 150) * rad); }
            ctx.stroke();
          }
        }
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) ctx.lineTo(fx - r * 0.3 + i * r * 0.075, hy + r * 0.45 + (i % 2 ? r * 0.06 : -r * 0.03));
        ctx.stroke();
        oval(ctx, fx + r * 0.16, hy + r * 0.56, r * 0.07, r * 0.1); fo(ctx, '#ff6b81', s, 0.025);
        break;
      }
      case 'robot': {
        const glow = 0.7 + 0.3 * Math.sin(now / 200);
        for (const x of [fx - ex, fx + ex]) {
          rrect(ctx, x - r * 0.15, ey - r * 0.1, r * 0.3, r * 0.2, r * 0.04); fo(ctx, `rgba(76,201,240,${glow})`, s, 0.03);
        }
        rrect(ctx, fx - r * 0.25, hy + r * 0.38, r * 0.5, r * 0.16, r * 0.03); fo(ctx, '#adb5bd', s, 0.03);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(fx - r * 0.25 + i * r * 0.125, hy + r * 0.38); ctx.lineTo(fx - r * 0.25 + i * r * 0.125, hy + r * 0.54); ctx.stroke(); }
        break;
      }
      default: // happy
        if (!blink) { eyeWhite(fx - ex); eyeWhite(fx + ex); pupil(fx - ex); pupil(fx + ex); }
        ctx.beginPath(); ctx.arc(fx, hy + r * 0.3, r * 0.24, 0.12 * Math.PI, 0.88 * Math.PI); ctx.closePath();
        fo(ctx, '#7a0010', s, 0.03);
        ctx.fillStyle = '#ff6b81'; oval(ctx, fx, hy + r * 0.49, r * 0.1, r * 0.04); ctx.fill();
        blush();
    }
  }

  function drawEyewear(ctx, fx, hy, r, style, now, s, look) {
    const ex = r * 0.38, ey = hy + r * 0.02;
    switch (style) {
      case 'nerd':
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.08);
        for (const x of [fx - ex, fx + ex]) { circle(ctx, x, ey, r * 0.22); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(fx - ex + r * 0.22, ey); ctx.lineTo(fx + ex - r * 0.22, ey); ctx.stroke();
        break;
      case 'sunglasses':
        for (const x of [fx - ex, fx + ex]) { rrect(ctx, x - r * 0.25, ey - r * 0.16, r * 0.5, r * 0.3, r * 0.1); fo(ctx, '#111', s, 0.03); }
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.07);
        ctx.beginPath(); ctx.moveTo(fx - ex + r * 0.25, ey - r * 0.05); ctx.lineTo(fx + ex - r * 0.25, ey - r * 0.05); ctx.stroke();
        shine(ctx, fx - ex - r * 0.08, ey - r * 0.06, r * 0.08, r * 0.03, 0.7);
        shine(ctx, fx + ex - r * 0.08, ey - r * 0.06, r * 0.08, r * 0.03, 0.7);
        break;
      case 'mustache':
        ctx.beginPath();
        ctx.moveTo(fx, hy + r * 0.28);
        ctx.bezierCurveTo(fx - r * 0.2, hy + r * 0.12, fx - r * 0.5, hy + r * 0.25, fx - r * 0.55, hy + r * 0.12);
        ctx.bezierCurveTo(fx - r * 0.55, hy + r * 0.42, fx - r * 0.2, hy + r * 0.42, fx, hy + r * 0.34);
        ctx.bezierCurveTo(fx + r * 0.2, hy + r * 0.42, fx + r * 0.55, hy + r * 0.42, fx + r * 0.55, hy + r * 0.12);
        ctx.bezierCurveTo(fx + r * 0.5, hy + r * 0.25, fx + r * 0.2, hy + r * 0.12, fx, hy + r * 0.28);
        fo(ctx, look.hair || '#5c3a21', s, 0.03);
        break;
      case 'clown':
        circle(ctx, fx, hy + r * 0.22, r * 0.16); fo(ctx, '#e63946', s, 0.035);
        shine(ctx, fx - r * 0.05, hy + r * 0.16, r * 0.05, r * 0.03, 0.8);
        break;
      case 'eyepatch':
        ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.06);
        ctx.beginPath(); ctx.moveTo(fx - r * 0.95, hy - r * 0.35); ctx.lineTo(fx + r * 0.95, hy + r * 0.05); ctx.stroke();
        oval(ctx, fx - ex, ey, r * 0.2, r * 0.18); fo(ctx, '#111', s, 0.03);
        break;
      case 'beard':
        ctx.beginPath();
        ctx.arc(fx, hy + r * 0.15, r * 0.82, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.quadraticCurveTo(fx, hy + r * 1.35, fx + Math.cos(0.12 * Math.PI) * r * 0.82, hy + r * 0.15 + Math.sin(0.12 * Math.PI) * r * 0.82);
        fo(ctx, look.hair || '#5c3a21', s, 0.03);
        ctx.fillStyle = '#7a0010'; oval(ctx, fx, hy + r * 0.48, r * 0.12, r * 0.06); ctx.fill();
        break;
      case 'monocle':
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = Math.max(1.5, r * 0.08);
        circle(ctx, fx + ex, ey, r * 0.22); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(fx + ex, ey + r * 0.22); ctx.quadraticCurveTo(fx + ex + r * 0.2, hy + r * 0.9, fx + ex + r * 0.4, hy + r * 1.1); ctx.stroke();
        ctx.fillStyle = 'rgba(200,240,255,0.35)'; circle(ctx, fx + ex, ey, r * 0.2); ctx.fill();
        break;
      case '3d':
        rrect(ctx, fx - r * 0.7, ey - r * 0.18, r * 1.4, r * 0.34, r * 0.06); fo(ctx, '#fff', s, 0.03);
        ctx.fillStyle = 'rgba(230,57,70,0.85)'; rrect(ctx, fx - ex - r * 0.18, ey - r * 0.12, r * 0.36, r * 0.22, 2); ctx.fill();
        ctx.fillStyle = 'rgba(76,201,240,0.85)'; rrect(ctx, fx + ex - r * 0.18, ey - r * 0.12, r * 0.36, r * 0.22, 2); ctx.fill();
        break;
      case 'ninja':
        ctx.save();
        circle(ctx, fx * 0.3, hy, r * 0.98); ctx.clip();
        ctx.fillStyle = '#22223b'; ctx.fillRect(fx - r * 1.2, hy + r * 0.22, r * 2.4, r);
        ctx.restore();
        ctx.strokeStyle = OUT; lw(ctx, s, 0.03);
        ctx.beginPath(); ctx.moveTo(fx - r * 0.92, hy + r * 0.22); ctx.lineTo(fx + r * 0.92, hy + r * 0.22); ctx.stroke();
        break;
      case 'hero':
        ctx.beginPath();
        ctx.moveTo(fx - r * 0.8, ey - r * 0.08);
        ctx.quadraticCurveTo(fx - ex, ey - r * 0.35, fx, ey - r * 0.1);
        ctx.quadraticCurveTo(fx + ex, ey - r * 0.35, fx + r * 0.8, ey - r * 0.08);
        ctx.quadraticCurveTo(fx + ex, ey + r * 0.32, fx, ey + r * 0.08);
        ctx.quadraticCurveTo(fx - ex, ey + r * 0.32, fx - r * 0.8, ey - r * 0.08);
        fo(ctx, look.primary || '#e63946', s, 0.03);
        ctx.fillStyle = '#fff';
        for (const x of [fx - ex, fx + ex]) { oval(ctx, x, ey, r * 0.1, r * 0.07); ctx.fill(); }
        break;
      case 'visor': {
        rrect(ctx, fx - r * 0.85, ey - r * 0.17, r * 1.7, r * 0.32, r * 0.15);
        const g = ctx.createLinearGradient(fx - r, 0, fx + r, 0);
        const t = (now / 900) % 1;
        g.addColorStop(0, '#00b4d8'); g.addColorStop(t, '#caf0f8'); g.addColorStop(1, '#7209b7');
        fo(ctx, g, s, 0.03);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ hair

  function drawHair(ctx, cx, hy, r, style, color, now, s, layer, backView, side = 0) {
    if (!style || style === 'none') return;
    const c = color || '#5c3a21';
    const cap = () => {
      ctx.beginPath();
      ctx.arc(cx, hy, r * 1.04, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(cx + r * 0.5, hy - r * 0.45, cx, hy - r * 0.5);
      ctx.quadraticCurveTo(cx - r * 0.5, hy - r * 0.45, cx - r * 1.04, hy - r * 0.07);
      fo(ctx, c, s);
      if (backView) { circle(ctx, cx, hy - r * 0.05, r * 1.0); fo(ctx, c, s); }
      shine(ctx, cx - r * 0.35, hy - r * 0.75, r * 0.2, r * 0.07, 0.35);
    };

    if (layer === 'back') {
      switch (style) {
        case 'long':
          rrect(ctx, cx - r * 1.1, hy - r * 0.6, r * 2.2, r * 2.0, r * 0.5); fo(ctx, c, s);
          break;
        case 'ponytail': {
          const sw = Math.sin(now / 200) * r * 0.1;
          oval(ctx, cx - side * r * 0.9 + (side ? 0 : r * 0.95), hy + r * 0.25 + sw, r * 0.3, r * 0.6, 0.3); fo(ctx, c, s);
          break;
        }
        case 'pigtails':
          for (const sgn of [-1, 1]) { circle(ctx, cx + sgn * r * 1.15, hy + r * 0.15, r * 0.33); fo(ctx, c, s); }
          break;
        case 'afro':
          for (let i = 0; i < 9; i++) {
            const a = Math.PI + (i / 8) * Math.PI;
            circle(ctx, cx + Math.cos(a) * r * 1.0, hy - r * 0.15 + Math.sin(a) * r * 0.95, r * 0.45); fo(ctx, c, s);
          }
          circle(ctx, cx, hy - r * 0.3, r * 1.15); ctx.fillStyle = c; ctx.fill();
          break;
      }
      return;
    }

    switch (style) {
      case 'short': cap(); break;
      case 'spiky':
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.05, hy - r * 0.05);
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          const out = i % 2 === 0 ? 1.05 : 1.55;
          ctx.lineTo(cx + Math.cos(a) * r * out, hy - r * 0.1 + Math.sin(a) * r * out);
        }
        ctx.lineTo(cx + r * 1.05, hy - r * 0.05);
        ctx.quadraticCurveTo(cx, hy - r * 0.35, cx - r * 1.05, hy - r * 0.05);
        fo(ctx, c, s);
        break;
      case 'mohawk':
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.2, hy - r * 0.9);
        for (let i = 0; i < 5; i++) { ctx.lineTo(cx - r * 0.25 + i * r * 0.12, hy - r * 1.6 + (i % 2) * r * 0.3); }
        ctx.lineTo(cx + r * 0.25, hy - r * 0.9);
        ctx.closePath();
        fo(ctx, c, s);
        break;
      case 'afro': break;
      case 'bun':
        cap();
        circle(ctx, cx, hy - r * 1.15, r * 0.35); fo(ctx, c, s);
        break;
      case 'long':
      case 'ponytail':
      case 'pigtails':
        cap();
        break;
      case 'quiff':
        cap();
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.7, hy - r * 0.6);
        ctx.bezierCurveTo(cx - r * 0.6, hy - r * 1.7, cx + r * 1.0, hy - r * 1.6, cx + r * 0.9, hy - r * 1.0);
        ctx.quadraticCurveTo(cx + r * 0.3, hy - r * 1.05, cx + r * 0.2, hy - r * 0.6);
        ctx.closePath();
        fo(ctx, c, s);
        break;
      case 'emo':
        cap();
        if (!backView) {
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.9, hy - r * 0.5);
          ctx.quadraticCurveTo(cx + r * 0.3, hy - r * 0.9, cx + r * 0.95, hy - r * 0.3);
          ctx.lineTo(cx + r * 0.6, hy + r * 0.25);
          ctx.quadraticCurveTo(cx + r * 0.2, hy - r * 0.2, cx - r * 0.6, hy - r * 0.2);
          ctx.closePath();
          fo(ctx, c, s);
        }
        break;
      case 'flame': {
        const cols = ['#e63946', '#ff7f11', '#ffbe0b', '#fff3b0'];
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          const sc = 1 - k * 0.22;
          ctx.moveTo(cx - r * 1.0 * sc, hy - r * 0.2);
          for (let i = 0; i <= 5; i++) {
            const x = cx - r * sc + (i / 5) * r * 2 * sc;
            const h = (i % 2 === 0 ? 1.0 : 1.7) * sc + Math.sin(now / 90 + i * 1.7 + k) * 0.15;
            ctx.lineTo(x, hy - r * 0.2 - r * h);
          }
          ctx.lineTo(cx + r * 1.0 * sc, hy - r * 0.2);
          ctx.closePath();
          if (k === 0) fo(ctx, cols[0], s); else { ctx.fillStyle = cols[k]; ctx.fill(); }
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ hats

  function drawHat(ctx, cx, hy, r, style, c, now, s, backView, side) {
    if (!style || style === 'none') return;
    c = c || '#e63946';
    switch (style) {
      case 'cap':
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.15, r * 1.02, Math.PI, 0); ctx.closePath(); fo(ctx, c, s);
        if (!backView) { oval(ctx, cx + side * r * 0.5, hy - r * 0.17, r * 0.95, r * 0.2); fo(ctx, shade(c, -35), s); }
        circle(ctx, cx, hy - r * 1.15, r * 0.1); fo(ctx, shade(c, -35), s, 0.03);
        shine(ctx, cx - r * 0.45, hy - r * 0.7, r * 0.2, r * 0.1);
        break;
      case 'beanie':
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.15, r * 1.04, Math.PI, 0); ctx.closePath(); fo(ctx, c, s);
        rrect(ctx, cx - r * 1.08, hy - r * 0.32, r * 2.16, r * 0.3, r * 0.1); fo(ctx, shade(c, -30), s);
        circle(ctx, cx, hy - r * 1.25, r * 0.22); fo(ctx, '#fff', s);
        break;
      case 'party':
        ctx.beginPath(); ctx.moveTo(cx - r * 0.55, hy - r * 0.75); ctx.lineTo(cx + r * 0.55, hy - r * 0.75); ctx.lineTo(cx + r * 0.1, hy - r * 2.1); ctx.closePath();
        fo(ctx, c, s);
        ctx.save(); ctx.clip();
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.16;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - r, hy - r * (0.9 + i * 0.35)); ctx.lineTo(cx + r, hy - r * (1.2 + i * 0.35)); ctx.stroke(); }
        ctx.restore();
        circle(ctx, cx + r * 0.1, hy - r * 2.12, r * 0.18); fo(ctx, '#fff', s);
        break;
      case 'helmet':
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.05, r * 1.12, Math.PI, 0); ctx.closePath(); fo(ctx, c, s);
        rrect(ctx, cx - r * 1.16, hy - r * 0.15, r * 2.32, r * 0.22, r * 0.08); fo(ctx, shade(c, -35), s);
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.1, hy - r * 1.15, r * 0.2, r * 1.0);
        shine(ctx, cx - r * 0.5, hy - r * 0.7, r * 0.22, r * 0.1);
        break;
      case 'chef':
        rrect(ctx, cx - r * 0.75, hy - r * 1.0, r * 1.5, r * 0.45, r * 0.1); fo(ctx, '#fff', s);
        for (const [dx, dy, rr] of [[-0.45, -1.3, 0.4], [0.45, -1.3, 0.4], [0, -1.55, 0.45]]) { circle(ctx, cx + dx * r, hy + dy * r, rr * r); fo(ctx, '#fff', s); }
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.6, hy - r * 1.35, r * 1.2, r * 0.4);
        break;
      case 'propeller': {
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.15, r * 1.02, Math.PI, 0); ctx.closePath(); fo(ctx, c, s);
        ctx.save(); ctx.beginPath(); ctx.arc(cx, hy - r * 0.15, r * 1.0, Math.PI, 0); ctx.clip();
        ctx.fillStyle = '#ffd60a'; ctx.fillRect(cx - r * 0.33, hy - r * 1.3, r * 0.33, r * 1.2);
        ctx.fillStyle = '#3a86ff'; ctx.fillRect(cx + r * 0.33, hy - r * 1.3, r * 0.4, r * 1.2);
        ctx.restore();
        ctx.fillStyle = OUT; ctx.fillRect(cx - r * 0.04, hy - r * 1.45, r * 0.08, r * 0.35);
        const spin = Math.cos(now / 45);
        oval(ctx, cx, hy - r * 1.45, r * 0.9 * Math.abs(spin) + r * 0.05, r * 0.1); fo(ctx, '#e63946', s, 0.03);
        break;
      }
      case 'cowboy':
        oval(ctx, cx, hy - r * 0.6, r * 1.65, r * 0.32); fo(ctx, c, s);
        ctx.beginPath(); ctx.moveTo(cx - r * 0.65, hy - r * 0.6); ctx.lineTo(cx - r * 0.55, hy - r * 1.45);
        ctx.quadraticCurveTo(cx, hy - r * 1.2, cx + r * 0.55, hy - r * 1.45); ctx.lineTo(cx + r * 0.65, hy - r * 0.6); ctx.closePath();
        fo(ctx, c, s);
        ctx.fillStyle = shade(c, -45); ctx.fillRect(cx - r * 0.62, hy - r * 0.85, r * 1.24, r * 0.15);
        break;
      case 'bunny': {
        const wob = Math.sin(now / 250) * 0.15;
        for (const sgn of [-1, 1]) {
          oval(ctx, cx + sgn * r * 0.4, hy - r * 1.35, r * 0.22, r * 0.65, sgn * 0.2 + wob); fo(ctx, '#fff', s);
          ctx.fillStyle = '#ffafcc'; oval(ctx, cx + sgn * r * 0.4, hy - r * 1.3, r * 0.1, r * 0.45, sgn * 0.2 + wob); ctx.fill();
        }
        rrect(ctx, cx - r * 0.95, hy - r * 0.75, r * 1.9, r * 0.2, r * 0.1); fo(ctx, c, s);
        break;
      }
      case 'cat':
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(cx + sgn * r * 0.2, hy - r * 0.9); ctx.lineTo(cx + sgn * r * 0.75, hy - r * 1.45); ctx.lineTo(cx + sgn * r * 0.9, hy - r * 0.55); ctx.closePath();
          fo(ctx, c, s);
          ctx.fillStyle = '#ffafcc'; ctx.beginPath(); ctx.moveTo(cx + sgn * r * 0.4, hy - r * 0.88); ctx.lineTo(cx + sgn * r * 0.72, hy - r * 1.2); ctx.lineTo(cx + sgn * r * 0.78, hy - r * 0.75); ctx.closePath(); ctx.fill();
        }
        break;
      case 'pirate':
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.35, hy - r * 0.55);
        ctx.quadraticCurveTo(cx - r * 0.9, hy - r * 1.75, cx, hy - r * 1.45);
        ctx.quadraticCurveTo(cx + r * 0.9, hy - r * 1.75, cx + r * 1.35, hy - r * 0.55);
        ctx.quadraticCurveTo(cx, hy - r * 0.9, cx - r * 1.35, hy - r * 0.55);
        fo(ctx, '#1b1b2f', s);
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.moveTo(cx - r * 1.2, hy - r * 0.62); ctx.quadraticCurveTo(cx, hy - r * 0.95, cx + r * 1.2, hy - r * 0.62); ctx.stroke();
        if (!backView) {
          circle(ctx, cx, hy - r * 1.2, r * 0.17); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.fillStyle = OUT; circle(ctx, cx - r * 0.06, hy - r * 1.22, r * 0.04); ctx.fill(); circle(ctx, cx + r * 0.06, hy - r * 1.22, r * 0.04); ctx.fill();
        }
        break;
      case 'sombrero':
        oval(ctx, cx, hy - r * 0.65, r * 2.0, r * 0.45); fo(ctx, c, s);
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.08;
        oval(ctx, cx, hy - r * 0.65, r * 1.8, r * 0.38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, hy - r * 0.7); ctx.quadraticCurveTo(cx, hy - r * 2.1, cx + r * 0.6, hy - r * 0.7); ctx.closePath();
        fo(ctx, c, s);
        ctx.fillStyle = '#e63946'; ctx.fillRect(cx - r * 0.5, hy - r * 1.0, r * 1.0, r * 0.14);
        break;
      case 'viking':
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(cx + sgn * r * 0.75, hy - r * 0.55);
          ctx.quadraticCurveTo(cx + sgn * r * 1.6, hy - r * 0.8, cx + sgn * r * 1.45, hy - r * 1.75);
          ctx.quadraticCurveTo(cx + sgn * r * 1.2, hy - r * 1.0, cx + sgn * r * 0.55, hy - r * 0.95); ctx.closePath();
          fo(ctx, '#f8f9fa', s);
        }
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.15, r * 1.05, Math.PI, 0); ctx.closePath(); fo(ctx, '#adb5bd', s);
        rrect(ctx, cx - r * 1.08, hy - r * 0.32, r * 2.16, r * 0.22, r * 0.05); fo(ctx, c, s);
        break;
      case 'mushroom':
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.35, r * 1.35, Math.PI, 0); ctx.quadraticCurveTo(cx, hy - r * 0.1, cx - r * 1.35, hy - r * 0.35); fo(ctx, c, s);
        ctx.fillStyle = '#fff';
        for (const [dx, dy, rr] of [[-0.6, -1.0, 0.25], [0.35, -1.3, 0.3], [0.85, -0.65, 0.18], [-0.1, -0.7, 0.15]]) { circle(ctx, cx + dx * r, hy + dy * r, rr * r); ctx.fill(); }
        break;
      case 'pumpkin':
        for (const dx of [-0.6, 0.6, 0]) { oval(ctx, cx + dx * r, hy - r * 0.55, r * 0.6, r * 0.65); fo(ctx, '#ff7f11', s); }
        rrect(ctx, cx - r * 0.1, hy - r * 1.45, r * 0.2, r * 0.35, 3); fo(ctx, '#3a7d44', s, 0.03);
        break;
      case 'tophat':
        rrect(ctx, cx - r * 0.65, hy - r * 1.85, r * 1.3, r * 1.2, r * 0.08); fo(ctx, c, s);
        ctx.fillStyle = '#e63946'; ctx.fillRect(cx - r * 0.65, hy - r * 0.95, r * 1.3, r * 0.2);
        oval(ctx, cx, hy - r * 0.68, r * 1.15, r * 0.18); fo(ctx, shade(c, -40), s);
        shine(ctx, cx - r * 0.35, hy - r * 1.5, r * 0.1, r * 0.25, 0.3);
        break;
      case 'wizard': {
        const tip = Math.sin(now / 300) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.95, hy - r * 0.55); ctx.lineTo(cx + r * 0.95, hy - r * 0.55);
        ctx.quadraticCurveTo(cx + r * 0.4, hy - r * 1.6, cx + r * 0.9 + tip, hy - r * 2.3);
        ctx.quadraticCurveTo(cx - r * 0.2, hy - r * 1.5, cx - r * 0.95, hy - r * 0.55);
        fo(ctx, c, s);
        oval(ctx, cx, hy - r * 0.6, r * 1.3, r * 0.22); fo(ctx, shade(c, -35), s);
        ctx.fillStyle = '#ffd60a'; star(ctx, cx + r * 0.05, hy - r * 1.15, r * 0.22, r * 0.09); ctx.fill();
        star(ctx, cx + r * 0.5, hy - r * 1.7, r * 0.12, r * 0.05); ctx.fill();
        break;
      }
      case 'astronaut': {
        circle(ctx, cx, hy, r * 1.32);
        ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.fill();
        ctx.strokeStyle = OUT; lw(ctx, s); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = r * 0.1;
        ctx.beginPath(); ctx.arc(cx, hy, r * 1.1, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
        rrect(ctx, cx - r * 0.9, hy + r * 0.95, r * 1.8, r * 0.3, r * 0.12); fo(ctx, '#ced4da', s);
        ctx.fillStyle = OUT; ctx.fillRect(cx + r * 0.7, hy - r * 1.6, r * 0.06, r * 0.4);
        circle(ctx, cx + r * 0.73, hy - r * 1.65, r * 0.1); fo(ctx, Math.floor(now / 400) % 2 ? '#e63946' : '#ffd60a', s, 0.03);
        break;
      }
      case 'dino':
        ctx.beginPath(); ctx.arc(cx, hy - r * 0.05, r * 1.15, Math.PI * 0.98, Math.PI * 2.02); ctx.closePath(); fo(ctx, c, s);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.15 + i * 0.175);
          const bx = cx + Math.cos(a) * r * 1.15, byy = hy - r * 0.05 + Math.sin(a) * r * 1.15;
          ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * r * 0.18, byy + Math.cos(a) * r * 0.18);
          ctx.lineTo(cx + Math.cos(a) * r * 1.5, hy - r * 0.05 + Math.sin(a) * r * 1.5);
          ctx.lineTo(bx + Math.sin(a) * r * 0.18, byy - Math.cos(a) * r * 0.18); ctx.closePath();
          fo(ctx, '#ffd60a', s, 0.03);
        }
        if (!backView) {
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 6; i++) { ctx.beginPath(); const x = cx - r * 0.85 + i * r * 0.34; ctx.moveTo(x, hy - r * 0.08); ctx.lineTo(x + r * 0.17, hy - r * 0.08); ctx.lineTo(x + r * 0.085, hy + r * 0.12); ctx.fill(); }
        }
        break;
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.75, hy - r * 0.65); ctx.lineTo(cx - r * 0.85, hy - r * 1.45); ctx.lineTo(cx - r * 0.4, hy - r * 1.0);
        ctx.lineTo(cx, hy - r * 1.6); ctx.lineTo(cx + r * 0.4, hy - r * 1.0); ctx.lineTo(cx + r * 0.85, hy - r * 1.45); ctx.lineTo(cx + r * 0.75, hy - r * 0.65); ctx.closePath();
        fo(ctx, '#ffd60a', s);
        circle(ctx, cx, hy - r * 0.9, r * 0.14); fo(ctx, '#e63946', s, 0.03);
        circle(ctx, cx - r * 0.45, hy - r * 0.82, r * 0.09); fo(ctx, '#3a86ff', s, 0.03);
        circle(ctx, cx + r * 0.45, hy - r * 0.82, r * 0.09); fo(ctx, '#80ed99', s, 0.03);
        if (Math.sin(now / 250) > 0.7) { ctx.fillStyle = '#fff'; star(ctx, cx + r * 0.85, hy - r * 1.5, r * 0.15, r * 0.04, 4); ctx.fill(); }
        break;
      case 'halo': {
        const fl = Math.sin(now / 300) * r * 0.1;
        ctx.save();
        ctx.shadowColor = '#fff3b0'; ctx.shadowBlur = r * 0.8;
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.16;
        oval(ctx, cx, hy - r * 1.45 + fl, r * 0.7, r * 0.2); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'bombhat':
        drawBomb(ctx, cx, hy - r * 1.3, r * 0.6, 'classic', 2, now, c, { s, noEyes: false });
        break;
    }
  }

  // ------------------------------------------------------------------ back items

  function drawBack(ctx, cx, tTop, s, style, now, look, front, moving) {
    if (!style || style === 'none') return;
    const midY = tTop + s * 0.12;
    switch (style) {
      case 'backpack':
        rrect(ctx, cx - s * 0.2, tTop - s * 0.02, s * 0.4, s * 0.3, s * 0.07); fo(ctx, look.secondary, s);
        if (front) { rrect(ctx, cx - s * 0.13, tTop + s * 0.12, s * 0.26, s * 0.12, s * 0.04); fo(ctx, shade(look.secondary, -25), s, 0.03); }
        break;
      case 'balloon': {
        const bx = cx + s * 0.32, byy = tTop - s * 0.75 + Math.sin(now / 500) * s * 0.05;
        ctx.strokeStyle = OUT; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx + s * 0.2, tTop + s * 0.15); ctx.quadraticCurveTo(bx - s * 0.1, tTop - s * 0.2, bx, byy + s * 0.2); ctx.stroke();
        oval(ctx, bx, byy, s * 0.15, s * 0.19); fo(ctx, look.hatColor || '#e63946', s);
        shine(ctx, bx - s * 0.05, byy - s * 0.07, s * 0.04, s * 0.06, 0.6);
        break;
      }
      case 'turtle':
        oval(ctx, cx, midY, s * 0.26, s * 0.22); fo(ctx, '#3a7d44', s);
        ctx.strokeStyle = '#8ac926'; ctx.lineWidth = s * 0.02;
        for (const [dx, dy] of [[0, -0.07], [-0.1, 0.04], [0.1, 0.04]]) { star(ctx, cx + dx * s, midY + dy * s, s * 0.06, s * 0.055, 6); ctx.stroke(); }
        break;
      case 'guitar':
        ctx.save(); ctx.translate(cx, midY); ctx.rotate(-0.7);
        rrect(ctx, -s * 0.03, -s * 0.45, s * 0.06, s * 0.4, 2); fo(ctx, '#6f4518', s, 0.03);
        oval(ctx, 0, s * 0.05, s * 0.15, s * 0.13); fo(ctx, '#e63946', s);
        oval(ctx, 0, -s * 0.07, s * 0.11, s * 0.09); fo(ctx, '#e63946', s);
        circle(ctx, 0, 0, s * 0.035); ctx.fillStyle = OUT; ctx.fill();
        ctx.restore();
        break;
      case 'sword':
        ctx.save(); ctx.translate(cx, midY); ctx.rotate(0.6);
        rrect(ctx, -s * 0.03, -s * 0.55, s * 0.06, s * 0.5, 2); fo(ctx, '#e9ecef', s, 0.03);
        rrect(ctx, -s * 0.1, -s * 0.06, s * 0.2, s * 0.04, 2); fo(ctx, '#ffd60a', s, 0.03);
        rrect(ctx, -s * 0.025, -s * 0.03, s * 0.05, s * 0.14, 2); fo(ctx, '#6f4518', s, 0.03);
        ctx.restore();
        break;
      case 'butterfly':
      case 'bat':
      case 'angel': {
        const flap = 0.75 + 0.25 * Math.sin(now / (moving ? 70 : 180));
        for (const sgn of [-1, 1]) {
          ctx.save(); ctx.translate(cx + sgn * s * 0.1, midY); ctx.scale(sgn * flap, 1);
          if (style === 'butterfly') {
            oval(ctx, s * 0.2, -s * 0.12, s * 0.2, s * 0.16, -0.5); fo(ctx, '#ff70a6', s);
            oval(ctx, s * 0.16, s * 0.1, s * 0.13, s * 0.1, 0.4); fo(ctx, '#ffd60a', s);
            ctx.fillStyle = '#fff'; circle(ctx, s * 0.24, -s * 0.14, s * 0.04); ctx.fill();
          } else if (style === 'bat') {
            ctx.beginPath(); ctx.moveTo(0, -s * 0.05); ctx.lineTo(s * 0.38, -s * 0.22);
            ctx.quadraticCurveTo(s * 0.32, -s * 0.05, s * 0.36, s * 0.05);
            ctx.quadraticCurveTo(s * 0.26, -s * 0.02, s * 0.22, s * 0.1);
            ctx.quadraticCurveTo(s * 0.14, s * 0.0, s * 0.06, s * 0.1); ctx.closePath();
            fo(ctx, '#3c096c', s);
          } else {
            ctx.beginPath(); ctx.moveTo(0, -s * 0.05);
            ctx.quadraticCurveTo(s * 0.25, -s * 0.35, s * 0.45, -s * 0.2);
            for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(s * (0.42 - i * 0.1), s * (-0.05 + i * 0.05), s * (0.34 - i * 0.1), s * (-0.1 + i * 0.07));
            ctx.closePath();
            fo(ctx, '#ffffff', s);
          }
          ctx.restore();
        }
        break;
      }
      case 'tail': {
        const sw = Math.sin(now / 220) * s * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.06, tTop + s * 0.2);
        ctx.quadraticCurveTo(cx + s * 0.3, tTop + s * 0.35, cx + s * 0.42 + sw, tTop + s * 0.1);
        ctx.lineTo(cx + s * 0.5 + sw, tTop + s * 0.02);
        ctx.lineTo(cx + s * 0.36 + sw, tTop + s * 0.07);
        ctx.quadraticCurveTo(cx + s * 0.25, tTop + s * 0.25, cx + s * 0.04, tTop + s * 0.12);
        ctx.closePath();
        fo(ctx, '#2ec4b6', s);
        break;
      }
      case 'jetpack':
        for (const sgn of [-1, 1]) {
          rrect(ctx, cx + sgn * s * 0.12 - s * 0.08, tTop - s * 0.04, s * 0.16, s * 0.3, s * 0.06); fo(ctx, '#adb5bd', s);
          if (moving || Math.sin(now / 60) > 0.3) {
            ctx.fillStyle = Math.floor(now / 50) % 2 ? '#ffbe0b' : '#ff7f11';
            ctx.beginPath(); ctx.moveTo(cx + sgn * s * 0.12 - s * 0.05, tTop + s * 0.26); ctx.lineTo(cx + sgn * s * 0.12 + s * 0.05, tTop + s * 0.26);
            ctx.lineTo(cx + sgn * s * 0.12, tTop + s * (0.42 + Math.random() * 0.08)); ctx.fill();
          }
        }
        break;
      case 'bombpack':
        rrect(ctx, cx - s * 0.24, tTop + s * 0.0, s * 0.48, s * 0.26, s * 0.05); fo(ctx, '#6f4518', s);
        for (const dx of [-0.15, 0, 0.15]) drawBomb(ctx, cx + dx * s, tTop - s * 0.02, s * 0.1, 'classic', 9, now, look.primary, { s: s * 0.6, noEyes: true });
        break;
    }
  }

  // ------------------------------------------------------------------ bombs

  /** Bomb skins. r = radius, fuse = seconds left (eyes widen and it swells near the end). */
  function drawBomb(ctx, cx, cy, r, skin, fuse, now, ringColor, o = {}) {
    const s = o.s || r * 3;
    ctx.save();
    ctx.lineJoin = 'round';
    const urgent = fuse < 0.8;
    const swell = urgent ? 1 + (0.8 - fuse) * 0.3 + Math.sin(now / 30) * 0.04 : 1 + Math.sin(now / 160) * 0.04;
    r *= swell;

    // fuse cord + spark (behind the body for most skins)
    const fx = cx + r * 0.55, fy = cy - r * 1.25;
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath(); ctx.moveTo(cx + r * 0.25, cy - r * 0.8); ctx.quadraticCurveTo(cx + r * 0.75, cy - r * 1.0, fx, fy); ctx.stroke();

    let body = '#2b2d42';
    switch (skin) {
      case 'watermelon': body = '#2d6a4f'; break;
      case 'soccer': body = '#ffffff'; break;
      case 'pumpkin': body = '#ff7f11'; break;
      case 'snowball': body = '#f1faee'; break;
      case 'donut': body = '#ffafcc'; break;
      case 'skull': body = '#e9ecef'; break;
      case 'disco': body = '#adb5bd'; break;
      case 'planet': body = '#7b2cbf'; break;
      case 'gem': body = '#4cc9f0'; break;
    }

    if (skin === 'planet') {
      ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.3;
      oval(ctx, cx, cy, r * 1.55, r * 0.4, -0.35); ctx.stroke();
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.16; ctx.stroke();
    }

    if (skin === 'gem') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.closePath();
    } else if (skin === 'pumpkin') {
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.08, r * 0.95, 0, 0, TAU);
    } else {
      circle(ctx, cx, cy, r);
    }
    fo(ctx, body, s, 0.05);

    ctx.save();
    ctx.clip();
    switch (skin) {
      case 'watermelon':
        ctx.strokeStyle = '#95d5b2'; ctx.lineWidth = r * 0.18;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(cx + i * r * 0.45, cy, r * 0.12, r * 1.1, 0, 0, TAU); ctx.stroke(); }
        break;
      case 'soccer':
        ctx.fillStyle = OUT;
        star(ctx, cx, cy, r * 0.35, r * 0.3, 5); ctx.fill();
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; star(ctx, cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, r * 0.3, r * 0.25, 5); ctx.fill(); }
        break;
      case 'pumpkin':
        ctx.strokeStyle = '#e85d04'; ctx.lineWidth = r * 0.1;
        for (const dx of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.ellipse(cx + dx * r, cy, r * 0.35, r * 0.95, 0, 0, TAU); ctx.stroke(); }
        break;
      case 'snowball':
        ctx.fillStyle = '#caf0f8';
        for (let i = 0; i < 5; i++) { circle(ctx, cx + (hash(i, 3) - 0.5) * r * 1.4, cy + (hash(i, 5) - 0.5) * r * 1.4, r * 0.12); ctx.fill(); }
        break;
      case 'donut':
        ctx.fillStyle = '#e09f3e'; ctx.fillRect(cx - r, cy + r * 0.25, r * 2, r);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate(cx + (hash(i, 8) - 0.5) * r * 1.5, cy + (hash(i, 9) - 0.6) * r * 1.2); ctx.rotate(hash(i, 2) * 3); ctx.fillStyle = ['#3a86ff', '#ffd60a', '#80ed99', '#fff'][i % 4]; ctx.fillRect(-r * 0.08, -r * 0.03, r * 0.16, r * 0.06); ctx.restore(); }
        break;
      case 'disco':
        for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
          const tw = Math.sin(now / 120 + x * 1.3 + y * 2.1);
          ctx.fillStyle = tw > 0.6 ? '#fff' : tw > 0 ? '#ced4da' : '#868e96';
          ctx.fillRect(cx + x * r * 0.3 - r * 0.13, cy + y * r * 0.3 - r * 0.13, r * 0.26, r * 0.26);
        }
        break;
      case 'planet':
        ctx.fillStyle = '#c77dff'; ctx.fillRect(cx - r, cy - r * 0.3, r * 2, r * 0.25);
        ctx.fillStyle = '#5a189a'; circle(ctx, cx - r * 0.4, cy + r * 0.4, r * 0.2); ctx.fill();
        break;
      case 'gem':
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.2); ctx.lineTo(cx + r, cy - r * 0.2);
        ctx.moveTo(cx - r * 0.5, cy - r * 0.2); ctx.lineTo(cx, cy + r); ctx.lineTo(cx + r * 0.5, cy - r * 0.2); ctx.stroke();
        break;
    }
    ctx.restore();

    if (skin === 'planet') {
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - r * 2, cy, r * 4, r * 2); ctx.clip();
      ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.3;
      oval(ctx, cx, cy, r * 1.55, r * 0.4, -0.35); ctx.stroke();
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.16; ctx.stroke();
      ctx.restore();
    }

    if (skin === 'donut') { circle(ctx, cx, cy + r * 0.05, r * 0.22); fo(ctx, '#1b1b2f', s, 0.03); }

    // team ring
    if (ringColor && !o.noRing) {
      ctx.strokeStyle = ringColor; ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    }

    shine(ctx, cx - r * 0.4, cy - r * 0.45, r * 0.25, r * 0.14, 0.6);

    // face
    if (!o.noEyes && skin !== 'disco') {
      const dark = ['soccer', 'snowball', 'skull', 'donut', 'gem'].includes(skin) ? OUT : '#fff';
      if (skin === 'skull') {
        ctx.fillStyle = OUT;
        oval(ctx, cx - r * 0.33, cy - r * 0.05, r * 0.22, r * 0.25); ctx.fill();
        oval(ctx, cx + r * 0.33, cy - r * 0.05, r * 0.22, r * 0.25); ctx.fill();
        ctx.fillRect(cx - r * 0.3, cy + r * 0.45, r * 0.6, r * 0.08);
        for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * r * 0.18 - r * 0.02, cy + r * 0.35, r * 0.04, r * 0.25);
      } else {
        const eyeR = urgent ? r * 0.24 : r * 0.17;
        for (const sgn of [-1, 1]) {
          oval(ctx, cx + sgn * r * 0.3, cy, eyeR * 0.85, eyeR); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
          ctx.fillStyle = OUT; circle(ctx, cx + sgn * r * 0.3, cy + r * 0.04, eyeR * (urgent ? 0.3 : 0.5)); ctx.fill();
        }
        ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.2, r * 0.08);
        if (urgent) { oval(ctx, cx, cy + r * 0.45, r * 0.13, r * 0.16); ctx.stroke(); }
        else {
          ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.32); ctx.lineTo(cx - r * 0.15, cy - r * 0.2);
          ctx.moveTo(cx + r * 0.5, cy - r * 0.32); ctx.lineTo(cx + r * 0.15, cy - r * 0.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy + r * 0.5, r * 0.15, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
        }
      }
    }

    // remote antenna
    if (o.remote) {
      ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.8); ctx.lineTo(cx - r * 0.65, cy - r * 1.45); ctx.stroke();
      circle(ctx, cx - r * 0.65, cy - r * 1.5, r * 0.14);
      fo(ctx, Math.floor(now / 250) % 2 ? '#ff4d6d' : '#7a0010', s, 0.03);
    }

    // spark
    const sp = 0.8 + Math.random() * 0.5;
    ctx.fillStyle = '#ffbe0b';
    star(ctx, fx, fy, r * 0.32 * sp, r * 0.12, 6, now / 60); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    circle(ctx, fx, fy, r * 0.1); ctx.fill();

    if (urgent && Math.floor(now / 70) % 2 === 0) {
      ctx.globalAlpha = 0.35; circle(ctx, cx, cy, r); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ power-ups

  const POWER = {
    0: { c: '#ffbe0b', name: 'bomb' }, 1: { c: '#ff4d6d', name: 'fire' }, 2: { c: '#2ec4b6', name: 'kick' },
    3: { c: '#4cc9f0', name: 'speed' }, 4: { c: '#80ffdb', name: 'shield' }, 5: { c: '#ff70a6', name: 'life' },
    6: { c: '#ff7f11', name: 'pierce' }, 7: { c: '#cdb4db', name: 'ghost' }, 8: { c: '#5a189a', name: 'curse' },
    9: { c: '#8ac926', name: 'glove' }, 10: { c: '#e63946', name: 'remote' }
  };

  function drawPowerUp(ctx, cx, cy, size, type, now) {
    const p = POWER[type] || POWER[0];
    const s = size;
    const half = s / 2;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    rrect(ctx, cx - half, cy - half, s, s, s * 0.28);
    const g = ctx.createLinearGradient(0, cy - half, 0, cy + half);
    g.addColorStop(0, shade(p.c, 40)); g.addColorStop(1, shade(p.c, -30));
    fo(ctx, g, s * 1.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = s * 0.05;
    rrect(ctx, cx - half + s * 0.08, cy - half + s * 0.08, s - s * 0.16, s - s * 0.16, s * 0.2); ctx.stroke();
    const r = s * 0.28;
    switch (p.name) {
      case 'bomb': drawBomb(ctx, cx - s * 0.03, cy + s * 0.06, r * 0.95, 'classic', 9, now, null, { s, noEyes: true }); break;
      case 'fire':
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.3);
        ctx.bezierCurveTo(cx + r * 1.2, cy - r * 0.2, cx + r * 0.9, cy + r * 1.1, cx, cy + r * 1.1);
        ctx.bezierCurveTo(cx - r * 0.9, cy + r * 1.1, cx - r * 1.2, cy - r * 0.2, cx, cy - r * 1.3);
        fo(ctx, '#ff7f11', s * 1.2);
        ctx.fillStyle = '#ffd60a'; oval(ctx, cx, cy + r * 0.45, r * 0.45, r * 0.6); ctx.fill();
        break;
      case 'kick':
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r); ctx.lineTo(cx + r * 0.1, cy - r); ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
        ctx.lineTo(cx + r * 1.0, cy + r * 0.3); ctx.quadraticCurveTo(cx + r * 1.2, cy + r * 0.9, cx + r * 0.8, cy + r * 0.9); ctx.lineTo(cx - r * 0.6, cy + r * 0.9); ctx.closePath();
        fo(ctx, '#8b5a2b', s * 1.2);
        break;
      case 'speed':
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 1.2); ctx.lineTo(cx - r * 0.7, cy + r * 0.15); ctx.lineTo(cx - r * 0.05, cy + r * 0.15);
        ctx.lineTo(cx - r * 0.35, cy + r * 1.2); ctx.lineTo(cx + r * 0.75, cy - r * 0.2); ctx.lineTo(cx + r * 0.1, cy - r * 0.2); ctx.closePath();
        fo(ctx, '#ffd60a', s * 1.2);
        break;
      case 'shield':
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.1); ctx.lineTo(cx + r * 0.95, cy - r * 0.7); ctx.quadraticCurveTo(cx + r * 0.9, cy + r * 0.6, cx, cy + r * 1.15);
        ctx.quadraticCurveTo(cx - r * 0.9, cy + r * 0.6, cx - r * 0.95, cy - r * 0.7); ctx.closePath();
        fo(ctx, '#3a86ff', s * 1.2);
        ctx.fillStyle = '#fff'; star(ctx, cx, cy, r * 0.45, r * 0.2); ctx.fill();
        break;
      case 'life': heart(ctx, cx, cy + r * 0.15, r * 1.4); fo(ctx, '#e63946', s * 1.2); shine(ctx, cx - r * 0.4, cy - r * 0.3, r * 0.2, r * 0.12, 0.7); break;
      case 'pierce':
        drawBomb(ctx, cx, cy + s * 0.04, r * 0.85, 'classic', 9, now, null, { s, noEyes: true });
        ctx.fillStyle = '#fff';
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85); ctx.lineTo(cx + Math.cos(a + 0.3) * r * 1.4, cy + Math.sin(a + 0.3) * r * 1.4); ctx.lineTo(cx + Math.cos(a - 0.3) * r * 1.4, cy + Math.sin(a - 0.3) * r * 1.4); ctx.closePath(); fo(ctx, '#fff', s); }
        break;
      case 'ghost':
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.85, Math.PI, 0);
        for (let i = 0; i <= 4; i++) ctx.lineTo(cx + r * 0.85 - i * r * 0.425, cy + r * 0.9 - (i % 2) * r * 0.25);
        ctx.closePath(); fo(ctx, '#fff', s * 1.2);
        ctx.fillStyle = OUT; oval(ctx, cx - r * 0.3, cy - r * 0.2, r * 0.12, r * 0.18); ctx.fill(); oval(ctx, cx + r * 0.3, cy - r * 0.2, r * 0.12, r * 0.18); ctx.fill();
        break;
      case 'curse':
        circle(ctx, cx, cy - r * 0.15, r * 0.9); fo(ctx, '#f8f9fa', s * 1.2);
        rrect(ctx, cx - r * 0.5, cy + r * 0.45, r, r * 0.5, r * 0.1); fo(ctx, '#f8f9fa', s * 1.2);
        ctx.fillStyle = OUT; circle(ctx, cx - r * 0.35, cy - r * 0.15, r * 0.25); ctx.fill(); circle(ctx, cx + r * 0.35, cy - r * 0.15, r * 0.25); ctx.fill();
        break;
      case 'glove':
        circle(ctx, cx, cy, r * 0.8); fo(ctx, '#fff', s * 1.2);
        for (let i = 0; i < 3; i++) { oval(ctx, cx - r * 0.45 + i * r * 0.45, cy - r * 0.75, r * 0.2, r * 0.32); fo(ctx, '#fff', s); }
        oval(ctx, cx - r * 0.85, cy + r * 0.05, r * 0.3, r * 0.2, -0.5); fo(ctx, '#fff', s);
        rrect(ctx, cx - r * 0.6, cy + r * 0.6, r * 1.2, r * 0.4, r * 0.1); fo(ctx, '#e63946', s);
        break;
      case 'remote':
        rrect(ctx, cx - r * 0.55, cy - r * 0.6, r * 1.1, r * 1.6, r * 0.2); fo(ctx, '#495057', s * 1.2);
        circle(ctx, cx, cy, r * 0.32); fo(ctx, Math.floor(now / 300) % 2 ? '#ff4d6d' : '#c1121f', s);
        ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy - r * 1.25); ctx.stroke();
        circle(ctx, cx + r * 0.6, cy - r * 1.25, r * 0.12); fo(ctx, '#ffd60a', s);
        break;
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ monsters

  function drawMonster(ctx, cx, cy, s, kind, facing, now, id) {
    const [lx, ly] = facing === 3 ? [-1, 0] : facing === 4 ? [1, 0] : facing === 1 ? [0, -1] : [0, 1];
    ctx.save();
    ctx.lineJoin = 'round';
    const r = s * 0.36;
    const eyes = (ex, ey, er, color = OUT) => {
      for (const sgn of [-1, 1]) {
        oval(ctx, ex + sgn * er * 1.3, ey, er, er * 1.2); fo(ctx, '#fff', s, 0.03);
        ctx.fillStyle = color; circle(ctx, ex + sgn * er * 1.3 + lx * er * 0.4, ey + ly * er * 0.4, er * 0.5); ctx.fill();
      }
    };
    if (kind === 0) {
      // slime: squishy blob
      const sq = Math.sin(now / 130 + id) * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx - r * (1.1 + sq), cy + r * 0.8);
      ctx.bezierCurveTo(cx - r * (1.1 + sq), cy - r * (0.9 - sq), cx + r * (1.1 + sq), cy - r * (0.9 - sq), cx + r * (1.1 + sq), cy + r * 0.8);
      ctx.closePath();
      fo(ctx, '#70e000', s);
      shine(ctx, cx - r * 0.45, cy - r * 0.2, r * 0.25, r * 0.12, 0.5);
      eyes(cx, cy + r * 0.1, r * 0.22);
      ctx.strokeStyle = OUT; lw(ctx, s, 0.03);
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.45, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else if (kind === 1) {
      // bat
      const flap = Math.sin(now / 60 + id);
      for (const sgn of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx + sgn * r * 0.4, cy - r * 0.1);
        ctx.lineTo(cx + sgn * r * 1.4, cy - r * (0.5 + flap * 0.4));
        ctx.lineTo(cx + sgn * r * 1.15, cy + r * 0.15);
        ctx.lineTo(cx + sgn * r * 0.8, cy + r * 0.05);
        ctx.lineTo(cx + sgn * r * 0.55, cy + r * 0.35); ctx.closePath();
        fo(ctx, '#7b2cbf', s);
      }
      circle(ctx, cx, cy, r * 0.65); fo(ctx, '#9d4edd', s);
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * r * 0.2, cy - r * 0.55); ctx.lineTo(cx + sgn * r * 0.45, cy - r * 1.0); ctx.lineTo(cx + sgn * r * 0.55, cy - r * 0.4); ctx.closePath(); fo(ctx, '#9d4edd', s); }
      eyes(cx, cy - r * 0.05, r * 0.17, '#e63946');
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy + r * 0.3); ctx.lineTo(cx - r * 0.1, cy + r * 0.5); ctx.lineTo(cx, cy + r * 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + r * 0.2, cy + r * 0.3); ctx.lineTo(cx + r * 0.1, cy + r * 0.5); ctx.lineTo(cx, cy + r * 0.3); ctx.fill();
    } else {
      // spiky ball
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(now / 300 + id) * 0.2);
      star(ctx, 0, 0, r * 1.05, r * 0.75, 10); fo(ctx, '#ff7f11', s);
      circle(ctx, 0, 0, r * 0.72); ctx.fillStyle = '#ff9e00'; ctx.fill();
      ctx.restore();
      eyes(cx, cy - r * 0.1, r * 0.2);
      ctx.strokeStyle = OUT; lw(ctx, s, 0.035);
      ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy - r * 0.55); ctx.lineTo(cx - r * 0.15, cy - r * 0.4); ctx.moveTo(cx + r * 0.55, cy - r * 0.55); ctx.lineTo(cx + r * 0.15, cy - r * 0.4); ctx.stroke();
      rrect(ctx, cx - r * 0.3, cy + r * 0.3, r * 0.6, r * 0.18, r * 0.05); fo(ctx, '#fff', s, 0.03);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ arena themes

  const THEMES = {
    praia: { floor2: '#F6BD60', border: '#118AB2' },
    brinquedos: { floor2: '#BDE0FE', border: '#8338EC' },
    floresta: { floor2: '#74C69D', border: '#1B4332' },
    geleira: { floor2: '#CAF0F8', border: '#023E8A' },
    vulcao: { floor2: '#4A2C24', border: '#1A0F0D' },
    doces: { floor2: '#FFC8DD', border: '#C9184A' },
    lua: { floor2: '#B8B8C7', border: '#22223B' },
    navio: { floor2: '#B07D48', border: '#3D2817' }
  };

  function drawFloor(ctx, theme, px, py, t, x, y, floor, now) {
    const th = THEMES[theme] || {};
    ctx.fillStyle = (x + y) % 2 === 0 ? floor : (th.floor2 || shade(floor, -14));
    ctx.fillRect(px, py, t, t);
    const h = hash(x, y);
    switch (theme) {
      case 'praia':
        ctx.fillStyle = 'rgba(160,100,40,0.25)';
        for (let i = 0; i < 3; i++) { circle(ctx, px + hash(x, y, i) * t, py + hash(y, x, i) * t, t * 0.03); ctx.fill(); }
        if (h > 0.93) { ctx.fillStyle = '#fff'; star(ctx, px + t * 0.5, py + t * 0.5, t * 0.12, t * 0.05); ctx.fill(); }
        break;
      case 'brinquedos':
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, t * 0.04);
        circle(ctx, px + t / 2, py + t / 2, t * 0.22); ctx.stroke();
        break;
      case 'floresta':
        if (h > 0.6) {
          ctx.strokeStyle = 'rgba(27,67,50,0.45)'; ctx.lineWidth = Math.max(1, t * 0.04);
          const gx = px + t * (0.25 + hash(x, y, 2) * 0.5), gy = py + t * (0.4 + hash(x, y, 3) * 0.4);
          ctx.beginPath(); ctx.moveTo(gx - t * 0.08, gy); ctx.lineTo(gx - t * 0.1, gy - t * 0.12); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - t * 0.15); ctx.moveTo(gx + t * 0.08, gy); ctx.lineTo(gx + t * 0.1, gy - t * 0.12); ctx.stroke();
        }
        if (h > 0.95) { ctx.fillStyle = '#ff70a6'; circle(ctx, px + t * 0.3, py + t * 0.3, t * 0.06); ctx.fill(); ctx.fillStyle = '#ffd60a'; circle(ctx, px + t * 0.3, py + t * 0.3, t * 0.025); ctx.fill(); }
        break;
      case 'geleira':
        if (h > 0.85) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; star(ctx, px + t * 0.5, py + t * 0.5, t * 0.08, t * 0.02, 4, now / 900); ctx.fill(); }
        break;
      case 'vulcao':
        if (h > 0.7) {
          ctx.strokeStyle = `rgba(255,${90 + 40 * Math.sin(now / 300 + x)},0,0.7)`; ctx.lineWidth = Math.max(1, t * 0.05);
          ctx.beginPath(); ctx.moveTo(px + t * 0.1, py + t * hash(x, y, 4)); ctx.lineTo(px + t * 0.5, py + t * 0.5); ctx.lineTo(px + t * 0.9, py + t * hash(x, y, 5)); ctx.stroke();
        }
        break;
      case 'doces':
        ctx.fillStyle = 'rgba(192,133,82,0.35)';
        for (const [a, b] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.7]]) { circle(ctx, px + t * a, py + t * b, t * 0.04); ctx.fill(); }
        break;
      case 'lua':
        if (h > 0.75) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; oval(ctx, px + t * 0.5, py + t * 0.55, t * 0.25, t * 0.18); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; oval(ctx, px + t * 0.5, py + t * 0.5, t * 0.2, t * 0.12); ctx.fill(); }
        break;
      case 'navio':
        ctx.strokeStyle = 'rgba(61,40,23,0.45)'; ctx.lineWidth = Math.max(1, t * 0.03);
        ctx.beginPath(); ctx.moveTo(px, py + t * 0.5); ctx.lineTo(px + t, py + t * 0.5); ctx.stroke();
        ctx.fillStyle = 'rgba(61,40,23,0.5)'; circle(ctx, px + t * (y % 2 ? 0.2 : 0.8), py + t * 0.25, t * 0.03); ctx.fill();
        break;
    }
  }

  function drawWall(ctx, theme, px, py, t, x, y, color, border, now) {
    const th = THEMES[theme] || {};
    const c = border ? (th.border || shade(color, -30)) : color;
    // 3D block: top face lighter, front face darker
    const lift = t * 0.16;
    ctx.fillStyle = shade(c, -45);
    ctx.fillRect(px, py + t - lift, t, lift);
    rrect(ctx, px + t * 0.02, py - lift * 0.4, t * 0.96, t - lift * 0.5, t * 0.14);
    fo(ctx, c, t, 0.05);
    const tx = px + t / 2, ty = py + t * 0.38;
    shine(ctx, px + t * 0.28, py + t * 0.1, t * 0.16, t * 0.06, 0.4);
    if (border) {
      if (theme === 'praia') { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = t * 0.05; ctx.beginPath(); ctx.arc(tx - t * 0.15, ty, t * 0.12, Math.PI, 0); ctx.arc(tx + t * 0.1, ty, t * 0.12, Math.PI, 0); ctx.stroke(); }
      else if (theme === 'doces') { ctx.save(); rrect(ctx, px + t * 0.02, py - lift * 0.4, t * 0.96, t - lift * 0.5, t * 0.14); ctx.clip(); ctx.strokeStyle = '#fff'; ctx.lineWidth = t * 0.12; for (let i = -1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + i * t * 0.5, py + t); ctx.lineTo(px + i * t * 0.5 + t * 0.6, py - t * 0.2); ctx.stroke(); } ctx.restore(); }
      return;
    }
    switch (theme) {
      case 'praia': // beach umbrella top
        ctx.beginPath(); ctx.arc(tx, ty + t * 0.08, t * 0.3, Math.PI, 0); ctx.closePath(); fo(ctx, (x + y) % 4 === 0 ? '#e63946' : '#ffffff', t, 0.035);
        ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(tx, ty + t * 0.08); ctx.arc(tx, ty + t * 0.08, t * 0.3, Math.PI * 1.33, Math.PI * 1.66); ctx.closePath(); ctx.fill();
        break;
      case 'brinquedos':
        for (const [a, b] of [[0.3, 0.25], [0.7, 0.25], [0.3, 0.55], [0.7, 0.55]]) { circle(ctx, px + t * a, py + t * b, t * 0.1); fo(ctx, shade(c, 25), t, 0.03); }
        break;
      case 'floresta':
        circle(ctx, tx, ty, t * 0.28); fo(ctx, '#2d6a4f', t, 0.035);
        circle(ctx, tx - t * 0.15, ty - t * 0.08, t * 0.17); fo(ctx, '#40916c', t, 0.03);
        circle(ctx, tx + t * 0.14, ty - t * 0.06, t * 0.15); fo(ctx, '#52b788', t, 0.03);
        break;
      case 'geleira':
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = t * 0.05;
        ctx.beginPath(); ctx.moveTo(px + t * 0.25, py + t * 0.6); ctx.lineTo(px + t * 0.45, py + t * 0.15); ctx.moveTo(px + t * 0.55, py + t * 0.6); ctx.lineTo(px + t * 0.72, py + t * 0.25); ctx.stroke();
        break;
      case 'vulcao':
        ctx.strokeStyle = `rgba(255,${80 + 60 * Math.sin(now / 350 + x * 2 + y)},0,0.95)`; ctx.lineWidth = t * 0.06;
        ctx.beginPath(); ctx.moveTo(px + t * 0.2, py + t * 0.2); ctx.lineTo(px + t * 0.45, py + t * 0.45); ctx.lineTo(px + t * 0.35, py + t * 0.7); ctx.moveTo(px + t * 0.45, py + t * 0.45); ctx.lineTo(px + t * 0.8, py + t * 0.35); ctx.stroke();
        break;
      case 'doces': // lollipop
        ctx.fillStyle = '#fff'; ctx.fillRect(tx - t * 0.03, ty, t * 0.06, t * 0.4);
        circle(ctx, tx, ty, t * 0.24); fo(ctx, '#ff70a6', t, 0.035);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = t * 0.05; ctx.beginPath();
        for (let a = 0; a < 10; a += 0.3) ctx.lineTo(tx + Math.cos(a) * a * t * 0.022, ty + Math.sin(a) * a * t * 0.022);
        ctx.stroke();
        break;
      case 'lua':
        ctx.fillStyle = '#9d4edd';
        for (const [a, b] of [[0.2, 0.15], [0.8, 0.15], [0.2, 0.65], [0.8, 0.65]]) { circle(ctx, px + t * a, py + t * b, t * 0.04); ctx.fill(); }
        rrect(ctx, px + t * 0.32, py + t * 0.25, t * 0.36, t * 0.25, t * 0.04); fo(ctx, Math.sin(now / 400 + x + y) > 0 ? '#4cc9f0' : '#3a0ca3', t, 0.03);
        break;
      case 'navio':
        ctx.fillStyle = '#495057'; ctx.fillRect(px + t * 0.05, py + t * 0.2, t * 0.9, t * 0.07); ctx.fillRect(px + t * 0.05, py + t * 0.55, t * 0.9, t * 0.07);
        break;
    }
  }

  function drawSoft(ctx, theme, px, py, t, x, y, color, now) {
    const cx = px + t / 2, cy = py + t / 2;
    switch (theme) {
      case 'praia': // sandcastle
        rrect(ctx, px + t * 0.12, py + t * 0.35, t * 0.76, t * 0.55, t * 0.06); fo(ctx, color, t);
        for (const dx of [0.12, 0.62]) { rrect(ctx, px + t * dx, py + t * 0.12, t * 0.26, t * 0.3, t * 0.04); fo(ctx, color, t); }
        ctx.fillStyle = '#5c3a21'; rrect(ctx, cx - t * 0.09, py + t * 0.6, t * 0.18, t * 0.3, t * 0.09); ctx.fill();
        ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(px + t * 0.25, py + t * 0.12); ctx.lineTo(px + t * 0.25, py - t * 0.05); ctx.lineTo(px + t * 0.4, py + t * 0.02); ctx.fill();
        break;
      case 'brinquedos': { // toy box with a letter
        rrect(ctx, px + t * 0.1, py + t * 0.1, t * 0.8, t * 0.8, t * 0.1); fo(ctx, ['#ffb703', '#3a86ff', '#8ac926', '#ff5d8f'][(x * 3 + y) % 4], t);
        ctx.fillStyle = '#fff'; ctx.font = `${Math.floor(t * 0.48)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('XPLODIT'[(x + y * 2) % 7], cx, cy + t * 0.03);
        break;
      }
      case 'floresta': // bush
        for (const [a, b, r] of [[0.3, 0.6, 0.25], [0.7, 0.6, 0.25], [0.5, 0.38, 0.3]]) { circle(ctx, px + t * a, py + t * b, t * r); fo(ctx, '#52b788', t); }
        ctx.fillStyle = '#e63946'; for (const [a, b] of [[0.35, 0.45], [0.62, 0.62], [0.55, 0.3]]) { circle(ctx, px + t * a, py + t * b, t * 0.05); ctx.fill(); }
        break;
      case 'geleira': // snowman
        circle(ctx, cx, py + t * 0.65, t * 0.27); fo(ctx, '#fff', t);
        circle(ctx, cx, py + t * 0.3, t * 0.19); fo(ctx, '#fff', t);
        ctx.fillStyle = OUT; circle(ctx, cx - t * 0.07, py + t * 0.27, t * 0.025); ctx.fill(); circle(ctx, cx + t * 0.07, py + t * 0.27, t * 0.025); ctx.fill();
        ctx.fillStyle = '#ff7f11'; ctx.beginPath(); ctx.moveTo(cx, py + t * 0.32); ctx.lineTo(cx + t * 0.15, py + t * 0.35); ctx.lineTo(cx, py + t * 0.37); ctx.fill();
        break;
      case 'vulcao': // cracked boulder
        ctx.beginPath(); ctx.moveTo(px + t * 0.12, py + t * 0.85); ctx.lineTo(px + t * 0.08, py + t * 0.45); ctx.lineTo(px + t * 0.3, py + t * 0.15); ctx.lineTo(px + t * 0.7, py + t * 0.12);
        ctx.lineTo(px + t * 0.92, py + t * 0.45); ctx.lineTo(px + t * 0.88, py + t * 0.85); ctx.closePath(); fo(ctx, color, t);
        ctx.strokeStyle = '#ffbe0b'; ctx.lineWidth = t * 0.04; ctx.beginPath(); ctx.moveTo(cx - t * 0.15, py + t * 0.3); ctx.lineTo(cx, cy); ctx.lineTo(cx + t * 0.1, py + t * 0.75); ctx.stroke();
        break;
      case 'doces': // cupcake
        ctx.beginPath(); ctx.moveTo(px + t * 0.18, py + t * 0.5); ctx.lineTo(px + t * 0.82, py + t * 0.5); ctx.lineTo(px + t * 0.72, py + t * 0.9); ctx.lineTo(px + t * 0.28, py + t * 0.9); ctx.closePath(); fo(ctx, color, t);
        for (const [a, b, r] of [[0.3, 0.45, 0.17], [0.7, 0.45, 0.17], [0.5, 0.33, 0.22]]) { circle(ctx, px + t * a, py + t * b, t * r); fo(ctx, (x + y) % 2 ? '#ffafcc' : '#fff', t); }
        circle(ctx, cx, py + t * 0.12, t * 0.08); fo(ctx, '#e63946', t, 0.03);
        break;
      case 'lua': // supply crate
        rrect(ctx, px + t * 0.12, py + t * 0.14, t * 0.76, t * 0.74, t * 0.06); fo(ctx, color, t);
        ctx.fillStyle = '#ffd60a'; ctx.fillRect(px + t * 0.12, cy - t * 0.05, t * 0.76, t * 0.1);
        ctx.fillStyle = OUT; ctx.font = `${Math.floor(t * 0.22)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', cx, py + t * 0.33);
        break;
      case 'navio': // barrel
        oval(ctx, cx, cy, t * 0.34, t * 0.4); fo(ctx, color, t);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = t * 0.06;
        ctx.beginPath(); ctx.moveTo(cx - t * 0.32, cy - t * 0.18); ctx.lineTo(cx + t * 0.32, cy - t * 0.18); ctx.moveTo(cx - t * 0.32, cy + t * 0.18); ctx.lineTo(cx + t * 0.32, cy + t * 0.18); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = t * 0.02; ctx.beginPath(); ctx.moveTo(cx, cy - t * 0.38); ctx.lineTo(cx, cy + t * 0.38); ctx.stroke();
        break;
      default:
        rrect(ctx, px + t * 0.08, py + t * 0.08, t * 0.84, t * 0.84, t * 0.14); fo(ctx, color, t);
    }
    shine(ctx, px + t * 0.32, py + t * 0.28, t * 0.1, t * 0.05, 0.35);
  }

  /** Draws a whole tile grid (used by the game and by map previews). */
  function drawArena(ctx, st, t, now) {
    const W = st.width;
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const tile = st.tiles[i];
        const px = x * t, py = y * t;
        if (tile !== 1) {
          drawFloor(ctx, st.themeId, px, py, t, x, y, st.floorColor, now);
          if (st.ice && st.ice[i]) {
            ctx.fillStyle = 'rgba(220,245,255,0.8)';
            rrect(ctx, px + 1, py + 1, t - 2, t - 2, t * 0.12); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(1, t * 0.05);
            ctx.beginPath(); ctx.moveTo(px + t * 0.2, py + t * 0.75); ctx.lineTo(px + t * 0.45, py + t * 0.5);
            ctx.moveTo(px + t * 0.55, py + t * 0.4); ctx.lineTo(px + t * 0.72, py + t * 0.22); ctx.stroke();
          }
          if (st.paint) {
            const owner = st.paint[i];
            if (owner > 0) {
              ctx.globalAlpha = 0.32;
              ctx.fillStyle = st.paintColors[owner - 1];
              const k = hash(x, y, 9);
              ctx.beginPath();
              for (let a = 0; a < 8; a++) { const rr = t * (0.36 + 0.1 * hash(x, y, a)); const ang = a / 8 * TAU + k; ctx.lineTo(px + t / 2 + Math.cos(ang) * rr, py + t / 2 + Math.sin(ang) * rr); }
              ctx.closePath(); ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }
    // shadows of walls and blocks onto the floor
    for (let y = 0; y < st.height; y++) for (let x = 0; x < W; x++) {
      const tile = st.tiles[y * W + x];
      if (tile === 1 || tile === 2) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x * t + t * 0.15, y * t + t * 0.85, t, t * 0.22); }
    }
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < W; x++) {
        const tile = st.tiles[y * W + x];
        const border = x === 0 || y === 0 || x === W - 1 || y === st.height - 1;
        if (tile === 1) drawWall(ctx, st.themeId, x * t, y * t, t, x, y, st.wallColor, border, now);
        else if (tile === 2) drawSoft(ctx, st.themeId, x * t, y * t, t, x, y, st.softColor, now);
      }
    }
  }

  /** Comic-book speech burst with a word in it. */
  function drawBurst(ctx, cx, cy, size, text, fill = '#ffd60a', textColor = '#e63946', rot = 0) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.lineJoin = 'round';
    star(ctx, 0, 0, size, size * 0.68, 12);
    fo(ctx, fill, size * 0.6, 0.12);
    ctx.font = `${Math.floor(size * 0.42)}px "Luckiest Guy", Bungee, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.08; ctx.strokeStyle = OUT; ctx.strokeText(text, 0, size * 0.04);
    ctx.fillStyle = textColor; ctx.fillText(text, 0, size * 0.04);
    ctx.restore();
  }

  window.XC = {
    OUT, TAU, shade, alpha, hash, rrect, circle, oval, star, heart, fo, shine,
    drawCharacter, drawBomb, drawPowerUp, drawMonster, drawArena, drawBurst, POWER
  };
})();
