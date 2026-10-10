'use strict';
/* =========================================================================
   Desenho: personagens (feitos por código ou sprites opcionais), tiles,
   paredes, objetos, loot e projéteis.
   ========================================================================= */

// ---------- Sprites opcionais ----------
// Coloque imagens PNG (fundo transparente, personagem olhando para a DIREITA)
// em assets/sprites/<nome>.png e liste o nome em assets/sprites/sprites.js.
// O sprite substitui o desenho feito por código. Veja assets/sprites/LEIA-ME.md.
const SPRITE_NAMES = ['luffy', 'zoro', 'sanji', 'marine', 'rifle', 'fishman', 'brute', 'arlong', 'hachi', 'kuroobi', 'chew'];
const Sprites = {};
function loadSprites() {
  const list = (window.CUSTOM_SPRITES || []).filter((n) => SPRITE_NAMES.includes(n));
  for (const name of list) {
    const img = new Image();
    img.onload = () => { Sprites[name] = img; };
    img.src = `assets/sprites/${name}.png`;
  }
}

function drawCharacter(ctx, sx, sy, look, st) {
  const img = look.sprite && Sprites[look.sprite];
  if (img) drawSprite(ctx, sx, sy, img, look, st);
  else drawHumanoid(ctx, sx, sy, look, st);
}

function drawSprite(ctx, sx, sy, img, look, st) {
  const s = look.scale || 1, z = st.z || 0;
  const h = 56 * s, w = (img.width / img.height) * h;
  ctx.save();
  if (st.alpha !== undefined) ctx.globalAlpha = st.alpha;
  drawShadow(ctx, sx, sy, s, z, st.ring);
  ctx.translate(sx, sy - z);
  if (st.dead) ctx.rotate(st.side * st.dead * 1.45);
  const bob = st.moving ? Math.abs(Math.sin(st.walk || 0)) * 2 : 0;
  ctx.scale(st.side, 1);
  if (st.flash > 0) ctx.filter = 'brightness(2.2)';
  ctx.drawImage(img, -w / 2, -h - bob, w, h);
  ctx.restore();
}

function drawShadow(ctx, sx, sy, s, z, ring) {
  const k = Math.max(0.4, 1 - z / 140);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy, 12 * s * k, 5.5 * s * k, 0, 0, TAU); ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 17 * s, 8 * s, 0, 0, TAU); ctx.stroke();
  }
}

// Converte o ângulo do mundo para direção na tela
function screenDir(a) {
  const fx = Math.cos(a) - Math.sin(a), fy = (Math.cos(a) + Math.sin(a)) * 0.5;
  const m = Math.hypot(fx, fy) || 1;
  return [fx / m, fy / m];
}

const OUT = '#1d140f';

function limb(ctx, x1, y1, x2, y2, w, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.stroke();
}
function blob(ctx, x, y, rx, ry, color, stroke = true) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  if (stroke) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
}

function drawWeapon(ctx, kind, hx, hy, a, s = 1) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  ctx.lineCap = 'round';
  switch (kind) {
    case 'katana':
      ctx.fillStyle = '#222'; ctx.fillRect(-6, -1.5, 6, 3);
      ctx.fillStyle = '#c9a23a'; ctx.fillRect(-0.5, -3, 2, 6);
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(24, 0); ctx.stroke();
      ctx.strokeStyle = '#eef4f8'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'sword':
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-4, -1.5, 5, 3);
      ctx.fillStyle = '#c9a23a'; ctx.fillRect(0, -3, 1.5, 6);
      ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.strokeStyle = '#d6dde2'; ctx.lineWidth = 2.4; ctx.stroke();
      break;
    case 'rifle':
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(22, 0); ctx.stroke();
      ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.strokeStyle = '#555c63'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(22, 0); ctx.stroke();
      break;
    case 'club':
      ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 0); ctx.stroke();
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 6; ctx.stroke();
      blob(ctx, 18, 0, 5, 5, '#7a5230');
      break;
    case 'kiribachi': {
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-6, -2, 8, 4);
      ctx.fillStyle = '#9aa6ad'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(34, -6); ctx.lineTo(36, 3);
      for (let i = 34; i > 3; i -= 4) { ctx.lineTo(i - 2, 7.5); ctx.lineTo(i - 4, 3.5); }
      ctx.lineTo(2, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/**
 * Desenha um personagem humanoide estilizado. Origem = pés.
 * look: skin, hair, hairStyle, hat, top, topStyle, pants, shorts, shoes, weapon, scale
 * st: face, side, walk, moving, pose, poseT (0..1), flash, alpha, z, dead, fire, mouthSword
 */
function drawHumanoid(ctx, sx, sy, L, st) {
  const s = L.scale || 1, z = st.z || 0;
  const [, ny] = screenDir(st.face || 0);
  const back = ny < -0.35;
  const pose = st.pose, pt = st.poseT || 0;
  const walk = st.walk || 0, sw = st.moving ? Math.sin(walk) : 0;

  ctx.save();
  if (st.alpha !== undefined) ctx.globalAlpha = st.alpha;
  drawShadow(ctx, sx, sy, s, z, st.ring);
  ctx.translate(sx, sy - z);
  if (st.dead) { ctx.rotate(st.side * st.dead * 1.45); }
  ctx.scale(st.side * s, s);
  if (st.flash > 0) ctx.filter = 'brightness(2.3) saturate(0.4)';
  if (pose === 'handstand') { ctx.translate(0, -24); ctx.rotate(Math.PI); ctx.translate(0, -18); }

  const skin = L.skin;
  // ----- Pernas -----
  const legColor = st.fire ? '#ff8a1e' : L.pants;
  const leg = (hx, off, kick) => {
    let fx = hx + off, fy = -1;
    if (kick) { const e = Math.sin(Math.PI * Math.min(1, pt * 1.3)); fx = hx + 4 + 15 * e; fy = -2 - 16 * e; }
    if (L.shorts) {
      const mx = lerp(hx, fx, 0.5), my = lerp(-17, fy, 0.5);
      limb(ctx, mx, my, fx, fy, 4, st.fire ? '#ffb347' : skin);
      limb(ctx, hx, -17, mx, my, 5.5, legColor);
    } else {
      limb(ctx, hx, -17, fx, fy, 5, legColor);
    }
    blob(ctx, fx + 1.5, fy, 3.6, 2.2, L.shoes || '#2a2a2a');
    if (st.fire) {
      ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = '#ffcc33';
      ctx.beginPath(); ctx.ellipse(lerp(hx, fx, 0.5), lerp(-17, fy, 0.5), 4, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  };
  const kickPose = pose === 'kick' || pose === 'spinkick';
  leg(-2.5, -sw * 5, false);
  leg(2.5, sw * 5, kickPose);

  const bob = st.moving ? Math.abs(Math.sin(walk)) * 1.4 : Math.sin(G.time * 3 + sx) * 0.4;
  ctx.translate(0, -bob);

  // ----- Posição das mãos -----
  let back_h = [-5 + sw * 3, -18], front_h = [4 - sw * 3, -18];
  let wAngle = 1.2, wBack = null;
  const sh = [3, -29], shB = [-4, -29];
  switch (pose) {
    case 'punch': { const e = Math.sin(Math.PI * Math.min(1, pt * 1.5)); front_h = [5 + 10 * e, -27]; break; }
    case 'bazooka': if (pt < 0.55) { front_h = [-9, -25]; back_h = [-11, -22]; } else { front_h = [15, -27]; back_h = [14, -22]; } break;
    case 'slash': case 'swing': {
      const a = lerp(-2.3, 1.0, easeOut(Math.min(1, pt * 1.6)));
      front_h = [sh[0] + Math.cos(a) * 11, sh[1] + Math.sin(a) * 11]; wAngle = a; break;
    }
    case 'windup': front_h = [-3, -44]; wAngle = -2.2; break;
    case 'aim': front_h = [11, -26]; back_h = [6, -25]; wAngle = 0; break;
    case 'spin': front_h = [13, -27]; back_h = [-13, -27]; wAngle = 0; wBack = Math.PI; break;
    case 'kick': case 'spinkick': front_h = [-8, -32]; back_h = [-3, -20]; break;
    case 'cast': front_h = [6, -40]; back_h = [-6, -40]; break;
  }
  const armCol = L.sleeves ? L.top : skin;
  const handColor = st.gear ? '#f39a9a' : skin;

  // Barbatana nas costas (homens-peixe)
  if (L.fin) {
    ctx.fillStyle = L.finColor || L.skin; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6, -31); ctx.lineTo(-15, -46); ctx.lineTo(-3, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // Braço de trás
  limb(ctx, shB[0], shB[1], back_h[0], back_h[1], 4, armCol);
  blob(ctx, back_h[0], back_h[1], 2.4, 2.4, handColor);
  if (wBack !== null && L.weapon) drawWeapon(ctx, L.weapon, back_h[0], back_h[1], wBack);
  if (L.weapon === 'rifle' && pose !== 'aim') drawWeapon(ctx, 'rifle', -6, -14, -1.1);

  // ----- Tronco -----
  const topCol = st.gear ? shadeTop(L.top) : L.top;
  rrect(ctx, -7, -33, 14, 17, 4, topCol);
  if (!back) {
    switch (L.topStyle) {
      case 'vest':
        ctx.fillStyle = handColor; ctx.fillRect(-0.5, -32.3, 4, 12);
        break;
      case 'suit':
        ctx.fillStyle = '#7da0dc'; ctx.beginPath(); ctx.moveTo(0, -33); ctx.lineTo(5, -33); ctx.lineTo(2.5, -24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a1a22'; ctx.fillRect(2, -31, 1.2, 7);
        break;
      case 'marine':
        ctx.fillStyle = '#2f5fb0'; ctx.beginPath(); ctx.moveTo(-1, -33); ctx.lineTo(6, -33); ctx.lineTo(2.5, -27); ctx.closePath(); ctx.fill();
        break;
      case 'arlong':
        ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(-1, -33); ctx.lineTo(6, -33); ctx.lineTo(2, -22); ctx.closePath(); ctx.fill();
        break;
    }
  } else if (L.topStyle === 'marine') {
    ctx.fillStyle = '#2f5fb0'; ctx.fillRect(-6.5, -32.5, 13, 5);
  }
  if (L.topStyle === 'hawaii' || L.topStyle === 'arlong') {
    ctx.fillStyle = L.topStyle === 'arlong' ? '#d9822b' : '#fff3';
    for (const [px, py] of [[-4, -29], [3, -21], [-2, -22], [4, -30], [-5, -19]]) { ctx.beginPath(); ctx.arc(px, py, 1.4, 0, TAU); ctx.fill(); }
  }
  if (L.sash) { ctx.fillStyle = L.sash; ctx.fillRect(-7, -19.5, 14, 3.5); }
  if (L.belt) { ctx.fillStyle = L.belt; ctx.fillRect(-7, -20, 14, 4.5); }

  // Espadas na cintura (Zoro)
  if (L.hipSwords) {
    const cols = ['#f4f4f4', '#1d1d1d', '#a3222a'];
    cols.forEach((c, i) => limb(ctx, -4 + i, -18 + i, -16 + i * 1.5, -9 + i * 2.2, 1.8, c));
  }

  // ----- Cabeça -----
  const hx = 1, hy = -40, hr = 7.5;
  if (L.neck !== false) { ctx.fillStyle = handColor; ctx.fillRect(-1.5, -35, 4, 3); }
  blob(ctx, hx, hy, hr, hr, handColor);
  if (!back) drawFace(ctx, L, hx, hy, st);
  drawHair(ctx, L, hx, hy, hr, back);
  drawHat(ctx, L, hx, hy, back);
  if (st.mouthSword && !back) drawWeapon(ctx, 'katana', hx + 3, hy + 3, -0.1);

  // ----- Braço da frente + arma -----
  limb(ctx, sh[0], sh[1], front_h[0], front_h[1], 4, armCol);
  blob(ctx, front_h[0], front_h[1], 2.5, 2.5, handColor);
  if (L.weapon && L.weapon !== 'rifle') drawWeapon(ctx, L.weapon, front_h[0], front_h[1], wAngle);
  if (L.weapon === 'rifle' && pose === 'aim') drawWeapon(ctx, 'rifle', back_h[0], back_h[1] - 1, 0);

  ctx.restore();
}

function shadeTop(c) { return c === '#d42a2a' ? '#e8504a' : c; }

function drawFace(ctx, L, hx, hy, st) {
  ctx.fillStyle = '#16100c';
  const eyeY = hy - 1;
  if (L.hairStyle !== 'sanji') { ctx.beginPath(); ctx.ellipse(hx + 0.8, eyeY, 0.9, 1.6, 0, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(hx + 4.4, eyeY, 1, 1.7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#16100c'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  if (L.face === 'luffy') {
    ctx.beginPath(); ctx.arc(hx + 3.5, hy + 2.3, 2.6, 0.1, Math.PI - 0.3); ctx.stroke();
    ctx.strokeStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(hx + 3.3, hy + 1); ctx.lineTo(hx + 5.6, hy + 1.6); ctx.stroke();
  } else if (L.face === 'zoro') {
    ctx.beginPath(); ctx.moveTo(hx + 2.2, hy - 3.6); ctx.lineTo(hx + 6, hy - 2.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 3, hy + 3.5); ctx.lineTo(hx + 6, hy + 3.2); ctx.stroke();
  } else if (L.face === 'sanji') {
    ctx.beginPath(); ctx.arc(hx + 4.6, hy - 3.6, 1.2, 0, TAU * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 3, hy + 3.4); ctx.lineTo(hx + 5.8, hy + 3.2); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(hx + 5.5, hy + 3.4); ctx.lineTo(hx + 9.5, hy + 2.6); ctx.stroke();
    ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.arc(hx + 9.8, hy + 2.5, 0.9, 0, TAU); ctx.fill();
  } else if (L.face === 'shark') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(hx + 1, hy + 3); ctx.lineTo(hx + 7, hy + 2.6);
    for (let i = 7; i > 1; i -= 1.5) { ctx.lineTo(i + hx - 0.75, hy + 4.6); ctx.lineTo(i + hx - 1.5, hy + 2.8); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(hx + 3, hy + 3.5); ctx.lineTo(hx + 5.5, hy + 3.5); ctx.stroke();
  }
  if (L.nose === 'saw') {
    ctx.fillStyle = '#8fa4ae'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 5, hy - 0.5); ctx.lineTo(hx + 24, hy + 0.8);
    for (let i = 22; i > 6; i -= 3) { ctx.lineTo(hx + i, hy - 1.6); ctx.lineTo(hx + i - 1.5, hy + 0.4); }
    ctx.lineTo(hx + 5, hy + 2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawHair(ctx, L, hx, hy, hr, back) {
  const c = L.hair;
  ctx.fillStyle = c; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
  const cap = (k = 1) => {
    ctx.beginPath();
    if (back) ctx.ellipse(hx, hy, hr + 0.6, hr + 0.6, 0, 0, TAU);
    else ctx.ellipse(hx - 0.6, hy - 1.5 * k, hr + 0.5, hr * 0.78 * k, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill(); ctx.stroke();
  };
  switch (L.hairStyle) {
    case 'luffy':
      cap();
      ctx.beginPath(); ctx.moveTo(hx - 8, hy - 2); ctx.lineTo(hx - 10, hy + 2); ctx.lineTo(hx - 6, hy + 1); ctx.lineTo(hx - 7, hy + 4); ctx.lineTo(hx - 3, hy); ctx.fill();
      break;
    case 'zoro': cap(0.85); break;
    case 'sanji':
      cap();
      if (!back) {
        ctx.beginPath(); ctx.moveTo(hx - 6, hy - 6); ctx.quadraticCurveTo(hx + 4, hy - 10, hx + 8, hy - 4);
        ctx.lineTo(hx + 3.5, hy + 2.5); ctx.lineTo(hx + 1, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      break;
    case 'short': cap(0.9); break;
    case 'fin': cap(0.7); break;
    case 'arlong':
      cap();
      ctx.beginPath(); ctx.moveTo(hx - 7, hy - 4); ctx.lineTo(hx - 13, hy - 9); ctx.lineTo(hx - 8, hy + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'hachi':
      cap(0.8);
      blob(ctx, hx - 3, hy - 9, 3, 3, c); blob(ctx, hx + 3, hy - 9, 3, 3, c);
      break;
    case 'kuroobi':
      cap(0.8);
      ctx.fillStyle = '#e7e2d6'; ctx.fillRect(hx - 7.5, hy - 4, 15, 2);
      break;
  }
}

function drawHat(ctx, L, hx, hy, back) {
  switch (L.hat) {
    case 'straw':
      blob(ctx, hx - 0.5, hy - 5, 13, 3.8, '#f0d36a');
      ctx.fillStyle = '#f0d36a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - 6.5, 7.4, 6, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c8281e'; ctx.fillRect(hx - 7.8, hy - 8.2, 14.6, 2.6);
      break;
    case 'marine':
      ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - 5, 8, 5.5, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f5fb0'; ctx.fillRect(hx - 8.3, hy - 6.5, 15.6, 2);
      if (!back) { ctx.fillStyle = '#2f5fb0'; ctx.beginPath(); ctx.ellipse(hx + 7, hy - 4.6, 4.5, 1.4, 0, 0, TAU); ctx.fill(); }
      break;
    case 'bandana':
      ctx.fillStyle = '#b8322a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - 2.5, 8, 6.5, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 8, hy - 3); ctx.lineTo(hx - 13, hy + 1); ctx.lineTo(hx - 9, hy + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
  }
}

// ---------- Cenário ----------
function drawFloorTile(ctx, cx, cy, color, style, tx, ty) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - HALF_H); ctx.lineTo(cx + HALF_W, cy); ctx.lineTo(cx, cy + HALF_H); ctx.lineTo(cx - HALF_W, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1;
  ctx.stroke();
  if (style === 1) {
    ctx.strokeStyle = 'rgba(40,20,5,0.35)';
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      const k = i / 3;
      ctx.moveTo(cx - HALF_W + HALF_W * k, cy - HALF_H * k);
      ctx.lineTo(cx + HALF_W * k, cy + HALF_H - HALF_H * k);
    }
    ctx.stroke();
  } else if (style === 3 && (tx * 7 + ty * 13) % 5 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - 6, cy - 2, 2, 2); ctx.fillRect(cx + 8, cy + 3, 2, 1.5);
  }
}

function drawWall(ctx, cx, cy, v, alpha) {
  const h = WALL_H;
  ctx.globalAlpha = alpha;
  const l = 52 + v;
  // Face esquerda
  ctx.fillStyle = `hsl(30, 12%, ${l - 16}%)`;
  ctx.beginPath(); ctx.moveTo(cx - HALF_W, cy); ctx.lineTo(cx, cy + HALF_H); ctx.lineTo(cx, cy + HALF_H - h); ctx.lineTo(cx - HALF_W, cy - h); ctx.closePath(); ctx.fill();
  // Face direita
  ctx.fillStyle = `hsl(30, 12%, ${l - 25}%)`;
  ctx.beginPath(); ctx.moveTo(cx, cy + HALF_H); ctx.lineTo(cx + HALF_W, cy); ctx.lineTo(cx + HALF_W, cy - h); ctx.lineTo(cx, cy + HALF_H - h); ctx.closePath(); ctx.fill();
  // Linhas de tijolo
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [0.33, 0.66]) {
    ctx.moveTo(cx - HALF_W, cy - h * k); ctx.lineTo(cx, cy + HALF_H - h * k); ctx.lineTo(cx + HALF_W, cy - h * k);
  }
  ctx.stroke();
  // Topo
  ctx.fillStyle = `hsl(32, 14%, ${l}%)`;
  ctx.beginPath(); ctx.moveTo(cx, cy - HALF_H - h); ctx.lineTo(cx + HALF_W, cy - h); ctx.lineTo(cx, cy + HALF_H - h); ctx.lineTo(cx - HALF_W, cy - h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDecor(ctx, d) {
  const [sx, sy] = toScreen(d.x, d.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy, 12, 5.5, 0, 0, TAU); ctx.fill();
  if (d.kind === 'barrel') {
    ctx.fillStyle = '#8a5a2b'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sx - 10, sy - 2); ctx.lineTo(sx - 11, sy - 18); ctx.lineTo(sx + 11, sy - 18); ctx.lineTo(sx + 10, sy - 2);
    ctx.ellipse(sx, sy - 2, 10, 4, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3d3d3d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy - 6, 10.5, 4, 0, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx, sy - 14, 11, 4, 0, 0, Math.PI); ctx.stroke();
    blob(ctx, sx, sy - 18, 11, 4.2, '#a8743d');
  } else {
    const h = 18, w = 13, k = 7;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    ctx.fillStyle = '#9a6b37';
    ctx.beginPath(); ctx.moveTo(sx - w, sy - k / 2); ctx.lineTo(sx, sy + k / 2 + 1); ctx.lineTo(sx, sy + k / 2 + 1 - h); ctx.lineTo(sx - w, sy - k / 2 - h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7d5429';
    ctx.beginPath(); ctx.moveTo(sx, sy + k / 2 + 1); ctx.lineTo(sx + w, sy - k / 2); ctx.lineTo(sx + w, sy - k / 2 - h); ctx.lineTo(sx, sy + k / 2 + 1 - h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b8864d';
    ctx.beginPath(); ctx.moveTo(sx, sy - k / 2 - h - k / 2 - 1); ctx.lineTo(sx + w, sy - k / 2 - h); ctx.lineTo(sx, sy + k / 2 + 1 - h); ctx.lineTo(sx - w, sy - k / 2 - h); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawLoot(ctx, l) {
  const bounce = l.z + (l.kind === 'item' ? Math.sin(G.time * 3 + l.id) * 1.5 + 3 : 0);
  const [sx, sy] = toScreen(l.x, l.y, bounce);
  const [gx, gy] = toScreen(l.x, l.y, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(gx, gy, 7, 3, 0, 0, TAU); ctx.fill();
  if (l.kind === 'gold') {
    for (let i = 0; i < Math.min(4, 1 + Math.floor(l.amount / 15)); i++) blob(ctx, sx + (i % 2) * 4 - 2, sy - i * 2.5, 4.5, 2.2, i % 2 ? '#ffd23f' : '#f5b81c');
  } else if (l.kind === 'meat') {
    limb(ctx, sx - 9, sy - 4, sx + 9, sy - 4, 2.5, '#f6f1e5');
    blob(ctx, sx - 10, sy - 4, 2.4, 2.4, '#f6f1e5'); blob(ctx, sx + 10, sy - 4, 2.4, 2.4, '#f6f1e5');
    blob(ctx, sx, sy - 5, 7.5, 5.5, '#a3501f');
    ctx.fillStyle = '#c86b30'; ctx.beginPath(); ctx.ellipse(sx - 2, sy - 7, 3.5, 2, 0, 0, TAU); ctx.fill();
  } else {
    const it = l.item, col = RARITIES[it.rarity].color;
    if (it.rarity === 'legendary' || it.rarity === 'rare') {
      const g = ctx.createLinearGradient(0, gy - 90, 0, gy);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, it.rarity === 'legendary' ? 'rgba(255,140,30,0.5)' : 'rgba(255,216,74,0.3)');
      ctx.fillStyle = g; ctx.fillRect(gx - 5, gy - 90, 10, 90);
    }
    ctx.save();
    ctx.translate(sx, sy - 8);
    ctx.rotate(0.3);
    ctx.fillStyle = '#1b1612'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.fillRect(-7, -7, 14, 14); ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(itemIcon(it), sx, sy - 8);
  }
}

function drawProjectile(ctx, p) {
  const [sx, sy] = toScreen(p.x, p.y, p.z || 22);
  switch (p.kind) {
    case 'bullet':
      ctx.fillStyle = 'rgba(255,220,120,0.4)'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, TAU); ctx.fill();
      blob(ctx, sx, sy, 2.6, 2.6, '#2c2c2c');
      break;
    case 'water':
      blob(ctx, sx, sy, 5, 5, '#5fc3ff');
      ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.arc(sx - 1.5, sy - 1.5, 1.6, 0, TAU); ctx.fill();
      break;
    case 'wave': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#c9ffd9'; ctx.shadowColor = '#5dff9a'; ctx.shadowBlur = 16;
      ctx.beginPath();
      const n = 12, arc = 2.4, r = 1.0;
      for (let i = 0; i <= n; i++) {
        const aa = a - arc / 2 + arc * i / n;
        const [x, y] = toScreen(p.x + Math.cos(aa) * r - Math.cos(a) * 0.6, p.y + Math.sin(aa) * r - Math.sin(a) * 0.6, 20);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      for (let i = n; i >= 0; i--) {
        const aa = a - arc / 2 + arc * i / n;
        const rr = r * (1 - 0.45 * Math.sin(Math.PI * i / n));
        const [x, y] = toScreen(p.x + Math.cos(aa) * rr - Math.cos(a) * 0.6, p.y + Math.sin(aa) * rr - Math.sin(a) * 0.6, 20);
        ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawBar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), h);
}
