'use strict';
/* =========================================================================
   Itens: raridades, afixos aleatórios, lendários e loot.
   ========================================================================= */

const SLOTS = ['weapon', 'head', 'body', 'ring'];
const SLOT_NAMES = { weapon: 'Arma', head: 'Cabeça', body: 'Corpo', ring: 'Acessório' };
const RARITY_RANK = { common: 0, magic: 1, rare: 2, legendary: 3 };
const RARITIES = {
  common: { name: 'Comum', color: '#d8d8d8', affixes: [0, 0], value: 1 },
  magic: { name: 'Mágico', color: '#6f95ff', affixes: [1, 2], value: 2 },
  rare: { name: 'Raro', color: '#ffd84a', affixes: [3, 4], value: 4 },
  legendary: { name: 'Lendário', color: '#ff8c1a', affixes: [2, 2], value: 10 },
};

const AFFIXES = {
  dmgPct: { label: (v) => `+${v}% de dano`, min: 4, max: 10, grow: 0.08, suffix: 'da Fúria' },
  maxHp: { label: (v) => `+${v} de vida máxima`, min: 10, max: 24, grow: 0.25, suffix: 'do Vigor' },
  maxEn: { label: (v) => `+${v} de energia máxima`, min: 6, max: 14, grow: 0.12, suffix: 'da Vontade' },
  armor: { label: (v) => `+${v} de armadura`, min: 4, max: 10, grow: 0.25, suffix: 'da Proteção' },
  crit: { label: (v) => `+${v}% de chance crítica`, min: 2, max: 5, grow: 0.05, suffix: 'da Precisão' },
  critDmg: { label: (v) => `+${v}% de dano crítico`, min: 10, max: 25, grow: 0.08, suffix: 'da Ruína' },
  atkSpd: { label: (v) => `+${v}% de velocidade de ataque`, min: 4, max: 9, grow: 0.05, suffix: 'da Rapidez' },
  moveSpd: { label: (v) => `+${v}% de velocidade de movimento`, min: 3, max: 7, grow: 0.03, suffix: 'do Vento' },
  hpRegen: { label: (v) => `+${v} de vida por segundo`, min: 1, max: 3, grow: 0.25, suffix: 'da Regeneração' },
  enRegen: { label: (v) => `+${v} de energia por segundo`, min: 1, max: 3, grow: 0.1, suffix: 'do Fôlego' },
  lifeSteal: { label: (v) => `+${v}% de roubo de vida`, min: 1, max: 3, grow: 0.04, suffix: 'do Vampiro' },
  cdr: { label: (v) => `-${v}% de recarga das habilidades`, min: 3, max: 7, grow: 0.03, suffix: 'do Foco' },
};

const BASES = {
  weapon: {
    luffy: ['Faixas de Pulso', 'Luvas de Boxe', 'Braceletes de Ferro', 'Punhos de Aço'],
    zoro: ['Katana', 'Tachi', 'Nodachi', 'Wakizashi'],
    sanji: ['Sapatos Sociais', 'Botas de Couro', 'Sapatos Reforçados', 'Botas de Cozinheiro'],
  },
  head: ['Bandana', 'Chapéu de Pirata', 'Tricórnio', 'Lenço de Cabeça', 'Boné de Marinheiro'],
  body: ['Colete', 'Camisa Havaiana', 'Casaco de Marinheiro', 'Sobretudo', 'Camisa Listrada'],
  ring: ['Anel de Prata', 'Brinco de Ouro', 'Colar de Conchas', 'Pulseira de Corda', 'Bússola Velha'],
};
const RARE_A = ['Fúria', 'Grito', 'Promessa', 'Juramento', 'Sonho', 'Destino', 'Lâmina', 'Rugido', 'Orgulho', 'Maré'];
const RARE_B = ['do Kraken', 'da Tempestade', 'do Abismo', 'do Tubarão', 'da Sereia', 'do Leviatã', 'do Rei do Mar', 'da Grand Line', 'do East Blue', 'do Calm Belt'];

const LEGENDARIES = [
  { name: 'Chapéu de Palha', slot: 'head', char: 'luffy', icon: '👒', fixed: { dmgPct: 30, maxHp: 40 }, flavor: '"Eu vou ser o Rei dos Piratas!"' },
  { name: 'Punhos do Vovô', slot: 'weapon', char: 'luffy', fixed: { dmgPct: 22, critDmg: 45 }, flavor: 'Um punho cheio de amor.' },
  { name: 'Colete do Capitão', slot: 'body', char: 'luffy', fixed: { maxHp: 55, lifeSteal: 4 }, flavor: 'Vermelho como a bandeira da aventura.' },
  { name: 'Wado Ichimonji', slot: 'weapon', char: 'zoro', fixed: { dmgPct: 25, crit: 8 }, flavor: 'A promessa feita a uma amiga de infância.' },
  { name: 'Sandai Kitetsu', slot: 'weapon', char: 'zoro', fixed: { critDmg: 60, atkSpd: 12 }, flavor: 'Uma lâmina amaldiçoada que testa seu dono.' },
  { name: 'Haramaki Verde', slot: 'body', char: 'zoro', fixed: { maxHp: 60, armor: 25 }, flavor: 'Nunca se perde... só o caminho muda de lugar.' },
  { name: 'Sapatos do Baratie', slot: 'weapon', char: 'sanji', fixed: { atkSpd: 20, dmgPct: 20 }, flavor: 'Lições do velho chef de perna de pau.' },
  { name: 'Terno do Cozinheiro', slot: 'body', char: 'sanji', fixed: { moveSpd: 12, armor: 30 }, flavor: 'Elegante até no meio da briga.' },
  { name: 'Log Pose', slot: 'ring', char: null, icon: '🧭', fixed: { moveSpd: 10, cdr: 10 }, flavor: 'Sempre aponta para a próxima ilha.' },
  { name: 'Tangerina de Bellemère', slot: 'ring', char: null, icon: '🍊', fixed: { hpRegen: 6, maxHp: 30 }, flavor: 'O sabor de casa em Cocoyasi.' },
  { name: 'Cata-vento do Genzo', slot: 'head', char: null, icon: '🎐', fixed: { armor: 30, hpRegen: 4 }, flavor: 'Para fazer a Nami sorrir de novo.' },
];

function rollAffix(key, ilvl, mul = 1) {
  const a = AFFIXES[key];
  return Math.max(1, Math.round(rand(a.min, a.max) * (1 + (ilvl - 1) * a.grow) * mul));
}

function rollRarity(bonus = 0) {
  const r = Math.random();
  if (r < 0.015 + bonus * 0.08) return 'legendary';
  if (r < 0.12 + bonus * 0.25) return 'rare';
  if (r < 0.45 + bonus * 0.3) return 'magic';
  return 'common';
}

function baseStats(it) {
  const q = rand(0.85, 1.15);
  if (it.slot === 'weapon') it.dmg = Math.round((3 + it.ilvl * 1.8) * q);
  if (it.slot === 'head') it.armor = Math.round((4 + it.ilvl * 2.2) * q);
  if (it.slot === 'body') it.armor = Math.round((7 + it.ilvl * 3.4) * q);
}

function randomAffixKeys(n, exclude = []) {
  return Object.keys(AFFIXES).filter((k) => !exclude.includes(k)).sort(() => Math.random() - 0.5).slice(0, n);
}

function generateItem(ilvl, cid, opts = {}) {
  let rarity = opts.rarity || rollRarity(opts.bonus || 0);
  if (opts.minRarity && RARITY_RANK[rarity] < RARITY_RANK[opts.minRarity]) rarity = opts.minRarity;
  if (rarity === 'legendary') {
    const pool = LEGENDARIES.filter((l) => !l.char || l.char === cid);
    return makeLegendary(pick(pool), ilvl, cid);
  }
  const slot = opts.slot || pick(SLOTS);
  const base = slot === 'weapon' ? pick(BASES.weapon[cid]) : pick(BASES[slot]);
  const it = { id: uid(), slot, rarity, base, ilvl, char: slot === 'weapon' ? cid : null, affixes: [] };
  baseStats(it);
  const [a0, a1] = RARITIES[rarity].affixes;
  const keys = randomAffixKeys(randi(a0, a1));
  it.affixes = keys.map((k) => ({ key: k, v: rollAffix(k, ilvl) }));
  if (rarity === 'common') it.name = base;
  else if (rarity === 'magic') it.name = `${base} ${AFFIXES[keys[0]].suffix}`;
  else it.name = `${pick(RARE_A)} ${pick(RARE_B)}`;
  return it;
}

function makeLegendary(L, ilvl, cid) {
  const it = {
    id: uid(), slot: L.slot, rarity: 'legendary', base: SLOT_NAMES[L.slot], name: L.name, ilvl,
    char: L.slot === 'weapon' ? cid : null, flavor: L.flavor, icon: L.icon, affixes: [],
  };
  baseStats(it);
  if (it.dmg) it.dmg = Math.round(it.dmg * 1.25);
  if (it.armor) it.armor = Math.round(it.armor * 1.25);
  const fixedKeys = Object.keys(L.fixed);
  for (const k of fixedKeys) {
    it.affixes.push({ key: k, v: Math.round(L.fixed[k] * (1 + (ilvl - 1) * AFFIXES[k].grow * 0.5)), fixed: true });
  }
  for (const k of randomAffixKeys(2, fixedKeys)) it.affixes.push({ key: k, v: rollAffix(k, ilvl) });
  return it;
}

function itemIcon(it) {
  if (it.icon) return it.icon;
  if (it.slot === 'weapon') return { luffy: '🥊', zoro: '🗡️', sanji: '👞' }[it.char] || '⚔️';
  return { head: '🎩', body: '🧥', ring: '💍' }[it.slot];
}

function sellValue(it) { return Math.round((6 + it.ilvl * 3) * RARITIES[it.rarity].value); }

function itemTooltipHTML(it, label) {
  const r = RARITIES[it.rarity];
  let h = '';
  if (label) h += `<div class="tt-label">${label}</div>`;
  h += `<div class="tt-name" style="color:${r.color}">${itemIcon(it)} ${it.name}</div>`;
  h += `<div class="tt-type">${r.name} · ${SLOT_NAMES[it.slot]} · nível ${it.ilvl}</div>`;
  if (it.dmg) h += `<div class="tt-base"><b>${it.dmg}</b> de dano base</div>`;
  if (it.armor) h += `<div class="tt-base"><b>${it.armor}</b> de armadura</div>`;
  if (it.affixes.length) {
    h += '<div class="tt-affixes">';
    for (const a of it.affixes) h += `<div class="${a.fixed ? 'fixed' : ''}">◆ ${AFFIXES[a.key].label(a.v)}</div>`;
    h += '</div>';
  }
  if (it.flavor) h += `<div class="tt-flavor">${it.flavor}</div>`;
  h += `<div class="tt-sell">Vende por ${fmt(sellValue(it))} ฿</div>`;
  return h;
}
