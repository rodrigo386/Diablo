'use strict';
/* =========================================================================
   Jogo: estado global, salvamento, criação da masmorra, loop principal e
   renderização isométrica com ordenação por profundidade.
   ========================================================================= */

const G = {
  state: 'menu', map: null, player: null, boss: null, bossSeen: false,
  enemies: [], projectiles: [], loot: [], decor: [], fx: [], particles: [], texts: [], telegraphs: [], timers: [],
  time: 0, runTime: 0, kills: 0, ng: 1, hitstop: 0, slowmo: 0, mouseConsumed: false, labelRects: [], showMap: true,
};

// ---------- Salvamento (localStorage) ----------
const SAVE_KEY = 'strawhat-slash-v1';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.chars) return s;
  } catch (e) { /* sem acesso ao armazenamento */ }
  return { chars: {} };
}
function saveGame() {
  const p = G.player;
  if (!p) return;
  try {
    const s = loadSave();
    s.chars[p.cid] = Object.assign(p.serialize(), { ng: G.ng });
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) { /* ignora */ }
}

// ---------- Fluxo da partida ----------
function startGame(cid) {
  const save = loadSave().chars[cid] || {};
  G.ng = save.ng || 1;
  G.player = new Player(cid, save);
  G.kills = 0;
  G.runTime = 0;
  newDungeon();
  UI.setupHUD();
  UI.showGame();
  G.state = 'play';
  UI.banner('ARLONG PARK', 'Derrote Arlong e liberte a vila de Cocoyasi!');
  if (!save.level) setTimeout(() => toast('WASD: mover · Mouse: mirar · LMB/RMB: atacar · Q/E/R: habilidades · Espaço: esquiva · 1: carne', ''), 1200);
}

function newDungeon() {
  Object.assign(G, { enemies: [], projectiles: [], loot: [], decor: [], fx: [], particles: [], texts: [], telegraphs: [], timers: [], bossSeen: false, boss: null });
  G.map = new Dungeon();
  G.map.ilvlBase = 1 + (G.ng - 1) * 6 + 1;
  const p = G.player, sr = G.map.startRoom;
  p.x = sr.cx; p.y = sr.cy;
  p.hp = p.stats.maxHp; p.en = p.stats.maxEn; p.dead = false; p.buffs = {}; p.cds = {}; p.recalc();
  View.camX = p.x; View.camY = p.y;
  populate();
  G.map.reveal(p.x, p.y, 9);
  UI.miniDirty = true;
}

function populate() {
  const map = G.map, start = map.startRoom, boss = map.bossRoom;
  const others = map.rooms.filter((r) => r !== start && r !== boss);
  let maxD = 1;
  for (const r of others) maxD = Math.max(maxD, dist(r.cx, r.cy, start.cx, start.cy));
  for (const r of others) r.prog = clamp(dist(r.cx, r.cy, start.cx, start.cy) / maxD, 0, 1);

  // Oficiais de Arlong nas salas mais distantes do início
  const far = others.slice().sort((a, b) => b.prog - a.prog).slice(0, 3).sort(() => Math.random() - 0.5);
  far.forEach((r, i) => {
    const u = UNIQUES[i];
    const [x, y] = map.randomPointIn(r, 2);
    G.enemies.push(new Enemy(u.base, x, y, {
      prog: r.prog, unique: true, name: u.name, look: u.look, hpMul: 5, dmgMul: 1.4, xpMul: 6, scale: 1.2, spdMul: 1.05, waterShot: u.base === 'rifle',
    }));
  });

  for (const r of others) {
    const pool = ['marine', 'marine', 'rifle'];
    if (r.prog > 0.3) pool.push('fishman', 'fishman');
    if (r.prog > 0.5) pool.push('brute');
    if (r.prog > 0.7) pool.push('fishman', 'rifle', 'brute');
    const n = randi(3, 5) + Math.floor(r.prog * 3);
    for (let i = 0; i < n; i++) {
      const [x, y] = map.randomPointIn(r);
      G.enemies.push(new Enemy(pick(pool), x, y, { prog: r.prog }));
    }
    if (chance(0.3 + r.prog * 0.25)) {
      const t = pick(pool);
      const [x, y] = map.randomPointIn(r);
      G.enemies.push(new Enemy(t, x, y, { prog: r.prog, elite: true, name: ELITE_NAMES[t], hpMul: 2.8, dmgMul: 1.35, xpMul: 3.5, scale: 1.15, spdMul: 1.1 }));
    }
    for (let i = randi(1, 4); i > 0; i--) {
      const edge = randi(0, 3);
      const x = edge === 0 ? r.x + 0.6 : edge === 1 ? r.x + r.w - 0.6 : rand(r.x + 1, r.x + r.w - 1);
      const y = edge === 2 ? r.y + 0.6 : edge === 3 ? r.y + r.h - 0.6 : rand(r.y + 1, r.y + r.h - 1);
      G.decor.push({ x, y, r: 0.35, kind: chance(0.6) ? 'barrel' : 'crate', broken: false });
    }
  }
  // Algumas caixas na praia inicial
  for (let i = 0; i < 3; i++) {
    G.decor.push({ x: start.x + 0.7 + i * 1.1, y: start.y + 0.7, r: 0.35, kind: i % 2 ? 'crate' : 'barrel', broken: false });
  }

  const b = new Enemy('arlong', boss.cx, boss.cy, { prog: 0 });
  b.ilvl = G.map.ilvlBase + 4;
  b.dormant = true;
  G.boss = b;
  G.enemies.push(b);
  for (let i = 0; i < 2; i++) {
    const [x, y] = map.randomPointIn(boss, 3);
    G.enemies.push(new Enemy('fishman', x, y, { prog: 1 }));
  }
}

function respawn() {
  const p = G.player;
  p.berries -= Math.floor(p.berries * 0.1);
  const sr = G.map.startRoom;
  p.x = sr.cx; p.y = sr.cy; p.z = 0;
  p.dead = false; p.hp = p.stats.maxHp; p.en = p.stats.maxEn; p.buffs = {}; p.recalc();
  p.invuln = 2;
  G.projectiles = []; G.telegraphs = []; G.timers = [];
  for (const e of G.enemies) { e.aggro = false; e.act = null; e.wind = 0; }
  if (G.boss && !G.boss.dead) {
    const b = G.boss, br = G.map.bossRoom;
    b.hp = b.maxHp; b.x = br.cx; b.y = br.cy; b.dormant = true; b.phase = 1; b.summoned2 = false; b.speed = b.def.speed;
    G.bossSeen = false;
    UI.showBossBar(false);
  }
  View.camX = p.x; View.camY = p.y;
  UI.showGame();
  G.state = 'play';
  saveGame();
}

function onBossDefeated(e) {
  G.slowmo = 1.2;
  shake(14);
  Sfx.play('roar');
  comicText(e.x, e.y, 'K.O.!', '#ff4a3a');
  UI.banner('VITÓRIA!', 'Arlong Park caiu. Nami está livre!');
  UI.showBossBar(false);
  saveGame();
  after(3, () => UI.showVictory());
}

function nextJourney() {
  G.ng++;
  G.kills = 0;
  G.runTime = 0;
  newDungeon();
  UI.showGame();
  G.state = 'play';
  UI.banner(`JORNADA ${G.ng}`, 'Arlong voltou mais forte... e os tesouros também!');
  saveGame();
}

// ---------- Atualização ----------
function update(dt) {
  G.time += dt;
  G.runTime += dt;
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.12; }
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.3; }

  const p = G.player, map = G.map;

  // Clique em rótulo de item = pegar
  G.mouseConsumed = false;
  if (Input.mlPressed && !p.dead) {
    for (const r of G.labelRects) {
      if (Input.mx >= r.x && Input.mx <= r.x + r.w && Input.my >= r.y && Input.my <= r.y + r.h) {
        if (dist(p.x, p.y, r.loot.x, r.loot.y) < 6) pickupItem(r.loot);
        else toast('Chegue mais perto para pegar.', 'warn');
        G.mouseConsumed = true;
        Input.ml = false;
        break;
      }
    }
  }
  if (Input.hit('KeyF') && !p.dead) {
    let best = null, bd = 1.8;
    for (const l of G.loot) {
      if (l.kind !== 'item') continue;
      const d = dist(l.x, l.y, p.x, p.y);
      if (d < bd) { bd = d; best = l; }
    }
    if (best) pickupItem(best);
  }

  p.update(dt);
  map.computeFlow(p.x, p.y);

  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  // Separação simples entre inimigos próximos
  const act = G.enemies.filter((e) => !e.dead && e.aggro);
  for (let i = 0; i < act.length; i++) {
    for (let j = i + 1; j < act.length; j++) {
      const a = act[i], b = act[j];
      const d = dist(a.x, a.y, b.x, b.y), min = a.r + b.r;
      if (d < min && d > 0.0001) {
        const push = (min - d) / 2 / d;
        const wa = a.def.boss ? 0.1 : 1, wb = b.def.boss ? 0.1 : 1;
        moveEntity(a, (a.x - b.x) * push * wa, (a.y - b.y) * push * wa);
        moveEntity(b, (b.x - a.x) * push * wb, (b.y - a.y) * push * wb);
      }
    }
  }
  G.enemies = G.enemies.filter((e) => !e.dead);

  updateProjectiles(dt);
  updateLoot(dt);
  updateEffects(dt);

  // Entrou na arena do chefe?
  if (!G.bossSeen && G.boss && !p.dead && map.roomAt(p.x, p.y) === map.bossRoom) wakeBoss();

  // Câmera
  const k = 1 - Math.exp(-10 * dt);
  View.camX = lerp(View.camX, p.x, k);
  View.camY = lerp(View.camY, p.y, k);
  View.shake = Math.max(0, View.shake - dt * 30);
  View.sx = rand(-1, 1) * View.shake;
  View.sy = rand(-1, 1) * View.shake;

  map.reveal(p.x, p.y, 9);
}

function handleGlobalKeys() {
  if (Input.hit('Escape')) {
    if (UI.invOpen || UI.charOpen) { UI.toggleInventory(false); UI.toggleChar(false); }
    else UI.togglePause();
  }
  if (G.state !== 'play') return;
  if (Input.hit('KeyI') || Input.hit('KeyB')) UI.toggleInventory();
  if (Input.hit('KeyC')) UI.toggleChar();
  if (Input.hit('Tab')) { G.showMap = !G.showMap; $('minimap').classList.toggle('hidden', !G.showMap); }
  if (Input.hit('KeyM')) $('btn-mute').click();
}

// ---------- Renderização ----------
function render() {
  const ctx = View.ctx;
  const z = View.dpr * View.zoom;
  ctx.setTransform(z, 0, 0, z, 0, 0);
  ctx.fillStyle = '#0c3a57';
  ctx.fillRect(0, 0, View.w, View.h);
  if (!G.map || !G.player) return;
  const map = G.map, p = G.player;

  // Ondas do mar (tela inteira, em coordenadas do mundo)
  drawSea(ctx);

  const cs = [toWorld(0, 0), toWorld(View.w, 0), toWorld(0, View.h + WALL_H + 60), toWorld(View.w, View.h + WALL_H + 60)];
  const x0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[0]))) - 1);
  const x1 = Math.min(map.w - 1, Math.ceil(Math.max(...cs.map((c) => c[0]))) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[1]))) - 1);
  const y1 = Math.min(map.h - 1, Math.ceil(Math.max(...cs.map((c) => c[1]))) + 1);

  const list = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const k = y * map.w + x, t = map.tiles[k];
      if (t === T_VOID) continue;
      const [cx, cy] = toScreen(x + 0.5, y + 0.5);
      if (cx < -HALF_W || cx > View.w + HALF_W || cy < -HALF_H - WALL_H || cy > View.h + HALF_H + WALL_H) continue;
      if (t === T_FLOOR) drawFloorTile(ctx, cx, cy, map.colors[k], map.style[k], x, y);
      else list.push({ d: x + y + 1, kind: 0, x, y, cx, cy, v: map.colors[k] });
    }
  }

  drawTelegraphs(ctx);

  const [psx, psy] = toScreen(p.x, p.y);
  const pd = p.x + p.y;
  for (const d of G.decor) if (!d.broken) list.push({ d: d.x + d.y, kind: 1, o: d });
  for (const l of G.loot) list.push({ d: l.x + l.y - 0.2, kind: 2, o: l });
  for (const e of G.enemies) list.push({ d: e.x + e.y, kind: 3, o: e });
  if (!p.dead) list.push({ d: pd, kind: 4, o: p });
  for (const pr of G.projectiles) list.push({ d: pr.x + pr.y, kind: 5, o: pr });
  list.sort((a, b) => a.d - b.d);

  for (const it of list) {
    switch (it.kind) {
      case 0: {
        let alpha = 1;
        if (it.d > pd + 0.5 && Math.abs(it.cx - psx) < 64 && it.cy - psy > -10 && it.cy - psy < 90) alpha = 0.35;
        drawWall(ctx, it.cx, it.cy, it.v, alpha);
        break;
      }
      case 1: drawDecor(ctx, it.o); break;
      case 2: drawLoot(ctx, it.o); break;
      case 3: drawEnemy(ctx, it.o); break;
      case 4: {
        const [sx, sy] = toScreen(p.x, p.y);
        drawCharacter(ctx, sx, sy, p.def.look, p.drawState());
        break;
      }
      case 5: drawProjectile(ctx, it.o); break;
    }
  }

  drawFx(ctx);
  drawParticles(ctx);
  drawEnemyBars(ctx);
  drawLootLabels(ctx);
  drawTexts(ctx);

  // Iluminação estilo Diablo: escurece as bordas
  const g = ctx.createRadialGradient(psx, psy - 20, 140, psx, psy - 20, Math.max(View.w, View.h) * 0.75);
  g.addColorStop(0, 'rgba(5,10,25,0)');
  g.addColorStop(1, 'rgba(5,10,25,0.68)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, View.w, View.h);
  if (p.hp < p.stats.maxHp * 0.3 && !p.dead) {
    ctx.fillStyle = `rgba(160,0,0,${0.12 + Math.sin(G.time * 6) * 0.06})`;
    ctx.fillRect(0, 0, View.w, View.h);
  }
}

function drawSea(ctx) {
  ctx.strokeStyle = 'rgba(160,215,240,0.18)';
  ctx.lineWidth = 2;
  const [wx, wy] = toWorld(View.w / 2, View.h / 2);
  const step = 3;
  const bx = Math.floor(wx / step) * step, by = Math.floor(wy / step) * step;
  ctx.beginPath();
  for (let y = by - 30; y <= by + 30; y += step) {
    for (let x = bx - 30; x <= bx + 30; x += step) {
      const h = ((x * 73856093) ^ (y * 19349663)) & 7;
      if (h > 2) continue;
      const [sx, sy] = toScreen(x + Math.sin(G.time * 0.8 + y) * 0.3, y);
      if (sx < -40 || sx > View.w + 40 || sy < -20 || sy > View.h + 20) continue;
      const o = Math.sin(G.time * 2 + x * 0.7 + y) * 3;
      ctx.moveTo(sx - 10, sy + o);
      ctx.quadraticCurveTo(sx - 5, sy - 4 + o, sx, sy + o);
      ctx.quadraticCurveTo(sx + 5, sy - 4 + o, sx + 10, sy + o);
    }
  }
  ctx.stroke();
}

function drawEnemy(ctx, e) {
  const [sx, sy] = toScreen(e.x, e.y);
  if (sx < -80 || sx > View.w + 80 || sy < -40 || sy > View.h + 120) return;
  drawCharacter(ctx, sx, sy, e.look, e.drawState());
  if (e.stun > 0 && !e.def.boss) {
    ctx.fillStyle = '#ffe14d';
    for (let i = 0; i < 3; i++) {
      const a = G.time * 6 + (i * TAU) / 3;
      ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 10, sy - 56 * e.scale - e.z + Math.sin(a) * 3, 2, 0, TAU); ctx.fill();
    }
  }
}

function drawEnemyBars(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const e of G.enemies) {
    if (e.def.boss) continue;
    const special = e.elite || e.unique;
    if (e.hp >= e.maxHp && !special) continue;
    const [sx, sy] = toScreen(e.x, e.y, 56 * e.scale + e.z);
    if (sx < -60 || sx > View.w + 60 || sy < -30 || sy > View.h + 30) continue;
    const w = special ? 46 : 30;
    drawBar(ctx, sx, sy, w, 4, e.hp / e.maxHp, e.unique ? '#ff9d2e' : '#d8382c');
    if (special) {
      ctx.font = '800 11px Nunito, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
      ctx.strokeText(e.name, sx, sy - 3);
      ctx.fillStyle = e.unique ? '#ffb84d' : '#8fb1ff';
      ctx.fillText(e.name, sx, sy - 3);
    }
  }
}

function drawLootLabels(ctx) {
  G.labelRects = [];
  ctx.font = '800 11px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of G.loot) {
    if (l.kind !== 'item') continue;
    const [sx, sy] = toScreen(l.x, l.y, 30);
    if (sx < -100 || sx > View.w + 100 || sy < -20 || sy > View.h + 20) continue;
    const w = ctx.measureText(l.item.name).width + 12, h = 16;
    let rx = sx - w / 2, ry = sy - h / 2;
    for (const r of G.labelRects) {
      if (rx < r.x + r.w && rx + w > r.x && ry < r.y + r.h && ry + h > r.y) ry = r.y - h - 2;
    }
    const hover = Input.mx >= rx && Input.mx <= rx + w && Input.my >= ry && Input.my <= ry + h;
    ctx.fillStyle = hover ? 'rgba(60,50,30,0.92)' : 'rgba(10,8,6,0.78)';
    ctx.fillRect(rx, ry, w, h);
    ctx.strokeStyle = RARITIES[l.item.rarity].color;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, w - 1, h - 1);
    ctx.fillStyle = RARITIES[l.item.rarity].color;
    ctx.fillText(l.item.name, rx + w / 2, ry + h / 2 + 0.5);
    G.labelRects.push({ x: rx, y: ry, w, h, loot: l });
  }
}

// ---------- Loop principal ----------
let lastT = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0);
  lastT = ts;
  handleGlobalKeys();
  if (G.state === 'play' || G.state === 'dead' || G.state === 'victory') {
    if (G.state === 'play') update(dt);
    else { G.time += dt; updateEffects(dt); }
    render();
    UI.updateHUD();
    if (G.showMap) UI.drawMinimap();
  } else if (G.state === 'paused') {
    render();
  } else {
    renderMenuBackground(dt);
  }
  Input.endFrame();
  requestAnimationFrame(loop);
}

function renderMenuBackground(dt) {
  G.time += dt;
  const ctx = View.ctx, z = View.dpr * View.zoom;
  ctx.setTransform(z, 0, 0, z, 0, 0);
  ctx.fillStyle = '#0c3a57';
  ctx.fillRect(0, 0, View.w, View.h);
  View.camX = G.time * 0.6; View.camY = 0;
  drawSea(ctx);
}

window.addEventListener('load', () => {
  View.init($('game'));
  Input.init($('game'));
  loadSprites();
  UI.init();
  UI.showMenu();
  window.addEventListener('beforeunload', saveGame);
  setInterval(() => { if (G.state === 'play') saveGame(); }, 20000);
  requestAnimationFrame(loop);
});
