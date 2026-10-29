(() => {
  const X = window.XC;
  const DIR = { none: 0, up: 1, down: 2, left: 3, right: 4 };
  const KEYMAP_SOLO = {
    ArrowUp: [0, DIR.up], ArrowDown: [0, DIR.down], ArrowLeft: [0, DIR.left], ArrowRight: [0, DIR.right],
    w: [0, DIR.up], s: [0, DIR.down], a: [0, DIR.left], d: [0, DIR.right]
  };
  const KEYMAP_DUO = {
    w: [0, DIR.up], s: [0, DIR.down], a: [0, DIR.left], d: [0, DIR.right],
    ArrowUp: [1, DIR.up], ArrowDown: [1, DIR.down], ArrowLeft: [1, DIR.left], ArrowRight: [1, DIR.right]
  };
  const BLOCKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Enter', 'Escape']);
  const ANIMATED_THEMES = new Set(['vulcao', 'lua', 'geleira']);
  const TITLE_FONT = '"Luckiest Guy", Bungee, sans-serif';

  // ------------------------------------------------------------------ audio

  const sfx = {
    ctx: null,
    muted: false,
    ensure() {
      if (this.ctx || this.muted) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
    },
    tone(freq, dur, type = 'square', vol = 0.08, slideTo = null, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    noise(dur, vol = 0.25, cutoff = 900) {
      if (!this.ctx || this.muted) return;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start();
    },
    play(kind) {
      switch (kind) {
        case 'boom': this.noise(0.45, 0.3, 700); this.tone(90, 0.3, 'sine', 0.2, 40); break;
        case 'freezeboom': this.noise(0.3, 0.15, 3000); this.tone(1400, 0.4, 'triangle', 0.06, 2200); break;
        case 'place': this.tone(220, 0.08, 'square', 0.05, 160); break;
        case 'kick': this.tone(300, 0.1, 'square', 0.06, 600); break;
        case 'throw': this.tone(400, 0.25, 'triangle', 0.06, 900); break;
        case 'land': this.tone(160, 0.08, 'square', 0.05, 90); break;
        case 'bonk': this.tone(700, 0.08, 'square', 0.06, 300); this.tone(500, 0.1, 'square', 0.05, 200, 0.06); break;
        case 'power': [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, null, i * 0.06)); break;
        case 'curse': [300, 250, 200].forEach((f, i) => this.tone(f, 0.15, 'sawtooth', 0.05, null, i * 0.08)); break;
        case 'coin': this.tone(988, 0.06, 'square', 0.035); this.tone(1319, 0.1, 'square', 0.035, null, 0.05); break;
        case 'bigcoin': [784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.05, null, i * 0.05)); break;
        case 'star': [880, 1175, 1760].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.07, null, i * 0.05)); break;
        case 'hit': this.tone(400, 0.25, 'sawtooth', 0.08, 120); break;
        case 'ko': this.tone(500, 0.6, 'sawtooth', 0.08, 60); this.tone(900, 0.4, 'sine', 0.04, 1800, 0.3); break;
        case 'shield': this.tone(700, 0.2, 'sine', 0.08, 1200); break;
        case 'freeze': this.tone(1800, 0.25, 'triangle', 0.06, 900); break;
        case 'shatter': this.noise(0.25, 0.2, 5000); this.tone(2000, 0.15, 'triangle', 0.05, 500); break;
        case 'crush': this.noise(0.15, 0.25, 300); break;
        case 'rain': this.tone(1200, 0.5, 'sine', 0.05, 300); break;
        case 'monster': this.tone(200, 0.3, 'square', 0.06, 900); break;
        case 'bite': this.tone(150, 0.15, 'square', 0.08, 80); break;
        case 'go': this.tone(880, 0.25, 'square', 0.07); break;
        case 'round': [392, 392].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, null, i * 0.5)); break;
        case 'suddendeath': [440, 330, 440, 330].forEach((f, i) => this.tone(f, 0.15, 'sawtooth', 0.06, null, i * 0.18)); break;
        case 'roundover': case 'matchover': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.06, null, i * 0.12)); break;
      }
    }
  };

  // ------------------------------------------------------------------ particles

  const TRAILS = {
    dust: { every: 0.12, make: () => ({ shape: 'puff', color: 'rgba(255,255,255,0.75)', size: 0.12, life: 0.45, vy: -0.4 }) },
    footprints: { every: 0.2, make: (a) => ({ shape: 'foot', color: 'rgba(40,30,20,0.35)', size: 0.09, life: 1.6, vy: 0, rot: [0, Math.PI, 0, -Math.PI / 2, Math.PI / 2][a.facing] || 0 }) },
    bubbles: { every: 0.1, make: () => ({ shape: 'bubble', color: '#a0e7e5', size: 0.08 + Math.random() * 0.06, life: 0.9, vy: -0.9 }) },
    stars: { every: 0.08, make: () => ({ shape: 'star', color: ['#ffd60a', '#fff', '#ffbe0b'][Math.floor(Math.random() * 3)], size: 0.1, life: 0.6, vy: -0.5, spin: 6 }) },
    hearts: { every: 0.12, make: () => ({ shape: 'heart', color: ['#ff3d6e', '#ff70a6'][Math.floor(Math.random() * 2)], size: 0.12, life: 0.8, vy: -0.8 }) },
    notes: { every: 0.15, make: () => ({ shape: 'note', color: ['#7b2cbf', '#3a86ff', '#e63946'][Math.floor(Math.random() * 3)], size: 0.22, life: 0.9, vy: -0.9 }) },
    fire: { every: 0.04, make: () => ({ shape: 'puff', color: ['#ff7f11', '#ffbe0b', '#e63946'][Math.floor(Math.random() * 3)], size: 0.13, life: 0.35, vy: -1.2, shrink: true }) },
    rainbow: { every: 0.03, make: (a, n) => ({ shape: 'puff', color: `hsl(${(n * 25) % 360},90%,60%)`, size: 0.13, life: 0.6, vy: 0, shrink: true }) }
  };

  function drawParticle(ctx, p, tile) {
    const x = p.x * tile, y = p.y * tile;
    const k = p.shrink ? Math.max(0.05, p.life / p.max) : 1;
    const sz = p.size * tile * k;
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
    ctx.fillStyle = p.color;
    switch (p.shape) {
      case 'puff': X.circle(ctx, x, y, sz); ctx.fill(); break;
      case 'bubble':
        X.circle(ctx, x, y, sz); ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, tile * 0.025); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; X.circle(ctx, x - sz * 0.35, y - sz * 0.35, sz * 0.25); ctx.fill();
        break;
      case 'star': X.star(ctx, x, y, sz, sz * 0.45, 5, p.rot || 0); ctx.fill(); break;
      case 'heart': X.heart(ctx, x, y, sz); ctx.fill(); break;
      case 'note':
        ctx.font = `${Math.floor(sz * 1.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('♪', x, y);
        break;
      case 'foot':
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot || 0);
        X.oval(ctx, 0, 0, sz * 0.6, sz); ctx.fill();
        ctx.restore();
        break;
      case 'debris':
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot || 0);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.strokeStyle = X.OUT; ctx.lineWidth = 1; ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
        break;
      case 'smoke': X.circle(ctx, x, y, sz * (1.6 - p.life / p.max)); ctx.fill(); break;
      default: X.circle(ctx, x, y, sz); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ main renderer

  window.xploditCanvas = {
    _raf: 0,
    _dotNet: null,
    _canvasId: null,
    _canvas: null,
    _ctx: null,
    _humans: 1,
    _mapW: 25,
    _mapH: 19,
    _held: [[], []],
    _bomb: [false, false],
    _det: [false, false],
    _pause: false,
    _confirm: false,
    _inFlight: false,
    _particles: [],
    _floaters: [],
    _bursts: [],
    _kos: [],
    _dizzy: {},
    _trailClock: {},
    _trailCount: 0,
    _lastActors: [],
    _prevTiles: null,
    _shake: 0,
    _flash: 0,
    _banner: null,
    _tile: 40,
    _cache: null,
    _cacheKey: '',
    _cacheTime: 0,
    _danceStart: 0,
    _lastPhase: -1,

    async start(canvasId, dotNetRef, options, humans) {
      this.stop();
      this._canvasId = canvasId;
      this._dotNet = dotNetRef;
      this._humans = humans || 1;
      this._mapW = (options && options.width) || 25;
      this._mapH = (options && options.height) || 19;
      this._canvas = document.getElementById(canvasId);
      if (!this._canvas) return;
      this._ctx = this._canvas.getContext('2d');
      this._resize();
      this._onResize = () => this._resize();
      window.addEventListener('resize', this._onResize);
      this._onKeyDown = (e) => this._handleKey(e, true);
      this._onKeyUp = (e) => this._handleKey(e, false);
      this._onBlur = () => { this._held = [[], []]; };
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
      window.addEventListener('blur', this._onBlur);

      if (document.fonts && document.fonts.load) {
        try { await Promise.race([document.fonts.load('40px "Luckiest Guy"'), new Promise(r => setTimeout(r, 800))]); } catch { }
      }
      if (this._canvasId !== canvasId) return;

      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (this._dotNet && !this._inFlight) {
          this._inFlight = true;
          const ref = this._dotNet;
          ref.invokeMethodAsync('Tick', dt, this._buildInput())
            .catch(() => { })
            .finally(() => { if (this._dotNet === ref) this._inFlight = false; });
        }
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    },

    stop(canvasId) {
      if (canvasId && canvasId !== this._canvasId) return;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
      if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp);
      if (this._onBlur) window.removeEventListener('blur', this._onBlur);
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      this._onKeyDown = this._onKeyUp = this._onBlur = this._onResize = null;
      this._dotNet = null;
      this._canvasId = null;
      this._canvas = null;
      this._ctx = null;
      this._held = [[], []];
      this._bomb = [false, false];
      this._det = [false, false];
      this._pause = false;
      this._confirm = false;
      this._inFlight = false;
      this._particles = [];
      this._floaters = [];
      this._bursts = [];
      this._kos = [];
      this._dizzy = {};
      this._trailClock = {};
      this._lastActors = [];
      this._prevTiles = null;
      this._banner = null;
      this._cache = null;
      this._cacheKey = '';
      this._lastPhase = -1;
    },

    _resize() {
      const canvas = this._canvas;
      if (!canvas) return;
      const wrap = canvas.parentElement;
      const maxW = Math.max(320, (wrap ? wrap.clientWidth : 960) - 8);
      const maxH = Math.max(280, window.innerHeight - 24);
      const tile = Math.max(14, Math.floor(Math.min(maxW / this._mapW, maxH / this._mapH, 46)));
      canvas.width = tile * this._mapW;
      canvas.height = tile * this._mapH;
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
      this._cache = null;
    },

    _handleKey(e, down) {
      if (e.repeat && down && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return; }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (BLOCKED_KEYS.has(e.key) || KEYMAP_SOLO[key]) e.preventDefault();
      if (down) sfx.ensure();

      const map = this._humans >= 2 ? KEYMAP_DUO : KEYMAP_SOLO;
      const binding = map[key];
      if (binding) {
        const [player, dir] = binding;
        const held = this._held[player];
        const idx = held.indexOf(dir);
        if (idx >= 0) held.splice(idx, 1);
        if (down) held.push(dir); // most recent key wins
        return;
      }

      if (!down || e.repeat) return;
      const duo = this._humans >= 2;
      if (key === ' ') { this._bomb[0] = true; this._confirm = true; }
      else if (key === 'Enter') { this._bomb[duo ? 1 : 0] = true; this._confirm = true; }
      else if (key === 'q' || (!duo && (key === 'Shift' || key === 'e'))) this._det[0] = true;
      else if (duo && (key === 'l' || e.code === 'ShiftRight')) this._det[1] = true;
      else if (duo && e.code === 'ShiftLeft') this._det[0] = true;
      else if (key === 'Escape' || key === 'p') this._pause = true;
      else if (key === 'm') { sfx.muted = !sfx.muted; this._floatText(this._mapW / 2, this._mapH / 2, sfx.muted ? '🔇 Som desligado' : '🔊 Som ligado', '#fff'); }
    },

    _buildInput() {
      const input = {
        p1Move: this._held[0].length ? this._held[0][this._held[0].length - 1] : 0,
        p1Bomb: this._bomb[0],
        p2Move: this._held[1].length ? this._held[1][this._held[1].length - 1] : 0,
        p2Bomb: this._bomb[1],
        p1Det: this._det[0],
        p2Det: this._det[1],
        togglePause: this._pause,
        confirm: this._confirm
      };
      this._bomb = [false, false];
      this._det = [false, false];
      this._pause = false;
      this._confirm = false;
      return input;
    },

    // -------------------------------------------------------------- effects

    _floatText(x, y, text, color) {
      this._floaters.push({ x, y, text, color: color || '#fff', life: 1.2 });
    },

    _burst(x, y, colors, n, speed, shape = 'sq') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (0.5 + Math.random()) * speed;
        const life = 0.4 + Math.random() * 0.5;
        this._particles.push({
          x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9,
          life, max: life, size: 0.06 + Math.random() * 0.08, shape,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    },

    _addParticle(p) {
      p.max = p.life;
      p.vx = p.vx || 0; p.vy = p.vy || 0;
      this._particles.push(p);
    },

    _nearestActor(x, y) {
      let best = null, bestD = 2.5;
      for (const a of this._lastActors) {
        const d = Math.abs(a.x - x) + Math.abs(a.y - y);
        if (d < bestD) { best = a; bestD = d; }
      }
      return best;
    },

    _handleEvents(events) {
      let booms = [];
      for (const ev of events || []) {
        sfx.play(ev.kind);
        switch (ev.kind) {
          case 'boom':
            booms.push(ev);
            this._shake = Math.min(12, this._shake + 4);
            this._burst(ev.x, ev.y, ['#ffbe0b', '#ff7f11', '#fff3b0'], 10, 4, 'star');
            for (let i = 0; i < 5; i++) this._addParticle({ x: ev.x + 0.5 + (Math.random() - 0.5), y: ev.y + 0.5 + (Math.random() - 0.5), vy: -0.6, shape: 'smoke', color: 'rgba(80,80,90,0.45)', size: 0.25, life: 0.9 + Math.random() * 0.5 });
            break;
          case 'freezeboom':
            booms.push(ev);
            this._shake = Math.min(8, this._shake + 2);
            this._burst(ev.x, ev.y, ['#caf0f8', '#90e0ef', '#ffffff'], 14, 4, 'star');
            break;
          case 'crush': this._shake = Math.min(6, this._shake + 1.5); this._burst(ev.x, ev.y, ['#555', '#888'], 5, 2); break;
          case 'shatter': this._burst(ev.x, ev.y, ['#caf0f8', '#ffffff', '#48cae4'], 20, 5); break;
          case 'ko': {
            const a = this._nearestActor(ev.x, ev.y);
            if (a) this._kos.push({ x: a.x, y: a.y, look: a.look, color: a.color, life: 1.8, max: 1.8 });
            this._burst(ev.x, ev.y, ['#fff', '#ffd60a'], 16, 4, 'star');
            this._bursts.push({ x: ev.x + 0.5, y: ev.y - 0.3, text: 'K.O.!', life: 0.9, max: 0.9, rot: (Math.random() - 0.5) * 0.4, fill: '#fff', color: '#e63946' });
            this._shake = Math.min(14, this._shake + 6);
            break;
          }
          case 'hit': case 'bite': case 'bonk': {
            const a = this._nearestActor(ev.x, ev.y);
            if (a) this._dizzy[a.id] = 1.2;
            break;
          }
          case 'coin': this._burst(ev.x, ev.y, ['#ffd60a'], 4, 2); break;
          case 'star': case 'bigcoin': this._burst(ev.x, ev.y, ['#ffd60a', '#fff'], 10, 3, 'star'); break;
          case 'power': this._burst(ev.x, ev.y, ['#fff', '#ffd60a', '#80ffdb'], 12, 3, 'star'); break;
          case 'monster': this._burst(ev.x, ev.y, ['#c77dff', '#e0aaff', '#70e000'], 14, 4); this._bursts.push({ x: ev.x + 0.5, y: ev.y, text: 'POF!', life: 0.6, max: 0.6, rot: 0.2, fill: '#c77dff', color: '#fff' }); break;
          case 'burn': this._burst(ev.x, ev.y, ['#999', '#ccc'], 6, 2); break;
          case 'throw': this._burst(ev.x, ev.y, ['#fff'], 5, 2, 'puff'); break;
          case 'land': this._burst(ev.x, ev.y, ['rgba(255,255,255,0.8)'], 6, 2.5, 'puff'); break;
          case 'round': this._banner = { text: ev.text, life: 1.6, max: 1.6, color: '#ffd60a' }; break;
          case 'go': this._banner = { text: 'JÁ!', life: 0.9, max: 0.9, color: '#80ed99', burst: true }; break;
          case 'suddendeath': this._banner = { text: ev.text, life: 2.4, max: 2.4, color: '#ff4d00' }; break;
          case 'roundover': this._danceStart = performance.now(); break;
          case 'matchover': this._danceStart = performance.now(); break;
        }

        if (ev.text && !['round', 'suddendeath', 'go'].includes(ev.kind)) {
          this._floatText(ev.x, ev.y, ev.text, ev.color);
        }
      }

      if (booms.length) {
        const ev = booms[0];
        const words = booms.length >= 3 ? ['KABOOM!'] : booms.length === 2 ? ['KA-BUM!', 'BLAM!'] : ['BUM!', 'POW!', 'BAM!', 'BOOM!'];
        if (booms.length >= 2 || Math.random() < 0.45) {
          const freeze = ev.kind === 'freezeboom';
          this._bursts.push({
            x: ev.x + 0.5, y: ev.y - 0.2, text: freeze ? 'BRRR!' : words[Math.floor(Math.random() * words.length)],
            life: 0.75, max: 0.75, rot: (Math.random() - 0.5) * 0.5, big: booms.length >= 3,
            fill: freeze ? '#caf0f8' : '#ffd60a', color: freeze ? '#0077b6' : '#e63946'
          });
        }
        if (booms.length >= 3) this._flash = 0.25;
      }
    },

    _spawnDebris(state) {
      const prev = this._prevTiles;
      if (prev && prev.length === state.tiles.length) {
        for (let i = 0; i < prev.length; i++) {
          if (prev[i] === 2 && state.tiles[i] !== 2) {
            const x = i % state.width, y = Math.floor(i / state.width);
            for (let k = 0; k < 7; k++) {
              this._addParticle({
                x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, gravity: 9,
                shape: 'debris', color: X.shade(state.softColor, (Math.random() - 0.5) * 60), size: 0.1 + Math.random() * 0.08,
                life: 0.7 + Math.random() * 0.3, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 12
              });
            }
          }
        }
      }
      this._prevTiles = Array.from(state.tiles);
    },

    _spawnTrails(state, dt) {
      for (const a of state.actors) {
        if (!a.moving || a.frozen) continue;
        const kind = a.look.items.trail;
        const clock = (this._trailClock[a.id] || 0) + dt;
        this._trailClock[a.id] = clock;
        const def = TRAILS[kind];
        const dust = TRAILS.dust;
        if (def && clock >= def.every) {
          this._trailClock[a.id] = 0;
          const p = def.make(a, this._trailCount++);
          p.x = a.x + 0.5 + (Math.random() - 0.5) * 0.25;
          p.y = a.y + (p.shape === 'foot' ? 0.85 : 0.8) + (Math.random() - 0.5) * 0.15;
          p.vx = (Math.random() - 0.5) * 0.4;
          this._addParticle(p);
        } else if (!def && clock >= 0.22) {
          this._trailClock[a.id] = 0;
          const p = dust.make();
          p.x = a.x + 0.5; p.y = a.y + 0.9; p.size = 0.08;
          this._addParticle(p);
        }
      }
    },

    // -------------------------------------------------------------- draw

    draw(state) {
      const canvas = this._canvas;
      const ctx = this._ctx;
      if (!canvas || !ctx || !state) return;

      const now = performance.now();
      const dt = this._lastDraw ? Math.min(0.05, (now - this._lastDraw) / 1000) : 0.016;
      this._lastDraw = now;
      if (state.width !== this._mapW || state.height !== this._mapH) {
        this._mapW = state.width; this._mapH = state.height; this._resize();
      }
      if (state.phase !== this._lastPhase) {
        if (state.phase === 2 || state.phase === 3) this._danceStart = now;
        if (state.phase === 0) { this._prevTiles = null; this._kos = []; }
        this._lastPhase = state.phase;
      }
      this._handleEvents(state.events);
      this._spawnDebris(state);
      if (!state.paused) this._spawnTrails(state, dt);

      const tile = Math.floor(Math.min(canvas.width / state.width, canvas.height / state.height));
      const offX = Math.floor((canvas.width - tile * state.width) / 2);
      const offY = Math.floor((canvas.height - tile * state.height) / 2);
      this._tile = tile;

      ctx.save();
      ctx.fillStyle = '#1b1b2f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (this._shake > 0) {
        ctx.translate((Math.random() - 0.5) * this._shake, (Math.random() - 0.5) * this._shake);
        this._shake = Math.max(0, this._shake - dt * 30);
      }
      ctx.translate(offX, offY);

      this._drawArenaCached(ctx, state, tile, now);
      this._drawItems(ctx, state, tile, now);
      this._drawBombs(ctx, state, tile, now, false);
      this._drawExplosions(ctx, state, tile, now);
      this._drawMonsters(ctx, state, tile, now);
      this._drawActors(ctx, state, tile, now, dt);
      this._drawBombs(ctx, state, tile, now, true);
      this._drawEffects(ctx, tile, dt, now);
      ctx.restore();

      this._lastActors = state.actors.map(a => ({ id: a.id, x: a.x, y: a.y, look: a.look, color: a.color }));
      this._drawOverlay(ctx, state, canvas, now, dt);
    },

    _drawArenaCached(ctx, state, tile, now) {
      const key = tile + '|' + state.themeId + '|' + state.tiles.join('') + '|' + state.paint.join(',') + '|' + state.ice.join('');
      const animated = ANIMATED_THEMES.has(state.themeId);
      if (!this._cache || key !== this._cacheKey || (animated && now - this._cacheTime > 120)) {
        if (!this._cache) this._cache = document.createElement('canvas');
        this._cache.width = tile * state.width;
        this._cache.height = tile * state.height;
        const c = this._cache.getContext('2d');
        X.drawArena(c, state, tile, now);
        this._cacheKey = key;
        this._cacheTime = now;
      }
      ctx.drawImage(this._cache, 0, 0);
    },

    _drawItems(ctx, state, tile, now) {
      for (const p of state.powerUps) {
        const bob = Math.sin(now / 250 + p.x + p.y) * tile * 0.06;
        const cx = p.x * tile + tile / 2, cy = p.y * tile + tile / 2 + bob - tile * 0.04;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        X.oval(ctx, p.x * tile + tile / 2, p.y * tile + tile * 0.88, tile * 0.28 - bob * 0.5, tile * 0.07); ctx.fill();
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now / 200 + p.x);
        ctx.fillStyle = '#fff';
        X.circle(ctx, cx, cy, tile * 0.48); ctx.fill();
        ctx.restore();
        X.drawPowerUp(ctx, cx, cy, tile * 0.7, p.type, now);
      }

      for (const it of state.items) {
        const cx = it.x * tile + tile / 2;
        const cy = it.y * tile + tile / 2 + Math.sin(now / 200 + it.x * 2) * tile * 0.06;
        ctx.globalAlpha = it.delay > 0 ? 0.5 : 1;
        if (it.kind === 0) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.sin(now / 400 + it.x) * 0.3);
          ctx.lineJoin = 'round';
          X.star(ctx, 0, 0, tile * 0.4, tile * 0.19);
          X.fo(ctx, '#ffd60a', tile);
          ctx.fillStyle = X.OUT;
          X.circle(ctx, -tile * 0.07, -tile * 0.02, tile * 0.035); ctx.fill();
          X.circle(ctx, tile * 0.07, -tile * 0.02, tile * 0.035); ctx.fill();
          ctx.strokeStyle = X.OUT; ctx.lineWidth = Math.max(1, tile * 0.03);
          ctx.beginPath(); ctx.arc(0, tile * 0.03, tile * 0.06, 0.2, Math.PI - 0.2); ctx.stroke();
          ctx.restore();
        } else {
          const big = it.kind === 2;
          const r = tile * (big ? 0.3 : 0.14);
          const squash = Math.max(0.2, Math.abs(Math.cos(now / 300 + it.x + it.y)));
          X.oval(ctx, cx, cy, r * squash, r);
          X.fo(ctx, '#ffbe0b', tile, 0.035);
          ctx.fillStyle = '#ffe066';
          X.oval(ctx, cx, cy, r * 0.6 * squash, r * 0.6); ctx.fill();
          if (big && squash > 0.6) {
            ctx.fillStyle = '#b8860b';
            ctx.font = `${Math.floor(tile * 0.24)}px Bungee, sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('10', cx, cy + 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    _drawBombs(ctx, state, tile, now, flyingPass) {
      for (const b of state.bombs) {
        const flying = b.h > 0.01;
        if (flying !== flyingPass) continue;
        const cx = b.x * tile + tile / 2;
        const ground = b.y * tile + tile / 2;
        const cy = ground - b.h * tile * 1.3;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        X.oval(ctx, cx, ground + tile * 0.32, tile * 0.3 * (1 - b.h * 0.4), tile * 0.08); ctx.fill();
        const r = tile * 0.3;
        if (b.pierce) {
          ctx.fillStyle = '#ff7f11';
          for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4 + now / 400;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a - 0.2) * r, cy + Math.sin(a - 0.2) * r);
            ctx.lineTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.4);
            ctx.lineTo(cx + Math.cos(a + 0.2) * r, cy + Math.sin(a + 0.2) * r);
            ctx.fill();
          }
        }
        X.drawBomb(ctx, cx, cy, r, b.skin, b.fuse, now + b.id * 37, b.color, { s: tile, remote: b.remote });
        if (b.freeze) {
          ctx.fillStyle = 'rgba(144,224,239,0.35)';
          X.circle(ctx, cx, cy, r * 1.1); ctx.fill();
          ctx.fillStyle = '#fff';
          X.star(ctx, cx + r * 0.5, cy + r * 0.4, r * 0.3, r * 0.08, 6); ctx.fill();
        }
      }
    },

    _drawExplosions(ctx, state, tile, now) {
      const list = state.explosions;
      if (!list.length) return;
      const blobs = [];
      for (const e of list) {
        const t = Math.max(0, Math.min(1, e.t));
        const k = Math.sin(Math.min(1, (1 - t) * 4) * Math.PI / 2) * (0.55 + 0.45 * t);
        const cx = e.x * tile + tile / 2, cy = e.y * tile + tile / 2;
        const parts = e.shape === 0 ? 5 : 3;
        for (let i = 0; i < parts; i++) {
          let ox = 0, oy = 0;
          if (i > 0) {
            if (e.shape === 0) { const a = (i / 4) * Math.PI * 2 + now / 300; ox = Math.cos(a) * tile * 0.22; oy = Math.sin(a) * tile * 0.22; }
            else if (e.shape === 1) { ox = (i === 1 ? -1 : 1) * tile * 0.28; oy = Math.sin(now / 80 + e.x * 3 + i) * tile * 0.05; }
            else { oy = (i === 1 ? -1 : 1) * tile * 0.28; ox = Math.sin(now / 80 + e.y * 3 + i) * tile * 0.05; }
          }
          const rr = tile * (e.shape === 0 ? 0.52 : 0.4) * k * (i === 0 ? 1 : 0.8) * (0.9 + 0.1 * Math.sin(now / 60 + i + e.x));
          blobs.push({ x: cx + ox, y: cy + oy, r: rr, freeze: e.freeze, t });
        }
      }
      ctx.save();
      // one merged outline for the whole fireball
      ctx.strokeStyle = X.OUT;
      ctx.lineWidth = Math.max(2, tile * 0.09);
      for (const b of blobs) { X.circle(ctx, b.x, b.y, b.r); ctx.stroke(); }
      for (const b of blobs) { ctx.fillStyle = b.freeze ? '#48cae4' : '#ff5400'; X.circle(ctx, b.x, b.y, b.r); ctx.fill(); }
      for (const b of blobs) { ctx.fillStyle = b.freeze ? '#caf0f8' : '#ffbe0b'; X.circle(ctx, b.x, b.y, b.r * 0.68); ctx.fill(); }
      for (const b of blobs) { ctx.fillStyle = '#fffbe6'; X.circle(ctx, b.x - b.r * 0.1, b.y - b.r * 0.1, b.r * 0.36 * b.t + b.r * 0.1); ctx.fill(); }
      ctx.restore();
    },

    _drawMonsters(ctx, state, tile, now) {
      for (const m of state.monsters) {
        const cx = m.x * tile + tile / 2;
        const hop = m.moving ? Math.abs(Math.sin(now / 90 + m.id)) * tile * 0.08 : 0;
        const cy = m.y * tile + tile / 2 - hop;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        X.oval(ctx, cx, m.y * tile + tile * 0.9, tile * 0.3, tile * 0.07); ctx.fill();
        X.drawMonster(ctx, cx, cy, tile, m.id % 3, m.facing, now, m.id);
      }
    },

    _drawActors(ctx, state, tile, now, dt) {
      const sorted = [...state.actors].sort((a, b) => a.y - b.y);
      const celebrating = (state.phase === 2 || state.phase === 3) && state.winnerId >= 0;
      for (const a of sorted) {
        const cx = a.x * tile + tile / 2;
        const by = a.y * tile + tile * 0.97;
        const dizzy = (this._dizzy[a.id] || 0) > 0;
        if (dizzy) this._dizzy[a.id] -= dt;

        if (a.invuln && !a.frozen && !dizzy && Math.floor(now / 80) % 2 === 0) continue;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        X.oval(ctx, cx, by - tile * 0.04, tile * 0.3, tile * 0.09); ctx.fill();
        ctx.strokeStyle = a.color;
        ctx.lineWidth = Math.max(2, tile * 0.06);
        X.oval(ctx, cx, by - tile * 0.04, tile * 0.36, tile * 0.12); ctx.stroke();

        const dancing = celebrating && a.id === state.winnerId;
        ctx.globalAlpha = a.ghost ? 0.5 : 1;
        X.drawCharacter(ctx, cx, by, tile * 1.02, a.look, {
          facing: dancing ? 2 : a.facing, moving: a.moving && !a.frozen, now: a.frozen ? 0 : now,
          dance: dancing ? (now - this._danceStart) / 1000 : -1, hurt: dizzy, blinkSeed: a.id
        });
        ctx.globalAlpha = 1;

        if (dizzy) {
          for (let k = 0; k < 3; k++) {
            const ang = now / 150 + (k * Math.PI * 2) / 3;
            ctx.fillStyle = '#ffd60a';
            X.star(ctx, cx + Math.cos(ang) * tile * 0.32, by - tile * 1.0 + Math.sin(ang) * tile * 0.1, tile * 0.08, tile * 0.035);
            X.fo(ctx, '#ffd60a', tile, 0.02);
          }
        }

        if (a.frozen) {
          ctx.lineJoin = 'round';
          X.rrect(ctx, cx - tile * 0.42, by - tile * 1.12, tile * 0.84, tile * 1.1, tile * 0.12);
          ctx.fillStyle = 'rgba(173,232,244,0.55)'; ctx.fill();
          ctx.strokeStyle = '#0077b6'; ctx.lineWidth = Math.max(2, tile * 0.05); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1.5, tile * 0.04);
          ctx.beginPath(); ctx.moveTo(cx - tile * 0.28, by - tile * 0.95); ctx.lineTo(cx - tile * 0.08, by - tile * 0.75); ctx.stroke();
        }

        if (a.shield) {
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(now / 150);
          ctx.strokeStyle = '#80ffdb'; ctx.lineWidth = Math.max(2, tile * 0.06);
          X.circle(ctx, cx, by - tile * 0.5, tile * 0.58); ctx.stroke();
          ctx.fillStyle = 'rgba(128,255,219,0.12)'; ctx.fill();
          ctx.restore();
        }

        if (a.curse) {
          for (let k = 0; k < 3; k++) {
            const ang = now / 300 + (k * Math.PI * 2) / 3;
            ctx.font = `${Math.floor(tile * 0.22)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', cx + Math.cos(ang) * tile * 0.42, by - tile * 1.05 + Math.sin(ang) * tile * 0.12);
          }
        }

        if (a.isHuman) {
          const label = this._humans >= 2 ? a.name.replace('Jogador ', 'J') : 'VOCÊ';
          const ly = by - tile * 1.32 + Math.sin(now / 200) * tile * 0.05;
          ctx.font = `${Math.floor(tile * 0.3)}px ${TITLE_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(3, tile * 0.1);
          ctx.strokeStyle = X.OUT;
          ctx.strokeText(label, cx, ly);
          ctx.fillStyle = a.color;
          ctx.fillText(label, cx, ly);
          ctx.beginPath(); ctx.moveTo(cx - tile * 0.08, ly + tile * 0.02); ctx.lineTo(cx + tile * 0.08, ly + tile * 0.02); ctx.lineTo(cx, ly + tile * 0.12); ctx.closePath();
          X.fo(ctx, a.color, tile, 0.03);
        }
      }
    },

    _drawEffects(ctx, tile, dt, now) {
      this._particles = this._particles.filter(p => (p.life -= dt) > 0);
      for (const p of this._particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
        else { const drag = p.drag || 0.94; p.vx *= drag; p.vy *= drag; }
        if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
        drawParticle(ctx, p, tile);
      }

      // K.O.: the bomber spins, goes dizzy and floats up as a little ghost.
      this._kos = this._kos.filter(k => (k.life -= dt) > 0);
      for (const k of this._kos) {
        const t = 1 - k.life / k.max;
        const cx = k.x * tile + tile / 2;
        const by = k.y * tile + tile * 0.97 - t * t * tile * 2.2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k.life * 1.5);
        ctx.translate(cx, by - tile * 0.5);
        ctx.rotate(Math.sin(t * 20) * 0.4 * (1 - t));
        ctx.scale(1 - t * 0.3, 1 - t * 0.3);
        ctx.translate(-cx, -(by - tile * 0.5));
        if (t < 0.3) ctx.filter = 'brightness(0.35)';
        X.drawCharacter(ctx, cx, by, tile * 1.02, k.look, { facing: 2, now: performance.now(), hurt: true });
        ctx.filter = 'none';
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = Math.max(2, tile * 0.06);
        X.oval(ctx, cx, by - tile * 1.08, tile * 0.22, tile * 0.07); ctx.stroke();
        ctx.restore();
      }

      // comic bursts
      this._bursts = this._bursts.filter(b => (b.life -= dt) > 0);
      for (const b of this._bursts) {
        const t = 1 - b.life / b.max;
        const pop = t < 0.15 ? t / 0.15 * 1.2 : 1.2 - Math.min(0.2, (t - 0.15));
        ctx.globalAlpha = Math.min(1, b.life * 3);
        X.drawBurst(ctx, b.x * tile, b.y * tile - t * tile * 0.4, tile * (b.big ? 1.4 : 0.85) * pop, b.text, b.fill, b.color, b.rot);
        ctx.globalAlpha = 1;
      }

      this._floaters = this._floaters.filter(f => (f.life -= dt) > 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const f of this._floaters) {
        const rise = (1.2 - f.life) * tile * 0.9;
        const pop = f.life > 1.05 ? 1 + (f.life - 1.05) * 3 : 1;
        ctx.globalAlpha = Math.min(1, f.life * 2);
        ctx.font = `${Math.floor(tile * 0.36 * pop)}px ${TITLE_FONT}`;
        ctx.lineWidth = Math.max(3, tile * 0.11);
        ctx.strokeStyle = X.OUT;
        ctx.strokeText(f.text, f.x * tile + tile / 2, f.y * tile - rise);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x * tile + tile / 2, f.y * tile - rise);
      }
      ctx.globalAlpha = 1;
    },

    _drawOverlay(ctx, state, canvas, now, dt) {
      const W = canvas.width, H = canvas.height;
      if (state.shrinking) {
        ctx.strokeStyle = `rgba(255,77,0,${0.35 + 0.3 * Math.sin(now / 150)})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, W - 10, H - 10);
      }

      if (this._flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this._flash * 2})`;
        ctx.fillRect(0, 0, W, H);
        this._flash = Math.max(0, this._flash - dt);
      }

      const bigText = (text, color, size, alpha = 1, y = H / 2, rot = 0) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(W / 2, y);
        ctx.rotate(rot);
        ctx.font = `${size}px ${TITLE_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.fillStyle = X.OUT;
        ctx.fillText(text, size * 0.06, size * 0.08);
        ctx.lineWidth = Math.max(6, size / 7);
        ctx.strokeStyle = X.OUT;
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      if (state.phase === 0) {
        ctx.fillStyle = 'rgba(27,27,47,0.35)';
        ctx.fillRect(0, 0, W, H);
        const n = Math.ceil(state.phaseTimer);
        const frac = state.phaseTimer - Math.floor(state.phaseTimer);
        const bounce = 1 + Math.max(0, frac - 0.75) * 2.2;
        bigText(`RODADA ${state.round}`, '#fff', Math.floor(H * 0.06), 1, H / 2 - H * 0.2);
        bigText(String(n), ['#80ed99', '#ffd60a', '#ff7f11'][Math.min(2, n - 1)] || '#ffd60a', Math.floor(H * 0.24 * bounce), 1, H / 2, Math.sin(now / 200) * 0.06);
        return;
      }

      if (this._banner) {
        const b = this._banner;
        b.life -= dt;
        if (b.life <= 0) this._banner = null;
        else {
          const t = 1 - b.life / b.max;
          const pop = t < 0.12 ? t / 0.12 : 1;
          if (b.burst) X.drawBurst(ctx, W / 2, H / 2, H * 0.22 * pop, b.text, '#ffd60a', '#e63946', -0.08);
          else bigText(b.text, b.color, Math.floor(H * 0.075 * (0.6 + 0.4 * pop)), Math.min(1, b.life * 2), H / 2, -0.04);
        }
      }

      if ((state.phase === 2 || state.phase === 3) && state.winnerId >= 0) {
        const t = (now - this._danceStart) / 1000;
        bigText('VITÓRIA!', '#ffd60a', Math.floor(H * 0.09 * (1 + Math.max(0, 0.3 - t))), 1, H * 0.12 + Math.sin(now / 180) * 4, Math.sin(now / 300) * 0.05);
      }
    }
  };

  // ------------------------------------------------------------------ shop preview, thumbnails, portraits, maps

  function slotKey(slot) { return slot === 'bombskin' ? 'bomb' : slot; }

  window.xploditPreview = {
    draw(canvasId, look, color, facing, danceNonce) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      if (canvas._danceNonce !== undefined && canvas._danceNonce !== danceNonce) canvas._danceStart = performance.now();
      canvas._danceNonce = danceNonce;
      canvas._look = look;
      canvas._color = color || '#ffba08';
      canvas._facing = facing || 2;
      if (canvas._raf) return;
      const ctx = canvas.getContext('2d');
      const particles = [];
      let last = performance.now(), clock = 0, n = 0;
      const render = () => {
        if (!document.body.contains(canvas)) { canvas._raf = 0; return; }
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createRadialGradient(W / 2, H * 0.75, 10, W / 2, H * 0.75, W * 0.6);
        g.addColorStop(0, 'rgba(255,214,10,0.35)');
        g.addColorStop(1, 'rgba(255,214,10,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const s = W * 0.52;
        const by = H * 0.86;
        ctx.lineJoin = 'round';
        X.oval(ctx, W / 2, by, s * 0.5, s * 0.13);
        X.fo(ctx, canvas._color, s);

        // trail preview drifting away from the feet
        const lk = canvas._look;
        const def = TRAILS[lk.items.trail];
        clock += dt;
        if (def && clock > def.every * 1.5) {
          clock = 0;
          const p = def.make({ facing: 4 }, n++);
          p.x = W / 2 / (s * 0.5) + (Math.random() - 0.5) * 0.4; p.y = by / (s * 0.5) - 0.1; p.vx = -1.2 - Math.random(); p.max = p.life;
          particles.push(p);
        }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += (p.vy || 0) * dt;
          drawParticle(ctx, p, s * 0.5);
        }

        const dance = canvas._danceStart && now - canvas._danceStart < 3200 ? (now - canvas._danceStart) / 1000 : -1;
        X.drawCharacter(ctx, W / 2, by, s, lk, { facing: dance >= 0 ? 2 : canvas._facing, now, dance, blinkSeed: 3 });
        X.drawBomb(ctx, W * 0.84, by - s * 0.14, s * 0.13, lk.items.bomb, 2, now, canvas._color, { s: s * 0.5 });
        canvas._raf = requestAnimationFrame(render);
      };
      canvas._raf = requestAnimationFrame(render);
    },

    thumbs(list, look) {
      const now = performance.now();
      for (const item of list) {
        const canvas = document.getElementById(item.canvasId);
        if (!canvas) continue;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';
        const key = slotKey(item.slot);
        const lk = { ...look, items: { ...look.items, [key]: item.id } };
        switch (key) {
          case 'hat': X.drawCharacter(ctx, W / 2, H * 1.42, W * 1.05, lk, { facing: 2, now: 1000 }); break;
          case 'hair': case 'face': case 'eyewear': X.drawCharacter(ctx, W / 2, H * 1.25, W * 1.1, lk, { facing: 2, now: 1000 }); break;
          case 'shoes': X.drawCharacter(ctx, W / 2, H * 0.8, W * 1.5, lk, { facing: 2, now: 1000 }); break;
          case 'back': X.drawCharacter(ctx, W / 2, H * 0.95, W * 0.8, lk, { facing: 1, now: 1000 }); break;
          case 'bomb': X.drawBomb(ctx, W / 2, H * 0.58, W * 0.26, item.id, 2, now, null, { s: W * 0.9 }); break;
          case 'trail': {
            const def = TRAILS[item.id];
            if (!def) { ctx.font = `${Math.floor(W * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#adb5bd'; ctx.fillText('∅', W / 2, H / 2); break; }
            for (let i = 0; i < 8; i++) {
              const p = def.make({ facing: 4 }, i * 2);
              p.max = p.life; p.life = p.life * (1 - i / 10);
              p.x = (0.15 + i * 0.1) * 2; p.y = (0.72 - Math.sin(i / 7 * Math.PI) * 0.42) * 2;
              p.shrink = false; p.size *= 1.4;
              drawParticle(ctx, p, W / 2);
            }
            break;
          }
          case 'dance': X.drawCharacter(ctx, W / 2, H * 0.95, W * 0.8, lk, { facing: 2, now: 1000, dance: 0.33 }); break;
          default: X.drawCharacter(ctx, W / 2, H * 0.95, W * 0.8, lk, { facing: 2, now: 1000 });
        }
      }
    }
  };

  window.xploditPortrait = {
    draw(canvasId, look) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      X.circle(ctx, W / 2, H / 2, W / 2 - 1); ctx.clip();
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 0, W, H);
      X.drawCharacter(ctx, W / 2, H * 1.45, W * 1.25, look, { facing: 2, now: 1000 });
      ctx.restore();
    }
  };

  window.xploditMapPreview = {
    draw(canvasId, st) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const t = Math.floor(Math.min(canvas.width / st.width, canvas.height / st.height));
      canvas.width = t * st.width;
      canvas.height = t * st.height;
      X.drawArena(ctx, st, t, 1000);
    }
  };
})();
