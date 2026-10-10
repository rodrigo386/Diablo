'use strict';
/* =========================================================================
   Efeitos: timers, partículas, textos flutuantes, golpes visuais e
   marcações de ataque (telegraphs) no chão.
   ========================================================================= */

function after(delay, fn) { G.timers.push({ t: delay, fn }); }
function shake(a) { View.shake = Math.max(View.shake, a); }
function addFx(f) { f.t = 0; G.fx.push(f); return f; }
function addTelegraph(t) { t.t = 0; G.telegraphs.push(t); return t; }

function particle(o) {
  if (G.particles.length > 1600) return;
  const p = Object.assign({ z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 2, life: 0.5, size: 2, grow: 0, color: '#fff', shape: 'dot' }, o);
  p.max = p.life;
  G.particles.push(p);
}

function burst(x, y, z, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(0.3, 1) * (o.speed ?? 3);
    particle({
      x, y, z,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      vz: rand(o.vzMin ?? 20, o.vzMax ?? 120), g: o.g ?? 300,
      life: rand(0.6, 1) * (o.life || 0.5), size: rand(0.7, 1.2) * (o.size || 2),
      color: o.colors ? pick(o.colors) : '#fff', shape: o.shape || 'dot', grow: o.grow || 0, drag: o.drag ?? 2,
    });
  }
}

function floatText(x, y, text, color, size = 13, o = {}) {
  G.texts.push({
    x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: o.z ?? 40, text: String(text), color, size,
    life: o.life || 0.9, max: o.life || 0.9, vz: o.vz ?? 45, comic: !!o.comic, rot: o.comic ? rand(-0.2, 0.2) : 0,
  });
}
function comicText(x, y, text, color = '#ffe14d') { floatText(x, y, text, color, 32, { comic: true, life: 1.1, z: 75, vz: 18 }); }

function updateEffects(dt) {
  const ts = G.timers;
  G.timers = [];
  for (const t of ts) { t.t -= dt; if (t.t <= 0) t.fn(); else G.timers.push(t); }

  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < f.dur);

  for (const t of G.telegraphs) t.t += dt;
  G.telegraphs = G.telegraphs.filter((t) => t.t < t.dur);

  for (const p of G.particles) {
    p.life -= dt;
    const dr = Math.exp(-p.drag * dt);
    p.vx *= dr; p.vy *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vz -= p.g * dt; p.z += p.vz * dt;
    if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.5; p.vy *= 0.5; }
    p.size += p.grow * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);

  for (const t of G.texts) { t.life -= dt; t.z += t.vz * dt; t.vz *= Math.exp(-2.5 * dt); }
  G.texts = G.texts.filter((t) => t.life > 0);
}

// ---------- Desenho ----------
function pathWorldCircle(ctx, x, y, r, z = 0) {
  const [sx, sy] = toScreen(x, y, z);
  ctx.beginPath();
  ctx.ellipse(sx, sy, Math.max(0.1, r * ISO_RX), Math.max(0.1, r * ISO_RY), 0, 0, TAU);
}
function pathWorldPoly(ctx, pts, z = 0) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [sx, sy] = toScreen(x, y, z);
    if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
  });
  ctx.closePath();
}
function conePts(x, y, a, r, arc, n = 14) {
  const pts = [[x, y]];
  for (let i = 0; i <= n; i++) {
    const aa = a - arc / 2 + (arc * i) / n;
    pts.push([x + Math.cos(aa) * r, y + Math.sin(aa) * r]);
  }
  return pts;
}
function linePts(x, y, a, len, w) {
  const c = Math.cos(a), s = Math.sin(a), px = (-s * w) / 2, py = (c * w) / 2;
  return [[x + px, y + py], [x + c * len + px, y + s * len + py], [x + c * len - px, y + s * len - py], [x - px, y - py]];
}

function drawTelegraphs(ctx) {
  for (const t of G.telegraphs) {
    const u = clamp(t.t / t.dur, 0, 1);
    const shape = (k) => {
      if (t.shape === 'circle') pathWorldCircle(ctx, t.x, t.y, t.r * k);
      else if (t.shape === 'line') pathWorldPoly(ctx, linePts(t.x, t.y, t.a, t.len * k, t.w));
      else pathWorldPoly(ctx, conePts(t.x, t.y, t.a, t.r * k, t.arc));
    };
    ctx.fillStyle = 'rgba(200,30,20,0.18)';
    shape(1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,60,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,60,30,0.32)';
    shape(u); ctx.fill();
  }
}

function drawFx(ctx) {
  for (const f of G.fx) {
    const u = f.t / f.dur;
    ctx.save();
    switch (f.type) {
      case 'arm': drawStretchArm(ctx, f, u); break;
      case 'arc': {
        const ox = f.follow ? f.follow.x : f.x, oy = f.follow ? f.follow.y : f.y;
        const sweep = Math.min(1, u * 3.2), n = 18, dir = f.dir || 1;
        ctx.globalAlpha = (1 - Math.max(0, (u - 0.35) / 0.65)) * 0.9;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const aa = f.a + dir * (-f.arc / 2 + f.arc * (i / n) * sweep);
          const [sx, sy] = toScreen(ox + Math.cos(aa) * f.r, oy + Math.sin(aa) * f.r, f.z ?? 18);
          if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
        }
        for (let i = n; i >= 0; i--) {
          const aa = f.a + dir * (-f.arc / 2 + f.arc * (i / n) * sweep);
          const rr = f.r * (1 - 0.38 * Math.sin(Math.PI * (i / n)));
          const [sx, sy] = toScreen(ox + Math.cos(aa) * rr, oy + Math.sin(aa) * rr, f.z ?? 18);
          ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.glow || f.color; ctx.shadowBlur = 10;
        ctx.fill();
        break;
      }
      case 'ring': {
        ctx.globalAlpha = 1 - u;
        pathWorldCircle(ctx, f.x, f.y, lerp(f.r0, f.r1, easeOut(u)), f.z || 2);
        ctx.strokeStyle = f.color; ctx.lineWidth = (f.w || 4) * (1 - u) + 0.5;
        ctx.stroke();
        break;
      }
      case 'line': {
        const [x1, y1] = toScreen(f.x1, f.y1, 18), [x2, y2] = toScreen(f.x2, f.y2, 18);
        ctx.globalAlpha = 1 - u;
        ctx.lineCap = 'round';
        ctx.strokeStyle = f.color; ctx.lineWidth = 10 * (1 - u) + 1; ctx.shadowColor = f.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * (1 - u) + 0.5;
        ctx.stroke();
        break;
      }
      case 'xslash': {
        const [sx, sy] = toScreen(f.x, f.y, 22);
        const k = Math.min(1, u * 4), L = 16 * k;
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx - L, sy - L * 0.8); ctx.lineTo(sx + L, sy + L * 0.8);
        ctx.moveTo(sx + L, sy - L * 0.8); ctx.lineTo(sx - L, sy + L * 0.8);
        ctx.stroke();
        break;
      }
      case 'tornado': {
        const o = f.follow;
        const [sx, sy] = toScreen(o.x, o.y, 0);
        ctx.globalAlpha = Math.min(1, (1 - u) * 3) * 0.75;
        ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        ctx.setLineDash([22, 14]);
        for (let i = 0; i < 4; i++) {
          ctx.lineDashOffset = -G.time * 380 - i * 17;
          const k = 0.55 + i * 0.17;
          ctx.beginPath();
          ctx.ellipse(sx, sy - 8 - i * 13, f.r * ISO_RX * k, f.r * ISO_RY * k, 0, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      case 'corpse': {
        const [sx, sy] = toScreen(f.x, f.y, 0);
        drawCharacter(ctx, sx, sy, f.look, {
          face: f.face, side: f.side, dead: Math.min(1, u * 3), alpha: 1 - Math.max(0, (u - 0.6) / 0.4), walk: 0,
        });
        break;
      }
    }
    ctx.restore();
  }
}

function drawStretchArm(ctx, f, u) {
  const o = f.owner;
  const ext = Math.sin(Math.PI * Math.min(1, u)) * f.len;
  const off = 0.18 * (f.side || 1);
  const ox = o.x + Math.cos(f.a + Math.PI / 2) * off, oy = o.y + Math.sin(f.a + Math.PI / 2) * off;
  const z = 26 + (o.z || 0);
  const [x1, y1] = toScreen(ox, oy, z);
  const [x2, y2] = toScreen(ox + Math.cos(f.a) * ext, oy + Math.sin(f.a) * ext, z - 2);
  const skin = o.skinNow ? o.skinNow() : '#f2c49b';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 4.6;
  ctx.stroke();
  // Manga red do colete perto do ombro
  const mx = lerp(x1, x2, Math.min(1, 6 / Math.max(1, Math.hypot(x2 - x1, y2 - y1))));
  const my = lerp(y1, y2, Math.min(1, 6 / Math.max(1, Math.hypot(x2 - x1, y2 - y1))));
  ctx.strokeStyle = '#d42a2a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.stroke();
  // Punho
  ctx.fillStyle = skin; ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x2, y2, f.big ? 8 : 5.5, 0, TAU); ctx.fill(); ctx.stroke();
  if (u > 0.3 && u < 0.7) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x2 + 9, y2 + i * 5); ctx.lineTo(x2 + 16, y2 + i * 6); ctx.stroke();
    }
  }
}

function drawParticles(ctx) {
  for (const p of G.particles) {
    const [sx, sy] = toScreen(p.x, p.y, p.z);
    const a = clamp((p.life / p.max) * 1.6, 0, 1);
    ctx.globalAlpha = p.shape === 'smoke' ? a * 0.45 : a;
    ctx.fillStyle = p.color;
    if (p.shape === 'spark') {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - p.vx * 4, sy - p.vy * 2 + p.vz * 0.04); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.3, p.size), 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of G.texts) {
    const [sx, sy] = toScreen(t.x, t.y, t.z);
    const age = t.max - t.life;
    const pop = t.comic ? 1 + 0.8 * Math.max(0, 1 - age / 0.12) : 1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t.rot);
    ctx.scale(pop, pop);
    ctx.globalAlpha = clamp(t.life / t.max * 2.2, 0, 1);
    ctx.font = t.comic ? `${t.size}px Bangers, Impact, sans-serif` : `900 ${t.size}px Nunito, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = t.comic ? '#2a0a0a' : 'rgba(0,0,0,0.85)';
    ctx.lineWidth = t.comic ? 6 : 3;
    ctx.strokeText(t.text, 0, 0);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
}
