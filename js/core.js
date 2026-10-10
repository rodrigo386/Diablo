'use strict';
/* =========================================================================
   Núcleo: constantes, utilidades, câmera isométrica, entrada e áudio.
   ========================================================================= */

const HALF_W = 32;               // metade da largura de um tile isométrico (px)
const HALF_H = 16;               // metade da altura de um tile isométrico (px)
const ISO_RX = HALF_W * Math.SQRT2;
const ISO_RY = HALF_H * Math.SQRT2;
const T_VOID = 0, T_FLOOR = 1, T_WALL = 2;
const WALL_H = 34;
const TAU = Math.PI * 2;

// ---------- Utilidades ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const chance = (p) => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
let _uid = 1;
const uid = () => _uid++;

// ---------- Câmera / projeção isométrica ----------
const View = {
  canvas: null, ctx: null, dpr: 1, zoom: 1.3, w: 0, h: 0,
  camX: 0, camY: 0, shake: 0, sx: 0, sy: 0,
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(innerWidth * this.dpr);
    this.canvas.height = Math.floor(innerHeight * this.dpr);
    this.zoom = clamp(Math.min(innerWidth / 1280, innerHeight / 760) * 1.3, 0.8, 2);
    this.w = innerWidth / this.zoom;
    this.h = innerHeight / this.zoom;
  },
};

// Mundo (x, y em tiles; z em px para cima) -> tela (px lógicos)
function toScreen(x, y, z = 0) {
  return [
    (x - y - View.camX + View.camY) * HALF_W + View.w / 2 + View.sx,
    (x + y - View.camX - View.camY) * HALF_H - z + View.h / 2 + View.sy,
  ];
}
// Tela -> mundo (no chão, z = 0)
function toWorld(sx, sy) {
  const dx = (sx - View.w / 2 - View.sx) / HALF_W;
  const dy = (sy - View.h / 2 - View.sy) / HALF_H;
  return [(dx + dy) / 2 + View.camX, (dy - dx) / 2 + View.camY];
}

// ---------- Entrada ----------
const Input = {
  keys: new Set(), pressed: new Set(),
  mx: 0, my: 0, ml: false, mr: false, mlPressed: false, mrPressed: false,
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      Sfx.init();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.ml = this.mr = false; });
    addEventListener('mousemove', (e) => { this.mx = e.clientX / View.zoom; this.my = e.clientY / View.zoom; });
    canvas.addEventListener('mousedown', (e) => {
      Sfx.init();
      if (e.button === 0) { this.ml = true; this.mlPressed = true; }
      if (e.button === 2) { this.mr = true; this.mrPressed = true; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.ml = false;
      if (e.button === 2) this.mr = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
  },
  down(...codes) { return codes.some((c) => this.keys.has(c)); },
  hit(code) { return this.pressed.has(code); },
  endFrame() { this.pressed.clear(); this.mlPressed = this.mrPressed = false; },
};

// ---------- Áudio sintetizado (sem arquivos externos) ----------
const Sfx = {
  ac: null, master: null, noiseBuf: null, muted: false, last: {},
  init() {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ac.destination);
      const len = this.ac.sampleRate;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ac = null; }
  },
  tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
    const ac = this.ac, t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, type = 'lowpass', delay = 0) {
    const ac = this.ac, t = ac.currentTime + delay;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.noiseBuf;
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name) {
    if (!this.ac || this.muted) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    switch (name) {
      case 'swing': this.noise(0.12, 0.22, 2600, 'highpass'); break;
      case 'punch': this.tone(170, 0.12, 'sine', 0.5, 50); this.noise(0.06, 0.25, 1300); break;
      case 'hit': this.tone(120, 0.1, 'triangle', 0.3, 60); this.noise(0.05, 0.18, 3000); break;
      case 'slash': this.noise(0.16, 0.3, 4200, 'bandpass'); this.tone(1100, 0.08, 'sawtooth', 0.04, 300); break;
      case 'kick': this.tone(210, 0.1, 'square', 0.12, 70); this.noise(0.07, 0.25, 1500); break;
      case 'boom': this.tone(85, 0.5, 'sine', 0.7, 30); this.noise(0.45, 0.45, 500); break;
      case 'shoot': this.noise(0.09, 0.3, 1800); this.tone(520, 0.05, 'square', 0.06, 200); break;
      case 'water': this.noise(0.25, 0.22, 2400, 'bandpass'); break;
      case 'hurt': this.tone(230, 0.15, 'sawtooth', 0.14, 110); break;
      case 'gold': this.tone(1250, 0.06, 'triangle', 0.14); this.tone(1650, 0.08, 'triangle', 0.14, null, 0.05); break;
      case 'pickup': this.tone(520, 0.07, 'square', 0.08); this.tone(780, 0.09, 'square', 0.08, null, 0.06); break;
      case 'legendary': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.16, null, i * 0.07)); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, null, i * 0.09)); break;
      case 'eat': this.noise(0.08, 0.3, 900); this.noise(0.08, 0.3, 900, 'lowpass', 0.12); this.tone(600, 0.15, 'sine', 0.12, 900, 0.2); break;
      case 'break': this.noise(0.22, 0.35, 900); this.tone(140, 0.1, 'triangle', 0.2, 80); break;
      case 'dash': this.noise(0.16, 0.2, 1500, 'bandpass'); break;
      case 'fire': this.noise(0.35, 0.18, 700); break;
      case 'buff': this.tone(300, 0.45, 'sawtooth', 0.1, 900); this.noise(0.4, 0.15, 3000, 'highpass'); break;
      case 'roar': this.tone(95, 0.9, 'sawtooth', 0.22, 45); this.noise(0.8, 0.25, 400); break;
      case 'death': this.tone(300, 0.6, 'sawtooth', 0.15, 60); break;
      case 'nope': this.tone(160, 0.1, 'square', 0.06); break;
    }
  },
};
