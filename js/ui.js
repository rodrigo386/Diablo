'use strict';
/* =========================================================================
   Interface: HUD (orbes, barra de habilidades, XP), inventário, painel do
   personagem, dicas, minimapa e telas (menu, pausa, morte, vitória).
   ========================================================================= */

const $ = (id) => document.getElementById(id);

function toast(html, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = html;
  $('toasts').appendChild(el);
  while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

const UI = {
  slots: {},
  miniCanvas: null,
  miniDirty: true,
  invOpen: false,
  charOpen: false,

  init() {
    this.buildSkillBar();
    this.buildMenu();
    $('btn-resume').onclick = () => this.togglePause(false);
    $('btn-quit').onclick = () => { saveGame(); this.showMenu(); };
    $('btn-respawn').onclick = () => respawn();
    $('btn-death-menu').onclick = () => this.showMenu();
    $('btn-next').onclick = () => nextJourney();
    $('btn-victory-menu').onclick = () => this.showMenu();
    $('btn-mute').onclick = () => { Sfx.muted = !Sfx.muted; $('btn-mute').textContent = Sfx.muted ? '🔇' : '🔊'; };
    $('inv-close').onclick = () => this.toggleInventory(false);
    $('char-close').onclick = () => this.toggleChar(false);
    this.miniCanvas = document.createElement('canvas');
    document.addEventListener('mousemove', (e) => this.moveTooltip(e));
  },

  // ---------- Telas ----------
  showScreen(id) {
    for (const s of ['menu', 'pause', 'death', 'victory']) $(s).classList.toggle('hidden', s !== id);
  },
  showMenu() {
    G.state = 'menu';
    this.showScreen('menu');
    $('hud').classList.add('hidden');
    this.toggleInventory(false); this.toggleChar(false);
    this.buildMenu();
  },
  showGame() {
    this.showScreen(null);
    $('hud').classList.remove('hidden');
    this.showBossBar(false);
    this.refreshInventory();
  },
  togglePause(on = G.state !== 'paused') {
    if (G.state !== 'play' && G.state !== 'paused') return;
    G.state = on ? 'paused' : 'play';
    this.showScreen(on ? 'pause' : null);
  },
  showDeath() {
    G.state = 'dead';
    const loss = Math.floor(G.player.berries * 0.1);
    $('death-text').textContent = `Renascer custa ${fmt(loss)} ฿ (10% dos seus Berries).`;
    this.showScreen('death');
  },
  showVictory() {
    G.state = 'victory';
    const p = G.player;
    const m = Math.floor(G.runTime / 60), s = Math.floor(G.runTime % 60);
    $('victory-stats').innerHTML = `
      <div><span>Personagem</span><b>${p.def.name}</b></div>
      <div><span>Nível</span><b>${p.level}</b></div>
      <div><span>Inimigos derrotados</span><b>${G.kills}</b></div>
      <div><span>Tempo</span><b>${m}m ${String(s).padStart(2, '0')}s</b></div>
      <div><span>Berries</span><b>${fmt(p.berries)} ฿</b></div>
      <div><span>Dificuldade</span><b>Jornada ${G.ng}</b></div>`;
    $('btn-next').textContent = `Próxima jornada (Dificuldade ${G.ng + 1}) →`;
    this.showScreen('victory');
  },

  buildMenu() {
    const save = loadSave();
    const cards = $('cards');
    cards.innerHTML = '';
    for (const cid of Object.keys(CHARS)) {
      const c = CHARS[cid], s = save.chars[cid];
      const card = document.createElement('button');
      card.className = 'card';
      card.style.setProperty('--accent', c.color);
      card.innerHTML = `
        <canvas width="220" height="200"></canvas>
        <div class="card-name">${c.name}</div>
        <div class="card-title">${c.title}</div>
        <div class="card-desc">${c.desc}</div>
        <div class="card-save">${s ? `Nível ${s.level} · Jornada ${s.ng || 1} · ${fmt(s.berries || 0)} ฿` : 'Nova aventura'}</div>`;
      card.onclick = () => { Sfx.init(); startGame(cid); };
      cards.appendChild(card);
      const cv = card.querySelector('canvas');
      const draw = (t) => {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.save();
        ctx.scale(2.6, 2.6);
        drawCharacter(ctx, 42, 72, c.look, { face: 0.35, side: 1, walk: t, moving: card.matches(':hover'), pose: null, z: 0 });
        ctx.restore();
      };
      draw(0);
      let t = 0, raf = null;
      card.onmouseenter = () => { const loop = () => { t += 0.18; draw(t); raf = requestAnimationFrame(loop); }; loop(); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); draw(0); };
    }
  },

  // ---------- HUD ----------
  buildSkillBar() {
    const bar = $('skills');
    bar.innerHTML = '';
    const defs = [['lmb', 'LMB'], ['rmb', 'RMB'], ['q', 'Q'], ['e', 'E'], ['r', 'R'], ['dash', 'Espaço'], ['meat', '1']];
    for (const [k, key] of defs) {
      const el = document.createElement('div');
      el.className = 'slot' + (k === 'dash' || k === 'meat' ? ' small' : '');
      el.innerHTML = `<span class="icon"></span><div class="cd"></div><span class="cdtext"></span><span class="key">${key}</span><span class="count"></span><span class="lock">🔒</span>`;
      el.onmouseenter = () => this.showSkillTip(k);
      el.onmouseleave = () => this.hideTooltip();
      bar.appendChild(el);
      this.slots[k] = el;
    }
  },

  setupHUD() {
    const p = G.player;
    for (const k of ['lmb', 'rmb', 'q', 'e', 'r']) this.slots[k].querySelector('.icon').textContent = p.def.skills[k].icon;
    this.slots.dash.querySelector('.icon').textContent = COMMON_SKILLS.dash.icon;
    this.slots.meat.querySelector('.icon').textContent = COMMON_SKILLS.meat.icon;
    $('info-name').textContent = p.def.name;
    $('info-name').style.color = p.def.color;
    this.miniDirty = true;
  },

  updateHUD() {
    const p = G.player;
    if (!p) return;
    const st = p.stats;
    $('orb-hp').querySelector('.orb-fill').style.height = `${clamp(p.hp / st.maxHp, 0, 1) * 100}%`;
    $('orb-hp').querySelector('span').textContent = `${fmt(Math.max(0, p.hp))}`;
    $('orb-en').querySelector('.orb-fill').style.height = `${clamp(p.en / st.maxEn, 0, 1) * 100}%`;
    $('orb-en').querySelector('span').textContent = `${fmt(p.en)}`;
    const need = xpToNext(p.level);
    $('xp-fill').style.width = `${p.level >= MAX_LEVEL ? 100 : (p.xp / need) * 100}%`;
    $('xp-text').textContent = p.level >= MAX_LEVEL ? 'Nível máximo' : `${fmt(p.xp)} / ${fmt(need)} XP`;
    $('info-level').textContent = `Nível ${p.level}`;
    $('info-berries').textContent = `${fmt(p.berries)} ฿`;
    $('info-ng').textContent = `Jornada ${G.ng}`;

    for (const k of ['lmb', 'rmb', 'q', 'e', 'r']) {
      const s = p.def.skills[k], el = this.slots[k];
      const locked = p.level < s.unlock;
      el.classList.toggle('locked', locked);
      el.classList.toggle('noen', !locked && p.en < s.cost);
      const total = s.basic ? s.cd / st.atkSpd : s.cd * (1 - st.cdr);
      this.setCd(el, p.cds[k] || 0, total);
    }
    this.setCd(this.slots.dash, p.cds.dash || 0, COMMON_SKILLS.dash.cd);
    this.setCd(this.slots.meat, p.cds.meat || 0, COMMON_SKILLS.meat.cd);
    this.slots.meat.querySelector('.count').textContent = p.meat;

    const buffs = Object.keys(p.buffs).map((k) => `<div class="buff">${BUFFS[k].icon} ${BUFFS[k].name} <b>${Math.ceil(p.buffs[k])}s</b></div>`).join('');
    if ($('buffs').innerHTML !== buffs) $('buffs').innerHTML = buffs;

    if (G.boss && G.bossSeen && !G.boss.dead) $('boss-fill').style.width = `${clamp(G.boss.hp / G.boss.maxHp, 0, 1) * 100}%`;

    const alive = G.enemies.filter((e) => !e.dead && !e.def.boss).length;
    $('objective').innerHTML = G.boss && G.boss.dead
      ? '🏴‍☠️ <b>Arlong foi derrotado!</b> Cocoyasi está livre.'
      : `🎯 Encontre e derrote <b>Arlong</b> em Arlong Park<br><small>${alive} inimigos restantes · Tab mostra/oculta o mapa</small>`;
    if (this.charOpen) this.renderStats();
  },

  setCd(el, left, total) {
    const f = total > 0 ? clamp(left / total, 0, 1) : 0;
    el.querySelector('.cd').style.height = `${f * 100}%`;
    el.querySelector('.cdtext').textContent = left > 0.5 && total > 1.5 ? Math.ceil(left) : '';
  },

  banner(big, small) {
    const b = $('banner');
    b.querySelector('.big').textContent = big;
    b.querySelector('.small').textContent = small || '';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  },

  showBossBar(on) {
    $('bossbar').classList.toggle('hidden', !on);
    if (on && G.boss) $('boss-name').textContent = `${G.boss.name} — ${G.boss.def.title}`;
  },

  // ---------- Minimapa ----------
  drawMinimap() {
    const m = G.map, p = G.player;
    if (!m || !p) return;
    const cs = 3, mw = (m.w + m.h) * cs, mh = (m.w + m.h) * cs / 2;
    const off = this.miniCanvas;
    if (this.miniDirty || m.revealDirty) {
      off.width = mw; off.height = mh;
      const c = off.getContext('2d');
      c.clearRect(0, 0, mw, mh);
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const k = m.idx(x, y);
          if (!m.explored[k]) continue;
          const t = m.tiles[k];
          if (t === T_VOID) continue;
          c.fillStyle = t === T_WALL ? 'rgba(220,200,160,0.9)' : m.style[k] === 2 ? 'rgba(90,150,170,0.55)' : 'rgba(120,100,70,0.5)';
          const sx = (x - y + m.h) * cs, sy = (x + y) * cs / 2;
          c.beginPath(); c.moveTo(sx, sy - cs / 2); c.lineTo(sx + cs, sy); c.lineTo(sx, sy + cs / 2); c.lineTo(sx - cs, sy); c.fill();
        }
      }
      this.miniDirty = false;
      m.revealDirty = false;
    }
    const mc = $('minimap'), c = mc.getContext('2d');
    c.clearRect(0, 0, mc.width, mc.height);
    const px = (p.x - p.y + m.h) * cs, py = (p.x + p.y) * cs / 2;
    const ox = mc.width / 2 - px, oy = mc.height / 2 - py;
    c.drawImage(off, ox, oy);
    for (const e of G.enemies) {
      if (e.dead || dist(e.x, e.y, p.x, p.y) > 14) continue;
      if (!m.explored[m.idx(Math.floor(e.x), Math.floor(e.y))]) continue;
      c.fillStyle = e.def.boss ? '#ff3b3b' : e.unique ? '#ffb84d' : e.elite ? '#7da6ff' : '#e04a3a';
      const s = e.def.boss ? 4 : 2;
      c.fillRect((e.x - e.y + m.h) * cs + ox - s / 2, (e.x + e.y) * cs / 2 + oy - s / 2, s, s);
    }
    if (G.bossSeen && G.boss && !G.boss.dead) {
      const b = G.boss;
      c.fillStyle = '#ff3b3b';
      c.beginPath(); c.arc((b.x - b.y + m.h) * cs + ox, (b.x + b.y) * cs / 2 + oy, 4, 0, TAU); c.fill();
    }
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(mc.width / 2, mc.height / 2, 3, 0, TAU); c.fill();
  },

  // ---------- Inventário ----------
  toggleInventory(on = !this.invOpen) {
    this.invOpen = on;
    $('inventory').classList.toggle('hidden', !on);
    if (on) this.refreshInventory();
    else this.hideTooltip();
  },
  toggleChar(on = !this.charOpen) {
    this.charOpen = on;
    $('charpanel').classList.toggle('hidden', !on);
    if (on) this.renderStats();
  },

  refreshInventory() {
    const p = G.player;
    if (!p) return;
    const eq = $('equip');
    eq.innerHTML = '';
    for (const slot of SLOTS) {
      const it = p.equip[slot];
      const el = document.createElement('div');
      el.className = 'cell equip-cell';
      el.innerHTML = it ? `<span>${itemIcon(it)}</span>` : `<small>${SLOT_NAMES[slot]}</small>`;
      if (it) {
        el.style.borderColor = RARITIES[it.rarity].color;
        el.onmouseenter = () => this.showItemTip(it, null);
        el.onmouseleave = () => this.hideTooltip();
        el.onclick = () => {
          if (p.bag.length >= BAG_SIZE) { toast('Inventário cheio!', 'warn'); return; }
          p.equip[slot] = null; p.bag.push(it); p.recalc(); this.hideTooltip(); this.refreshInventory(); saveGame();
        };
      }
      eq.appendChild(el);
    }
    const bag = $('bag');
    bag.innerHTML = '';
    for (let i = 0; i < BAG_SIZE; i++) {
      const it = p.bag[i];
      const el = document.createElement('div');
      el.className = 'cell';
      if (it) {
        el.innerHTML = `<span>${itemIcon(it)}</span>`;
        el.style.borderColor = RARITIES[it.rarity].color;
        el.style.boxShadow = it.rarity === 'legendary' ? '0 0 10px #ff8c1a88 inset' : '';
        const better = this.isUpgrade(it);
        if (better) el.innerHTML += '<i class="up">▲</i>';
        el.onmouseenter = () => this.showItemTip(it, p.equip[it.slot]);
        el.onmouseleave = () => this.hideTooltip();
        el.onclick = () => {
          const old = p.equip[it.slot];
          p.equip[it.slot] = it;
          p.bag.splice(i, 1);
          if (old) p.bag.splice(i, 0, old);
          p.recalc(); Sfx.play('pickup'); this.hideTooltip(); this.refreshInventory(); saveGame();
        };
        el.oncontextmenu = (e) => {
          e.preventDefault();
          const v = sellValue(it);
          p.berries += v; p.bag.splice(i, 1);
          Sfx.play('gold'); toast(`Vendeu ${it.name} por ${fmt(v)} ฿`);
          this.hideTooltip(); this.refreshInventory(); saveGame();
        };
      }
      bag.appendChild(el);
    }
    $('inv-berries').textContent = `${fmt(p.berries)} ฿`;
  },

  // Estimativa simples: compara um "score" do item
  isUpgrade(it) {
    const cur = G.player.equip[it.slot];
    return !cur || itemScore(it) > itemScore(cur) * 1.05;
  },

  renderStats() {
    const p = G.player, s = p.stats;
    const rows = [
      ['Nível', p.level],
      ['Vida', `${fmt(p.hp)} / ${fmt(s.maxHp)}`],
      ['Energia', `${fmt(p.en)} / ${fmt(s.maxEn)}`],
      ['Dano', fmt(s.dmg * s.dmgMul)],
      ['Armadura', `${fmt(s.armor)} (−${Math.round((1 - 100 / (100 + s.armor)) * 100)}% dano)`],
      ['Chance crítica', `${Math.round(s.crit * 100)}%`],
      ['Dano crítico', `${Math.round(s.critDmg * 100)}%`],
      ['Vel. de ataque', `${Math.round(s.atkSpd * 100)}%`],
      ['Vel. de movimento', s.moveSpd.toFixed(1)],
      ['Vida por segundo', s.hpRegen.toFixed(1)],
      ['Energia por segundo', s.enRegen.toFixed(1)],
      ['Roubo de vida', `${Math.round(s.lifeSteal * 100)}%`],
      ['Redução de recarga', `${Math.round(s.cdr * 100)}%`],
      ['Berries', `${fmt(p.berries)} ฿`],
      ['Carnes', p.meat],
    ];
    const html = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    if ($('stats').innerHTML !== html) $('stats').innerHTML = html;
  },

  // ---------- Tooltips ----------
  showItemTip(it, cmp) {
    const t = $('tooltip');
    let h = `<div class="tt-col">${itemTooltipHTML(it, cmp !== undefined && cmp !== null ? 'No inventário' : null)}<div class="tt-hint">Clique: equipar · Botão direito: vender</div></div>`;
    if (cmp) h += `<div class="tt-col equipped">${itemTooltipHTML(cmp, 'Equipado')}</div>`;
    t.innerHTML = h;
    t.classList.remove('hidden');
  },
  showSkillTip(k) {
    const p = G.player;
    if (!p) return;
    const s = p.def.skills[k] || COMMON_SKILLS[k];
    const lock = s.unlock && p.level < s.unlock ? `<div class="tt-warn">Desbloqueia no nível ${s.unlock}</div>` : '';
    const cost = s.cost ? `<div class="tt-type">Custo: ${s.cost} de energia · Recarga: ${s.cd}s</div>` : `<div class="tt-type">Recarga: ${s.cd}s</div>`;
    $('tooltip').innerHTML = `<div class="tt-col"><div class="tt-name">${s.icon} ${s.name}</div>${cost}<div class="tt-desc">${s.desc}</div>${lock}</div>`;
    $('tooltip').classList.remove('hidden');
  },
  hideTooltip() { $('tooltip').classList.add('hidden'); },
  moveTooltip(e) {
    const t = $('tooltip');
    if (t.classList.contains('hidden')) return;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 18, y = e.clientY + 18;
    if (x + w > innerWidth - 8) x = e.clientX - w - 18;
    if (y + h > innerHeight - 8) y = innerHeight - h - 8;
    t.style.left = `${Math.max(8, x)}px`;
    t.style.top = `${Math.max(8, y)}px`;
  },
};

function itemScore(it) {
  let s = (it.dmg || 0) * 3 + (it.armor || 0) * 0.8;
  for (const a of it.affixes) {
    const w = { dmgPct: 2.2, maxHp: 0.4, maxEn: 0.4, armor: 0.8, crit: 2.5, critDmg: 0.8, atkSpd: 2, moveSpd: 1.5, hpRegen: 2, enRegen: 2, lifeSteal: 3, cdr: 2 }[a.key];
    s += a.v * w;
  }
  return s;
}
