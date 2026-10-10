'use strict';
/* =========================================================================
   Combate: áreas de acerto, dano, morte, loot e projéteis.
   ========================================================================= */

function hitEnemiesWhere(test, mult, opts = {}) {
  const p = G.player;
  const fx = opts.fromX ?? p.x, fy = opts.fromY ?? p.y;
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead || (opts.hitSet && opts.hitSet.has(e))) continue;
    if (!test(e)) continue;
    if (!opts.ignoreWalls && !G.map.los(fx, fy, e.x, e.y)) continue;
    if (opts.hitSet) opts.hitSet.add(e);
    damageEnemy(e, p.power(mult), opts);
    n++;
  }
  for (const d of G.decor) if (!d.broken && test(d)) breakDecor(d);
  if (n && opts.gain) p.en = Math.min(p.stats.maxEn, p.en + opts.gain);
  if (n) G.hitstop = Math.max(G.hitstop, opts.hitstop ?? 0.03);
  return n;
}

function hitCircle(x, y, r, mult, opts = {}) {
  return hitEnemiesWhere((e) => dist(x, y, e.x, e.y) < r + e.r, mult, Object.assign({ fromX: x, fromY: y }, opts));
}

function hitCone(x, y, a, range, arc, mult, opts = {}) {
  return hitEnemiesWhere((e) => {
    const d = dist(x, y, e.x, e.y);
    if (d > range + e.r) return false;
    if (d < e.r + 0.4) return true;
    return Math.abs(angleDiff(a, Math.atan2(e.y - y, e.x - x))) < arc / 2 + Math.atan2(e.r, d);
  }, mult, Object.assign({ fromX: x, fromY: y }, opts));
}

function hitLine(x, y, a, len, w, mult, opts = {}) {
  const c = Math.cos(a), s = Math.sin(a);
  return hitEnemiesWhere((e) => {
    const dx = e.x - x, dy = e.y - y;
    const t = dx * c + dy * s;
    if (t < -e.r || t > len + e.r) return false;
    return Math.abs(-dx * s + dy * c) < w / 2 + e.r;
  }, mult, Object.assign({ fromX: x, fromY: y }, opts));
}

function damageEnemy(e, amount, opts = {}) {
  if (e.dead) return;
  const p = G.player;
  const crit = !opts.noCrit && Math.random() < p.stats.crit;
  const dmg = amount * (crit ? p.stats.critDmg : 1) * rand(0.9, 1.1);
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.dormant) wakeBoss();
  if (!e.aggro) alertEnemy(e);
  floatText(e.x, e.y, fmt(dmg), crit ? '#ffd23f' : '#ffffff', crit ? 19 : 13, { z: 44 * e.scale });
  const res = e.def.boss ? 0.12 : e.elite || e.unique ? 0.5 : 1;
  const fx = opts.fromX ?? p.x, fy = opts.fromY ?? p.y;
  const a = Math.atan2(e.y - fy, e.x - fx);
  if (opts.kb) { e.kbx += Math.cos(a) * opts.kb * 8 * res; e.kby += Math.sin(a) * opts.kb * 8 * res; }
  if (opts.pull) { e.kbx -= Math.cos(a) * opts.pull * 8 * res; e.kby -= Math.sin(a) * opts.pull * 8 * res; }
  if (opts.stun) e.stun = Math.max(e.stun, opts.stun * (e.def.boss ? 0.15 : e.unique ? 0.5 : 1));
  if (opts.launch && !e.def.boss) e.vz = opts.launch;
  if (p.buffs.diable) e.burn = { dps: amount * 0.3 / 3, t: 3 };
  if (p.stats.lifeSteal) p.heal(dmg * p.stats.lifeSteal, true);
  burst(e.x, e.y, 22 * e.scale, crit ? 9 : 5, { colors: crit ? ['#fff', '#ffd23f', '#ff9d2e'] : ['#fff', '#ffe9a8'], speed: 3.5, life: 0.25, size: 1.6, shape: 'spark', g: 0 });
  if (e.hp <= 0) killEnemy(e);
}

function alertEnemy(e) {
  if (e.dormant) return;
  e.aggro = true;
  for (const o of G.enemies) {
    if (!o.aggro && !o.dormant && !o.dead && dist(o.x, o.y, e.x, e.y) < 6 && G.map.los(o.x, o.y, e.x, e.y)) o.aggro = true;
  }
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const p = G.player;
  G.kills++;
  addFx({ type: 'corpse', x: e.x, y: e.y, look: e.look, face: e.face, side: e.side, dur: 1.1 });
  burst(e.x, e.y, 20 * e.scale, 12, { colors: ['#fff', '#d9d0c0', '#ffd'], speed: 3, life: 0.5, shape: 'smoke', grow: 6, g: 0 });
  Sfx.play('hit');
  p.gainXp(e.xp);

  const ilvl = e.ilvl;
  const drop = (kind, o = {}) => spawnLoot(e.x + rand(-0.6, 0.6), e.y + rand(-0.6, 0.6), kind, o);
  if (e.def.boss) {
    for (let i = 0; i < 6; i++) drop('gold', { amount: randi(40, 90) * G.ng });
    drop('meat');
    drop('item', { item: generateItem(ilvl + 1, p.cid, { rarity: 'legendary' }) });
    for (let i = 0; i < 3; i++) drop('item', { item: generateItem(ilvl + 1, p.cid, { minRarity: 'rare' }) });
    onBossDefeated(e);
    return;
  }
  if (chance(0.55)) drop('gold', { amount: Math.round(randi(e.def.gold[0], e.def.gold[1]) * (1 + (G.ng - 1) * 0.5) * (e.elite || e.unique ? 4 : 1)) });
  if (chance(e.unique ? 1 : e.elite ? 0.35 : 0.07)) drop('meat');
  if (e.unique) {
    drop('item', { item: generateItem(ilvl, p.cid, { minRarity: 'rare', bonus: 1.5 }) });
    drop('item', { item: generateItem(ilvl, p.cid, { minRarity: 'magic', bonus: 1 }) });
  } else if (e.elite) {
    drop('item', { item: generateItem(ilvl, p.cid, { minRarity: 'magic', bonus: 0.6 }) });
    if (chance(0.5)) drop('item', { item: generateItem(ilvl, p.cid, { bonus: 0.4 }) });
  } else if (chance(0.13)) {
    drop('item', { item: generateItem(ilvl, p.cid) });
  }
}

function spawnLoot(x, y, kind, o = {}) {
  if (!G.map.walkable(x, y)) { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
  const l = { id: uid(), x, y, z: 10, vz: 150, kind, amount: o.amount || 0, item: o.item || null };
  G.loot.push(l);
  if (kind === 'item' && l.item.rarity === 'legendary') { Sfx.play('legendary'); toast(`Item lendário caiu: ${l.item.name}!`, 'legendary'); }
  return l;
}

function breakDecor(d) {
  d.broken = true;
  Sfx.play('break');
  burst(d.x, d.y, 12, 16, { colors: ['#8a5a2b', '#a8743d', '#5e3b1a'], speed: 4, life: 0.8, size: 2.5 });
  const p = G.player;
  if (chance(0.4)) spawnLoot(d.x, d.y, 'gold', { amount: randi(2, 9) * G.ng });
  else if (chance(0.12)) spawnLoot(d.x, d.y, 'meat');
  else if (chance(0.08)) spawnLoot(d.x, d.y, 'item', { item: generateItem(G.map.ilvlBase, p.cid) });
}

function damagePlayer(amount, srcX, srcY) {
  const p = G.player;
  if (p.dead || p.invuln > 0) return false;
  const dmg = amount * 100 / (100 + p.stats.armor);
  p.hp -= dmg;
  p.flash = 0.15;
  floatText(p.x, p.y, fmt(dmg), '#ff5a4a', 14, { z: 50 });
  Sfx.play('hurt');
  shake(3);
  burst(p.x, p.y, 24, 6, { colors: ['#ff6b5a', '#fff'], speed: 3, life: 0.3, shape: 'spark', g: 0 });
  if (p.hp <= 0) p.die();
  return true;
}

// ---------- Projéteis ----------
function updateProjectiles(dt) {
  const p = G.player;
  for (const pr of G.projectiles) {
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (!G.map.walkable(pr.x, pr.y)) {
      pr.life = 0;
      burst(pr.x - pr.vx * dt, pr.y - pr.vy * dt, 20, 5, { colors: pr.kind === 'water' ? ['#5fc3ff', '#fff'] : ['#ccc', '#fff'], speed: 2, life: 0.3 });
      continue;
    }
    if (pr.owner === 'enemy') {
      if (!p.dead && dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r) {
        if (damagePlayer(pr.dmg, pr.x, pr.y)) pr.life = 0;
      }
    } else {
      for (const e of G.enemies) {
        if (e.dead || pr.hitSet.has(e)) continue;
        if (dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
          pr.hitSet.add(e);
          damageEnemy(e, pr.dmg, { kb: pr.kb, fromX: pr.x - pr.vx, fromY: pr.y - pr.vy });
          Sfx.play('hit');
          if (!pr.pierce) { pr.life = 0; break; }
        }
      }
      for (const d of G.decor) if (!d.broken && dist(pr.x, pr.y, d.x, d.y) < pr.r + d.r) breakDecor(d);
      if (pr.kind === 'wave' && chance(0.5)) particle({ x: pr.x, y: pr.y, z: 20, color: '#c9ffd9', life: 0.3, size: 2, vz: 0 });
    }
  }
  G.projectiles = G.projectiles.filter((pr) => pr.life > 0);
}

// ---------- Loot no chão ----------
function updateLoot(dt) {
  const p = G.player;
  for (const l of G.loot) {
    if (l.z > 0 || l.vz > 0) {
      l.vz -= 600 * dt; l.z += l.vz * dt;
      if (l.z <= 0) { l.z = 0; l.vz = Math.abs(l.vz) > 60 ? -l.vz * 0.35 : 0; }
    }
    if (p.dead) continue;
    const d = dist(l.x, l.y, p.x, p.y);
    if (l.kind === 'gold' && d < 2.2) {
      const k = Math.min(1, dt * 10);
      l.x = lerp(l.x, p.x, k); l.y = lerp(l.y, p.y, k);
      if (d < 0.5) { p.berries += l.amount; l.taken = true; Sfx.play('gold'); floatText(p.x, p.y, `+${fmt(l.amount)} ฿`, '#ffd23f', 12, { z: 55 }); }
    } else if (l.kind === 'meat' && d < 0.8) {
      p.meat++; l.taken = true; Sfx.play('pickup'); floatText(p.x, p.y, '+1 🍖', '#ffb36b', 13, { z: 55 });
    }
  }
  G.loot = G.loot.filter((l) => !l.taken);
}

function pickupItem(l) {
  const p = G.player;
  if (p.bag.length >= BAG_SIZE) { toast('Inventário cheio! (I para abrir, botão direito vende)', 'warn'); Sfx.play('nope'); return false; }
  p.bag.push(l.item);
  l.taken = true;
  G.loot = G.loot.filter((x) => x !== l);
  Sfx.play(l.item.rarity === 'legendary' ? 'legendary' : 'pickup');
  toast(`Pegou: <span style="color:${RARITIES[l.item.rarity].color}">${l.item.name}</span>`);
  UI.refreshInventory();
  saveGame();
  return true;
}
