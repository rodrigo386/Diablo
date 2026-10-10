'use strict';
/* =========================================================================
   Jogador: atributos, movimento WASD, mira com o mouse, habilidades,
   níveis e equipamentos.
   ========================================================================= */

const BAG_SIZE = 24;
const MAX_LEVEL = 30;
const xpToNext = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));

class Player {
  constructor(cid, save = {}) {
    this.cid = cid;
    this.def = CHARS[cid];
    this.level = save.level || 1;
    this.xp = save.xp || 0;
    this.equip = Object.assign({ weapon: null, head: null, body: null, ring: null }, save.equip || {});
    this.bag = save.bag || [];
    this.berries = save.berries || 0;
    this.meat = save.meat ?? 3;
    this.x = 0; this.y = 0; this.z = 0; this.r = 0.35;
    this.face = 0.8; this.aim = 0; this.side = 1; this.walk = 0; this.moving = false;
    this.tx = 0; this.ty = 0;
    this.cds = {}; this.buffs = {};
    this.pose = null; this.poseT = 0; this.poseDur = 1;
    this.channel = 0; this.channelMove = 0.35; this.slowT = 0;
    this.dash = null; this.jump = null;
    this.invuln = 0; this.flash = 0; this.attackFace = 0; this.combo = 0;
    this.dead = false; this.fxT = 0;
    this.recalc();
    this.hp = this.stats.maxHp;
    this.en = this.stats.maxEn;
  }

  recalc() {
    const b = this.def.base, L = this.level - 1;
    const st = {
      maxHp: b.maxHp + L * 14, maxEn: b.maxEn + L * 3, dmg: b.dmg + L * 1.6, armor: b.armor + L * 2,
      crit: b.crit, critDmg: b.critDmg, atkSpd: b.atkSpd, moveSpd: b.moveSpd,
      hpRegen: b.hpRegen + L * 0.25, enRegen: b.enRegen, lifeSteal: 0, cdr: 0, dmgMul: 1,
    };
    let dmgPct = 0, movePct = 0;
    for (const slot of SLOTS) {
      const it = this.equip[slot];
      if (!it) continue;
      if (it.dmg) st.dmg += it.dmg;
      if (it.armor) st.armor += it.armor;
      for (const af of it.affixes) {
        const v = af.v;
        switch (af.key) {
          case 'dmgPct': dmgPct += v / 100; break;
          case 'maxHp': st.maxHp += v; break;
          case 'maxEn': st.maxEn += v; break;
          case 'armor': st.armor += v; break;
          case 'crit': st.crit += v / 100; break;
          case 'critDmg': st.critDmg += v / 100; break;
          case 'atkSpd': st.atkSpd += v / 100; break;
          case 'moveSpd': movePct += v / 100; break;
          case 'hpRegen': st.hpRegen += v; break;
          case 'enRegen': st.enRegen += v; break;
          case 'lifeSteal': st.lifeSteal += v / 100; break;
          case 'cdr': st.cdr += v / 100; break;
        }
      }
    }
    st.dmg *= 1 + dmgPct;
    st.moveSpd *= 1 + Math.min(movePct, 0.6);
    for (const k in this.buffs) {
      const bd = BUFFS[k];
      if (bd.dmg) st.dmgMul *= bd.dmg;
      if (bd.atkSpd) st.atkSpd += bd.atkSpd;
      if (bd.moveSpd) st.moveSpd *= 1 + bd.moveSpd;
    }
    st.cdr = Math.min(st.cdr, 0.5);
    st.crit = Math.min(st.crit, 0.75);
    st.lifeSteal = Math.min(st.lifeSteal, 0.2);
    this.stats = st;
    if (this.hp !== undefined) {
      this.hp = Math.min(this.hp, st.maxHp);
      this.en = Math.min(this.en, st.maxEn);
    }
  }

  power(mult) { return this.stats.dmg * this.stats.dmgMul * mult; }
  setPose(name, dur) { this.pose = name; this.poseT = 0; this.poseDur = dur; }
  addBuff(k, dur) { this.buffs[k] = dur; this.recalc(); }
  skinNow() { return this.buffs.gear2 ? '#f39a9a' : this.def.look.skin; }

  heal(n, silent) {
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    if (!silent && this.hp - before >= 1) floatText(this.x, this.y, `+${fmt(this.hp - before)}`, '#6bff7a', 15, { z: 55 });
  }

  gainXp(n) {
    if (this.level >= MAX_LEVEL) return;
    this.xp += n;
    while (this.xp >= xpToNext(this.level) && this.level < MAX_LEVEL) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.recalc();
      this.hp = this.stats.maxHp;
      this.en = this.stats.maxEn;
      Sfx.play('level');
      comicText(this.x, this.y, `NÍVEL ${this.level}!`, '#ffe14d');
      burst(this.x, this.y, 10, 40, { colors: ['#ffe14d', '#fff', '#ffb13b'], speed: 3, life: 1, g: -80, vzMin: 60, vzMax: 200 });
      addFx({ type: 'ring', x: this.x, y: this.y, r0: 0.2, r1: 3, dur: 0.6, color: '#ffe14d', w: 6 });
      for (const k of ['lmb', 'rmb', 'q', 'e', 'r']) {
        const s = this.def.skills[k];
        if (s.unlock === this.level) toast(`Nova habilidade: <b>${s.name}</b> (${SKILL_KEYS[k]})`, 'legendary');
      }
      saveGame();
    }
  }

  die() {
    this.dead = true;
    this.hp = 0;
    this.channel = 0; this.dash = null; this.jump = null;
    Sfx.play('death');
    addFx({ type: 'corpse', x: this.x, y: this.y, look: this.def.look, face: this.face, side: this.side, dur: 1.6 });
    after(1.6, () => UI.showDeath());
  }

  startDash(a, d, dur, opts = {}) {
    this.dash = { vx: (Math.cos(a) * d) / dur, vy: (Math.sin(a) * d) / dur, t: dur, opts, hitSet: new Set() };
    this.face = a;
    this.invuln = Math.max(this.invuln, dur + 0.05);
  }

  startJump(tx, ty, dur, onLand) {
    this.jump = { sx: this.x, sy: this.y, tx, ty, t: 0, dur, onLand };
    this.invuln = Math.max(this.invuln, dur + 0.1);
    this.face = Math.atan2(ty - this.y, tx - this.x);
  }

  update(dt) {
    if (this.dead) return;
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt * (k !== 'dash' && k !== 'meat' && this.buffs.gear2 ? 1.4 : 1));
    let changed = false;
    for (const k in this.buffs) {
      this.buffs[k] -= dt;
      if (this.buffs[k] <= 0) { delete this.buffs[k]; changed = true; toast(`${BUFFS[k].name} acabou.`); }
    }
    if (changed) this.recalc();
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash -= dt;
    this.channel = Math.max(0, this.channel - dt);
    this.slowT -= dt;
    this.attackFace -= dt;
    if (this.pose) { this.poseT += dt; if (this.poseT >= this.poseDur) this.pose = null; }

    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.hpRegen * dt);
    this.en = Math.min(this.stats.maxEn, this.en + this.stats.enRegen * dt);

    // Mira: compensa a altura do corpo para mirar "no torso" de quem está sob o cursor
    const [mx, my] = toWorld(Input.mx, Input.my + 18);
    this.tx = mx; this.ty = my;
    this.aim = Math.atan2(my - this.y, mx - this.x);

    this.moving = false;
    if (this.dash) {
      const d = this.dash;
      moveEntity(this, d.vx * dt, d.vy * dt);
      if (d.opts.onStep) d.opts.onStep(d);
      if (chance(0.7)) particle({ x: this.x, y: this.y, z: 20, color: 'rgba(255,255,255,0.6)', life: 0.25, size: 5, shape: 'smoke', grow: 10 });
      d.t -= dt;
      if (d.t <= 0) { this.dash = null; if (d.opts.onEnd) d.opts.onEnd(d); }
    } else if (this.jump) {
      const j = this.jump;
      j.t += dt;
      const u = Math.min(1, j.t / j.dur);
      moveEntity(this, lerp(j.sx, j.tx, u) - this.x, lerp(j.sy, j.ty, u) - this.y);
      this.z = Math.sin(Math.PI * u) * 70;
      if (u >= 1) { this.z = 0; this.jump = null; j.onLand(); }
    } else {
      let ix = 0, iy = 0;
      if (Input.down('KeyW', 'ArrowUp')) { ix -= 1; iy -= 1; }
      if (Input.down('KeyS', 'ArrowDown')) { ix += 1; iy += 1; }
      if (Input.down('KeyA', 'ArrowLeft')) { ix -= 1; iy += 1; }
      if (Input.down('KeyD', 'ArrowRight')) { ix += 1; iy -= 1; }
      const len = Math.hypot(ix, iy);
      if (len > 0) {
        ix /= len; iy /= len;
        let sp = this.stats.moveSpd;
        if (this.channel > 0) sp *= this.channelMove;
        else if (this.slowT > 0) sp *= 0.6;
        moveEntity(this, ix * sp * dt, iy * sp * dt);
        this.walk += dt * sp * 2.6;
        this.moving = true;
        this.moveDir = Math.atan2(iy, ix);
        if (this.attackFace <= 0 && this.channel <= 0) this.face = this.moveDir;
      }
    }
    this.pushOutOfDecor();
    if (this.attackFace > 0 || this.channel > 0) this.face = this.aim;

    const [fx] = screenDir(this.face);
    if (Math.abs(fx) > 0.15) this.side = fx > 0 ? 1 : -1;

    this.handleSkills();
    this.ambientFx(dt);
  }

  pushOutOfDecor() {
    for (const d of G.decor) {
      if (d.broken) continue;
      const dd = dist(this.x, this.y, d.x, d.y), min = this.r + d.r;
      if (dd < min && dd > 0.001) {
        const k = (min - dd) / dd;
        moveEntity(this, (this.x - d.x) * k, (this.y - d.y) * k);
      }
    }
  }

  handleSkills() {
    if (Input.hit('Space')) this.tryDash();
    if (Input.hit('Digit1')) this.eatMeat();
    if (Input.ml && !G.mouseConsumed) this.tryCast('lmb', Input.mlPressed);
    if (Input.mr) this.tryCast('rmb', Input.mrPressed);
    if (Input.down('KeyQ')) this.tryCast('q', Input.hit('KeyQ'));
    if (Input.down('KeyE')) this.tryCast('e', Input.hit('KeyE'));
    if (Input.down('KeyR')) this.tryCast('r', Input.hit('KeyR'));
  }

  tryCast(slot, fresh) {
    const s = this.def.skills[slot];
    if (this.level < s.unlock) {
      if (fresh) { toast(`${s.name} desbloqueia no nível ${s.unlock}.`, 'warn'); Sfx.play('nope'); }
      return false;
    }
    if (this.dash || this.jump || this.channel > 0) return false;
    if ((this.cds[slot] || 0) > 0) return false;
    if (this.en < s.cost) {
      if (fresh) { toast('Energia insuficiente!', 'warn'); Sfx.play('nope'); }
      return false;
    }
    this.en -= s.cost;
    this.cds[slot] = s.basic ? s.cd / this.stats.atkSpd : s.cd * (1 - this.stats.cdr);
    this.face = this.aim;
    this.attackFace = 0.35;
    if (s.basic) this.slowT = 0.2;
    s.cast(this, this.aim, this.tx, this.ty);
    return true;
  }

  tryDash() {
    if (this.dash || this.jump || (this.cds.dash || 0) > 0) return;
    const a = this.moving ? this.moveDir : this.aim;
    this.channel = 0;
    this.cds.dash = COMMON_SKILLS.dash.cd;
    this.startDash(a, 3.2, 0.18);
    Sfx.play('dash');
  }

  eatMeat() {
    if ((this.cds.meat || 0) > 0) return;
    if (this.meat <= 0) { toast('Sem carne! 🍖', 'warn'); Sfx.play('nope'); return; }
    if (this.hp >= this.stats.maxHp) { toast('Vida cheia.', 'warn'); return; }
    this.meat--;
    this.cds.meat = COMMON_SKILLS.meat.cd;
    this.heal(this.stats.maxHp * 0.5);
    Sfx.play('eat');
    burst(this.x, this.y, 30, 12, { colors: ['#6bff7a', '#c8ffcf'], speed: 2, life: 0.8, g: -60 });
  }

  ambientFx(dt) {
    this.fxT -= dt;
    if (this.fxT > 0) return;
    this.fxT = 0.05;
    if (this.buffs.gear2) particle({ x: this.x + rand(-0.3, 0.3), y: this.y + rand(-0.3, 0.3), z: rand(10, 40), vz: 40, color: '#ffe3e8', life: 0.8, size: 4, shape: 'smoke', grow: 8, drag: 1 });
    if (this.buffs.diable) particle({ x: this.x + rand(-0.25, 0.25), y: this.y + rand(-0.25, 0.25), z: rand(2, 18), vz: 60, color: pick(['#ffcc33', '#ff7a1a', '#ff3d00']), life: 0.5, size: 2.5, g: -40 });
    if (this.buffs.asura) particle({ x: this.x + rand(-0.6, 0.6), y: this.y + rand(-0.6, 0.6), z: rand(10, 50), vz: 30, color: pick(['#2a0d0d', '#5a1414']), life: 0.7, size: 5, shape: 'smoke', grow: 6 });
    if (this.cid === 'sanji' && chance(0.15)) {
      const [fx] = screenDir(this.face);
      particle({ x: this.x + fx * 0.25, y: this.y - fx * 0.25, z: 42, vz: 25, color: '#d8d8d8', life: 1.2, size: 2, shape: 'smoke', grow: 3, drag: 1 });
    }
  }

  drawState() {
    const zoroPose = this.cid === 'zoro' && (this.pose || this.channel > 0);
    let side = this.side;
    if (this.pose === 'spinkick' || (this.cid === 'zoro' && this.pose === 'spin' && this.channel > 0)) side = Math.sin(G.time * 30) > 0 ? 1 : -1;
    return {
      face: this.face, side, walk: this.walk, moving: this.moving,
      pose: this.pose, poseT: this.pose ? this.poseT / this.poseDur : 0,
      flash: this.flash, z: this.z, gear: !!this.buffs.gear2, fire: !!this.buffs.diable,
      mouthSword: zoroPose,
      alpha: this.invuln > 0 && this.dash ? 0.65 : 1,
    };
  }

  serialize() {
    return { level: this.level, xp: this.xp, equip: this.equip, bag: this.bag, berries: this.berries, meat: this.meat };
  }
}

const SKILL_KEYS = { lmb: 'Botão esquerdo', rmb: 'Botão direito', q: 'Q', e: 'E', r: 'R' };
