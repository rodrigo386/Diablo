'use strict';
/* =========================================================================
   Inimigos: Marinha, piratas, homens-peixe, os oficiais de Arlong e o
   próprio Arlong (chefe com fases).
   ========================================================================= */

const ENEMY_TYPES = {
  marine: {
    name: 'Marinheiro', hp: 42, dmg: 8, speed: 2.7, r: 0.33, xp: 16, range: 0.95, atkCd: 1.2, wind: 0.35, ai: 'melee', gold: [3, 8],
    look: { sprite: 'marine', skin: '#eec39a', hair: '#4a3020', hairStyle: 'short', hat: 'marine', top: '#f1f1f1', topStyle: 'marine', sleeves: true, pants: '#2f4f8a', weapon: 'sword', scale: 0.95 },
  },
  rifle: {
    name: 'Atirador da Marinha', hp: 32, dmg: 10, speed: 2.4, r: 0.33, xp: 19, range: 7.5, atkCd: 2.2, wind: 0.55, ai: 'ranged', gold: [4, 9],
    look: { sprite: 'rifle', skin: '#e9b98f', hair: '#2a2018', hairStyle: 'short', hat: 'marine', top: '#f1f1f1', topStyle: 'marine', sleeves: true, pants: '#2f4f8a', weapon: 'rifle', scale: 0.95 },
  },
  fishman: {
    name: 'Homem-Peixe', hp: 80, dmg: 14, speed: 3.3, r: 0.38, xp: 30, range: 1.0, atkCd: 1.1, wind: 0.3, ai: 'melee', gold: [6, 14],
    look: { sprite: 'fishman', skin: '#6fa8c9', hair: '#20303a', hairStyle: 'fin', fin: true, finColor: '#4f86a6', top: '#e8a33c', topStyle: 'hawaii', pants: '#3b3b3b', scale: 1.05 },
  },
  brute: {
    name: 'Pirata Brutamontes', hp: 170, dmg: 24, speed: 1.9, r: 0.5, xp: 50, range: 1.6, atkCd: 2.4, wind: 0.75, ai: 'brute', gold: [10, 22],
    look: { sprite: 'brute', skin: '#c98d62', hair: '#2b1a10', hairStyle: 'bald', hat: 'bandana', top: '#6b3b2a', topStyle: 'plain', belt: '#2a1a10', pants: '#4a3b2a', weapon: 'club', scale: 1.35 },
  },
  arlong: {
    name: 'Arlong', title: 'O Dente-de-Serra', hp: 2600, dmg: 26, speed: 3.0, r: 0.65, xp: 900, ai: 'boss', boss: true, gold: [0, 0],
    look: { sprite: 'arlong', skin: '#7f9fb2', hair: '#151515', hairStyle: 'arlong', face: 'shark', nose: 'saw', fin: true, finColor: '#5f7f92', top: '#efe7cf', topStyle: 'arlong', pants: '#2a2a2a', weapon: 'kiribachi', scale: 1.7 },
  },
};

const ELITE_NAMES = { marine: 'Sargento da Marinha', rifle: 'Atirador de Elite', fishman: 'Guerreiro Homem-Peixe', brute: 'Capitão Pirata' };

const UNIQUES = [
  { name: 'Hachi, o Seis Espadas', base: 'fishman', look: { sprite: 'hachi', skin: '#e89a8a', hairStyle: 'hachi', hair: '#1a1a1a', weapon: 'katana', fin: false, top: '#d8d0b8' } },
  { name: 'Kuroobi, Mestre do Karatê', base: 'fishman', look: { sprite: 'kuroobi', skin: '#5f7894', hairStyle: 'kuroobi', top: '#f2efe6', topStyle: 'plain', belt: '#111' } },
  { name: 'Chew, o Atirador de Água', base: 'rifle', look: { sprite: 'chew', skin: '#5aa0b8', hair: '#3a6a3a', hairStyle: 'fin', hat: null, fin: true, top: '#e0d07a', topStyle: 'hawaii', pants: '#333', weapon: null } },
];

class Enemy {
  constructor(typeId, x, y, opts = {}) {
    const t = ENEMY_TYPES[typeId];
    this.type = typeId;
    this.def = t;
    const ng = G.ng, prog = opts.prog || 0;
    const hpMul = (1 + 0.8 * (ng - 1)) * (1 + prog * 0.8) * (opts.hpMul || 1);
    const dmgMul = (1 + 0.5 * (ng - 1)) * (1 + prog * 0.45) * (opts.dmgMul || 1);
    this.maxHp = this.hp = t.hp * hpMul;
    this.dmg = t.dmg * dmgMul;
    this.speed = t.speed * (opts.spdMul || 1) * rand(0.92, 1.08);
    this.scale = (t.look.scale || 1) * (opts.scale || 1);
    this.r = t.r * (opts.scale || 1);
    this.look = Object.assign({}, t.look, opts.look || {}, { scale: this.scale });
    this.xp = Math.round(t.xp * (opts.xpMul || 1) * (1 + 0.6 * (ng - 1)) * (1 + prog * 0.5));
    this.ilvl = 1 + (ng - 1) * 6 + Math.round(prog * 4) + (opts.unique ? 1 : 0);
    this.name = opts.name || t.name;
    this.elite = !!opts.elite;
    this.unique = !!opts.unique;
    this.waterShot = !!opts.waterShot;
    this.x = x; this.y = y; this.z = 0; this.vz = 0;
    this.face = rand(0, TAU); this.side = 1; this.walk = 0; this.moving = false;
    this.kbx = 0; this.kby = 0; this.stun = 0; this.flash = 0; this.burn = null;
    this.aggro = false; this.dormant = false;
    this.atkT = rand(0.4, 1.4); this.wind = 0;
    this.pose = null; this.poseT = 0; this.poseDur = 1;
    this.cds = { melee: 0, charge: 3, spin: 6, spit: 4 }; this.act = null; this.phase = 1;
    this.strafe = chance(0.5) ? 1 : -1;
    this.id = uid();
    this.dead = false;
  }

  setPose(name, dur) { this.pose = name; this.poseT = 0; this.poseDur = dur; }

  drawState() {
    return {
      face: this.face, side: this.side, walk: this.walk, moving: this.moving,
      pose: this.pose, poseT: this.pose ? this.poseT / this.poseDur : 0, flash: this.flash, z: this.z,
      ring: this.unique ? '#ffb84d' : this.elite ? '#7da6ff' : null, fire: false,
    };
  }
}

function faceTo(e, x, y) { e.face = Math.atan2(y - e.y, x - e.x); }

function moveToward(e, tx, ty, sp, dt) {
  const a = Math.atan2(ty - e.y, tx - e.x);
  moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
  e.face = a;
  e.walk += dt * sp * 2.6;
  e.moving = true;
}

function chase(e, dt, sp) {
  const p = G.player, map = G.map;
  const d = dist(e.x, e.y, p.x, p.y);
  if (d < 4 && map.los(e.x, e.y, p.x, p.y)) return moveToward(e, p.x, p.y, sp, dt);
  const step = map.flowStep(e.x, e.y);
  if (step) moveToward(e, step[0], step[1], sp, dt);
  else moveToward(e, p.x, p.y, sp, dt);
}

function updateEnemy(e, dt) {
  const p = G.player, map = G.map;
  e.flash -= dt;
  e.moving = false;
  if (e.pose) { e.poseT += dt; if (e.poseT >= e.poseDur) e.pose = null; }

  if (e.burn) {
    e.burn.t -= dt;
    e.hp -= e.burn.dps * dt;
    e.burnTick = (e.burnTick || 0) + dt;
    if (e.burnTick > 0.5) {
      e.burnTick = 0;
      floatText(e.x, e.y, fmt(e.burn.dps * 0.5), '#ff9a3a', 11, { z: 40 * e.scale });
      burst(e.x, e.y, 15, 3, { colors: ['#ffcc33', '#ff7a1a'], speed: 1, life: 0.4, g: -80 });
    }
    if (e.burn.t <= 0) e.burn = null;
    if (e.hp <= 0) { killEnemy(e); return; }
  }

  if (e.z > 0 || e.vz) {
    e.vz -= 900 * dt; e.z += e.vz * dt;
    if (e.z <= 0) { e.z = 0; e.vz = 0; }
  }
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.05) {
    moveEntity(e, e.kbx * dt, e.kby * dt);
    const f = Math.exp(-8 * dt);
    e.kbx *= f; e.kby *= f;
  }
  if (e.stun > 0) { e.stun -= dt; e.wind = 0; if (!e.def.boss) e.act = null; return; }
  if (e.dormant || p.dead) return;

  const d = dist(e.x, e.y, p.x, p.y);
  if (!e.aggro) {
    if (d < 9 && map.los(e.x, e.y, p.x, p.y)) alertEnemy(e);
    else return;
  }
  e.atkT -= dt;
  const [fx] = screenDir(e.face);
  if (Math.abs(fx) > 0.15) e.side = fx > 0 ? 1 : -1;

  if (e.def.ai === 'boss') return updateBoss(e, dt, d);

  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0) enemyAttack(e);
    return;
  }

  if (e.def.ai === 'ranged') {
    const los = map.los(e.x, e.y, p.x, p.y);
    if (e.atkT <= 0 && los && d < e.def.range) {
      faceTo(e, p.x, p.y);
      e.wind = e.def.wind;
      e.setPose('aim', e.def.wind + 0.15);
      return;
    }
    if (d < 3.5 && los) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      moveToward(e, e.x + Math.cos(a), e.y + Math.sin(a), e.speed, dt);
      faceTo(e, p.x, p.y);
    } else if (d > 6 || !los) {
      chase(e, dt, e.speed);
    } else {
      const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.PI / 2) * e.strafe;
      if (moveEntity(e, Math.cos(a) * e.speed * 0.6 * dt, Math.sin(a) * e.speed * 0.6 * dt)) e.strafe *= -1;
      e.walk += dt * e.speed * 1.5; e.moving = true;
      faceTo(e, p.x, p.y);
    }
    return;
  }

  const reach = e.def.range + p.r;
  if (d < reach) {
    faceTo(e, p.x, p.y);
    if (e.atkT <= 0) {
      e.wind = e.def.wind;
      e.setPose('windup', e.def.wind);
      if (e.def.ai === 'brute') {
        e.slamX = e.x + Math.cos(e.face) * 1.1;
        e.slamY = e.y + Math.sin(e.face) * 1.1;
        addTelegraph({ shape: 'circle', x: e.slamX, y: e.slamY, r: 1.5, dur: e.def.wind });
      }
    }
  } else {
    chase(e, dt, e.speed);
  }
}

function enemyAttack(e) {
  const p = G.player;
  e.atkT = e.def.atkCd * rand(0.9, 1.15);
  switch (e.def.ai) {
    case 'melee': {
      e.setPose('swing', 0.25);
      Sfx.play('swing');
      const d = dist(e.x, e.y, p.x, p.y);
      const ang = Math.abs(angleDiff(e.face, Math.atan2(p.y - e.y, p.x - e.x)));
      if (d < e.def.range + p.r + 0.35 && ang < 1.3) damagePlayer(e.dmg, e.x, e.y);
      break;
    }
    case 'brute': {
      e.setPose('swing', 0.3);
      Sfx.play('boom');
      shake(5);
      burst(e.slamX, e.slamY, 2, 14, { colors: ['#c9b48e', '#a89472'], speed: 3, life: 0.5, shape: 'smoke', grow: 6, g: 0 });
      if (dist(e.slamX, e.slamY, p.x, p.y) < 1.5 + p.r) damagePlayer(e.dmg, e.x, e.y);
      break;
    }
    case 'ranged': {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const water = e.waterShot;
      const shots = water ? 3 : 1;
      for (let i = 0; i < shots; i++) {
        const aa = a + (i - (shots - 1) / 2) * 0.22;
        G.projectiles.push({ x: e.x + Math.cos(aa) * 0.5, y: e.y + Math.sin(aa) * 0.5, vx: Math.cos(aa) * 9, vy: Math.sin(aa) * 9, r: 0.2, dmg: e.dmg, owner: 'enemy', life: 1.4, kind: water ? 'water' : 'bullet' });
      }
      Sfx.play(water ? 'water' : 'shoot');
      burst(e.x + Math.cos(a) * 0.7, e.y + Math.sin(a) * 0.7, 24, 4, { colors: water ? ['#5fc3ff', '#fff'] : ['#ffd27a', '#fff'], speed: 2, life: 0.2, g: 0 });
      break;
    }
  }
}

// ---------- Chefe: Arlong ----------
function updateBoss(e, dt, d) {
  const p = G.player;
  const rate = e.phase === 2 ? 1.4 : 1;
  for (const k in e.cds) e.cds[k] -= dt * rate;

  if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
    e.phase = 2;
    e.speed *= 1.25;
    Sfx.play('roar'); shake(10);
    comicText(e.x, e.y, 'SHAAAA!', '#8fd3ff');
    toast('Arlong está furioso! Os homens-peixe vieram ajudar!', 'warn');
    summonFishmen(e, 3);
  }
  if (e.phase === 2 && !e.summoned2 && e.hp < e.maxHp * 0.25) { e.summoned2 = true; summonFishmen(e, 3); }

  if (e.act) {
    const A = e.act;
    A.t -= dt;
    switch (A.type) {
      case 'chargeWind':
        e.face = A.a;
        if (A.t <= 0) { e.act = { type: 'charge', t: A.len / 15, a: A.a, hit: false }; Sfx.play('dash'); }
        break;
      case 'charge': {
        e.face = A.a;
        const blocked = moveEntity(e, Math.cos(A.a) * 15 * dt, Math.sin(A.a) * 15 * dt);
        e.walk += dt * 30; e.moving = true;
        if (chance(0.6)) particle({ x: e.x, y: e.y, z: 5, color: '#c9e9ff', life: 0.4, size: 5, shape: 'smoke', grow: 8 });
        if (!A.hit && dist(e.x, e.y, p.x, p.y) < e.r + p.r + 0.3) {
          A.hit = true;
          if (damagePlayer(e.dmg * 1.6, e.x, e.y)) comicText(p.x, p.y, 'SHARK NOSE!', '#8fd3ff');
        }
        if (blocked || A.t <= 0) {
          if (blocked) { shake(8); Sfx.play('boom'); e.stun = 0.8; burst(e.x, e.y, 20, 18, { colors: ['#9b8f7a', '#ccc'], speed: 4, life: 0.6 }); }
          e.act = { type: 'recover', t: 0.4 };
        }
        break;
      }
      case 'spinWind':
        if (A.t <= 0) {
          e.setPose('spin', 0.5);
          addFx({ type: 'arc', x: e.x, y: e.y, a: 0, arc: TAU, r: 3.3, dur: 0.35, color: '#c6d4dc', glow: '#8fd3ff', dir: 1 });
          Sfx.play('slash'); shake(6);
          if (dist(e.x, e.y, p.x, p.y) < 3.3 + p.r) damagePlayer(e.dmg * 1.3, e.x, e.y);
          e.act = { type: 'recover', t: 0.5 };
        }
        break;
      case 'meleeWind':
        if (A.t <= 0) {
          e.setPose('slash', 0.3);
          addFx({ type: 'arc', x: e.x, y: e.y, a: A.a, arc: 1.8, r: 2.8, dur: 0.25, color: '#c6d4dc', glow: '#fff', dir: 1 });
          Sfx.play('slash');
          const dd = dist(e.x, e.y, p.x, p.y);
          if (dd < 2.8 + p.r && Math.abs(angleDiff(A.a, Math.atan2(p.y - e.y, p.x - e.x))) < 1.0) damagePlayer(e.dmg, e.x, e.y);
          e.act = { type: 'recover', t: 0.35 };
        }
        break;
      case 'spitWind':
        if (A.t <= 0) {
          const n = e.phase === 2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const aa = A.a + (i - (n - 1) / 2) * 0.2;
            G.projectiles.push({ x: e.x + Math.cos(aa) * 0.8, y: e.y + Math.sin(aa) * 0.8, vx: Math.cos(aa) * 10, vy: Math.sin(aa) * 10, r: 0.25, dmg: e.dmg * 0.6, owner: 'enemy', life: 1.4, kind: 'water' });
          }
          Sfx.play('water');
          e.act = { type: 'recover', t: 0.4 };
        }
        break;
      case 'recover':
        if (A.t <= 0) e.act = null;
        break;
    }
    return;
  }

  const a = Math.atan2(p.y - e.y, p.x - e.x);
  const los = G.map.los(e.x, e.y, p.x, p.y);
  if (e.cds.charge <= 0 && d > 3.5 && d < 12 && los) {
    const len = Math.min(12, d + 3);
    e.cds.charge = 7;
    e.face = a;
    e.setPose('windup', 0.85);
    addTelegraph({ shape: 'line', x: e.x, y: e.y, a, len, w: 1.5, dur: 0.85 });
    e.act = { type: 'chargeWind', t: 0.85, a, len };
  } else if (e.cds.spin <= 0 && d < 3.5) {
    e.cds.spin = 8;
    e.setPose('windup', 0.9);
    addTelegraph({ shape: 'circle', x: e.x, y: e.y, r: 3.3, dur: 0.9 });
    e.act = { type: 'spinWind', t: 0.9 };
  } else if (e.cds.spit <= 0 && d > 2.5 && d < 10 && los) {
    e.cds.spit = 5;
    e.face = a;
    e.setPose('cast', 0.5);
    comicText(e.x, e.y, 'UCHIMIZU!', '#8fd3ff');
    e.act = { type: 'spitWind', t: 0.5, a };
  } else if (d < 2.6 && e.cds.melee <= 0) {
    e.cds.melee = 1.4;
    e.face = a;
    e.setPose('windup', 0.5);
    addTelegraph({ shape: 'cone', x: e.x, y: e.y, a, r: 2.8, arc: 1.9, dur: 0.5 });
    e.act = { type: 'meleeWind', t: 0.5, a };
  } else if (d > 1.8) {
    chase(e, dt, e.speed);
  } else {
    e.face = a;
  }
}

function summonFishmen(boss, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let x = boss.x + Math.cos(a) * 2, y = boss.y + Math.sin(a) * 2;
    if (!G.map.walkable(x, y)) { x = boss.x; y = boss.y; }
    const f = new Enemy('fishman', x, y, { prog: 0.8 });
    f.aggro = true;
    G.enemies.push(f);
    burst(x, y, 5, 14, { colors: ['#5fc3ff', '#fff'], speed: 3, life: 0.5 });
  }
  Sfx.play('water');
}

function wakeBoss() {
  if (G.bossSeen || !G.boss) return;
  G.bossSeen = true;
  const b = G.boss;
  b.dormant = false;
  b.aggro = true;
  Sfx.play('roar');
  shake(8);
  UI.banner('ARLONG', 'O Dente-de-Serra — Imperador de East Blue');
  UI.showBossBar(true);
}
