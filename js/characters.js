'use strict';
/* =========================================================================
   Personagens jogáveis: atributos, aparência e habilidades.
   Teclas: LMB (básico), RMB, Q, E, R (suprema). Espaço = esquiva, 1 = carne.
   ========================================================================= */

const BUFFS = {
  gear2: { name: 'Gear Second', icon: '♨️', dmg: 1.5, atkSpd: 0.4, moveSpd: 0.3 },
  asura: { name: 'Asura', icon: '👺', dmg: 2.0, atkSpd: 0.25 },
  diable: { name: 'Diable Jambe', icon: '🔥', dmg: 1.6, moveSpd: 0.2 },
};

const CHARS = {
  // ------------------------------------------------------------------ LUFFY
  luffy: {
    id: 'luffy', name: 'Monkey D. Luffy', title: 'O Homem-Borracha', color: '#e63b2e',
    desc: 'Soca de longe esticando os braços. Rajadas rápidas e o explosivo Gear Second.',
    base: { maxHp: 150, maxEn: 100, dmg: 12, armor: 10, crit: 0.05, critDmg: 1.5, atkSpd: 1.0, moveSpd: 4.6, hpRegen: 1, enRegen: 9 },
    look: {
      sprite: 'luffy', skin: '#f2c49b', hair: '#1b1b1b', hairStyle: 'luffy', hat: 'straw', face: 'luffy',
      top: '#d42a2a', topStyle: 'vest', sash: '#e5c23b', pants: '#3d6fb6', shorts: true, shoes: '#c79a5b', scale: 1,
    },
    skills: {
      lmb: {
        name: 'Gomu Gomu no Pistol', icon: '👊', cost: 0, cd: 0.5, unlock: 1, basic: true,
        desc: 'Estica o braço e soca à distância. Gera energia.',
        cast(p, a) {
          p.setPose('punch', 0.25);
          p.punchSide = -(p.punchSide || 1);
          addFx({ type: 'arm', owner: p, a, len: 4.3, dur: 0.26, side: p.punchSide });
          Sfx.play('swing');
          after(0.09, () => { if (hitLine(p.x, p.y, a, 4.5, 0.8, 1.0, { kb: 0.5, gain: 6 })) Sfx.play('punch'); });
        },
      },
      rmb: {
        name: 'Gomu Gomu no Gatling', icon: '💥', cost: 22, cd: 3.5, unlock: 1,
        desc: 'Uma rajada de socos em cone. Segue a mira do mouse.',
        cast(p) {
          p.channel = 0.85; p.channelMove = 0.35;
          p.setPose('punch', 0.85);
          for (let i = 0; i < 13; i++) {
            after(i * 0.062, () => {
              if (p.dead) return;
              const aa = p.aim + rand(-0.38, 0.38);
              addFx({ type: 'arm', owner: p, a: aa, len: rand(2.8, 3.8), dur: 0.15, side: i % 2 ? 1 : -1 });
              if (hitCone(p.x, p.y, aa, 3.8, 0.55, 0.36, { kb: 0.25, hitstop: 0.01 })) Sfx.play('punch');
              p.face = p.aim;
            });
          }
        },
      },
      q: {
        name: 'Gomu Gomu no Rocket', icon: '🚀', cost: 18, cd: 5, unlock: 2,
        desc: 'Se lança como um foguete na direção do mouse, atropelando tudo no caminho.',
        cast(p, a, tx, ty) {
          const d = clamp(dist(p.x, p.y, tx, ty), 3, 7);
          p.setPose('punch', 0.3);
          Sfx.play('dash');
          p.startDash(a, d, 0.28, {
            onStep: (dd) => { if (hitCircle(p.x, p.y, 1.0, 1.7, { kb: 1.6, stun: 0.5, hitSet: dd.hitSet })) Sfx.play('punch'); },
          });
          burst(p.x, p.y, 5, 10, { colors: ['#e9dcc0', '#bfae8f'], speed: 3, life: 0.5, shape: 'smoke', grow: 6, g: 0 });
        },
      },
      e: {
        name: 'Gomu Gomu no Bazooka', icon: '🤲', cost: 28, cd: 6, unlock: 3,
        desc: 'Golpe com as duas palmas: dano massivo, empurrão e atordoamento.',
        cast(p, a) {
          p.channel = 0.5; p.channelMove = 0.1;
          p.setPose('bazooka', 0.55);
          after(0.26, () => {
            addFx({ type: 'arm', owner: p, a: a - 0.08, len: 2.6, dur: 0.28, side: -1, big: true });
            addFx({ type: 'arm', owner: p, a: a + 0.08, len: 2.6, dur: 0.28, side: 1, big: true });
            after(0.1, () => {
              hitCone(p.x, p.y, a, 3.1, 1.2, 3.6, { kb: 3.5, stun: 1.0, hitstop: 0.08 });
              shake(9); Sfx.play('boom');
              comicText(p.x + Math.cos(a) * 2, p.y + Math.sin(a) * 2, 'BAZOOKA!');
            });
          });
        },
      },
      r: {
        name: 'Gear Second', icon: '♨️', cost: 40, cd: 24, unlock: 4,
        desc: 'Por 10s: +50% de dano, +40% de velocidade de ataque, +30% de movimento e recargas mais rápidas.',
        cast(p) {
          p.addBuff('gear2', 10);
          p.setPose('cast', 0.4);
          Sfx.play('buff'); shake(4);
          comicText(p.x, p.y, 'GEAR SECOND!', '#ff8fa0');
          burst(p.x, p.y, 20, 30, { colors: ['#fff', '#ffd6dc'], speed: 2, life: 1, shape: 'smoke', grow: 10, g: -40 });
        },
      },
    },
  },

  // ------------------------------------------------------------------- ZORO
  zoro: {
    id: 'zoro', name: 'Roronoa Zoro', title: 'O Caçador de Piratas', color: '#3fae4a',
    desc: 'Espadachim de três espadas. Cortes largos, investidas e um tornado devastador.',
    base: { maxHp: 140, maxEn: 100, dmg: 14, armor: 9, crit: 0.1, critDmg: 1.6, atkSpd: 1.0, moveSpd: 4.4, hpRegen: 1, enRegen: 9 },
    look: {
      sprite: 'zoro', skin: '#e3b48a', hair: '#3fae4a', hairStyle: 'zoro', face: 'zoro', top: '#f2f2f2', topStyle: 'plain',
      sash: '#3e8e41', pants: '#1f2a24', shoes: '#1d1d1d', weapon: 'katana', hipSwords: true, scale: 1.02,
    },
    skills: {
      lmb: {
        name: 'Santoryu: Corte', icon: '⚔️', cost: 0, cd: 0.58, unlock: 1, basic: true,
        desc: 'Corte em arco com as três espadas. Gera energia.',
        cast(p, a) {
          p.combo = (p.combo || 0) + 1;
          const dir = p.combo % 2 ? 1 : -1;
          const range = p.buffs.asura ? 2.8 : 2.1;
          p.setPose('slash', 0.28);
          addFx({ type: 'arc', follow: p, a, arc: 2.2, r: range, dur: 0.22, dir, color: p.buffs.asura ? '#ff9c8a' : '#e8fff0', glow: '#7dffaf' });
          Sfx.play('slash');
          after(0.05, () => { if (hitCone(p.x, p.y, a, range, 2.2, 1.25, { kb: 0.6, gain: 6 })) Sfx.play('hit'); });
        },
      },
      rmb: {
        name: 'Oni Giri', icon: '👹', cost: 20, cd: 4, unlock: 1,
        desc: 'Atravessa os inimigos num piscar de olhos; um instante depois, todos são cortados.',
        cast(p, a, tx, ty) {
          const d = clamp(dist(p.x, p.y, tx, ty), 2.5, 5);
          const sx = p.x, sy = p.y;
          p.setPose('spin', 0.35);
          Sfx.play('dash');
          p.startDash(a, d, 0.16, {
            onStep: (dd) => {
              for (const e of G.enemies) if (!e.dead && dist(p.x, p.y, e.x, e.y) < 1.2 + e.r) dd.hitSet.add(e);
            },
            onEnd: (dd) => {
              addFx({ type: 'line', x1: sx, y1: sy, x2: p.x, y2: p.y, dur: 0.35, color: '#7dffaf' });
              after(0.22, () => {
                let n = 0;
                for (const e of dd.hitSet) {
                  if (e.dead) continue;
                  addFx({ type: 'xslash', x: e.x, y: e.y, dur: 0.35 });
                  damageEnemy(e, p.power(3.2), { kb: 0.8, fromX: sx, fromY: sy, stun: 0.3 });
                  n++;
                }
                if (n) { Sfx.play('slash'); shake(5); comicText(p.x, p.y, 'ONI GIRI!', '#b6ffcb'); G.hitstop = 0.06; }
              });
            },
          });
        },
      },
      q: {
        name: 'Tatsumaki', icon: '🌪️', cost: 25, cd: 7, unlock: 2,
        desc: 'Gira as espadas criando um tornado que corta e puxa os inimigos ao redor.',
        cast(p) {
          p.channel = 1.0; p.channelMove = 0.55;
          p.setPose('spin', 1.0);
          addFx({ type: 'tornado', follow: p, r: 2.7, dur: 1.0, color: 'rgba(210,255,225,0.9)' });
          Sfx.play('slash');
          for (let i = 0; i < 6; i++) {
            after(i * 0.17, () => {
              if (p.dead) return;
              if (hitCircle(p.x, p.y, 2.7, 0.75, { pull: 1.2, hitstop: 0.01 })) Sfx.play('hit');
              Sfx.play('swing');
            });
          }
          comicText(p.x, p.y, 'TATSUMAKI!', '#b6ffcb');
        },
      },
      e: {
        name: '360 Pound Ho', icon: '🌊', cost: 22, cd: 5, unlock: 3,
        desc: 'Dispara uma onda de corte que atravessa todos os inimigos em linha.',
        cast(p, a) {
          p.setPose('slash', 0.35);
          Sfx.play('slash');
          after(0.1, () => {
            G.projectiles.push({
              x: p.x + Math.cos(a) * 0.6, y: p.y + Math.sin(a) * 0.6, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13,
              r: 0.75, dmg: p.power(2.6), owner: 'player', life: 0.8, kind: 'wave', pierce: true, hitSet: new Set(), kb: 1.2,
            });
          });
        },
      },
      r: {
        name: 'Kyutoryu: Asura', icon: '👺', cost: 50, cd: 30, unlock: 4,
        desc: 'Por 8s: dano dobrado, +25% de velocidade de ataque e cortes com alcance maior.',
        cast(p) {
          p.addBuff('asura', 8);
          p.setPose('spin', 0.5);
          Sfx.play('buff'); Sfx.play('roar'); shake(6);
          comicText(p.x, p.y, 'ASURA!', '#ff6a5a');
          burst(p.x, p.y, 20, 30, { colors: ['#3a0d0d', '#7a1a1a', '#222'], speed: 2.5, life: 1, shape: 'smoke', grow: 10, g: -30 });
        },
      },
    },
  },

  // ------------------------------------------------------------------ SANJI
  sanji: {
    id: 'sanji', name: 'Sanji', title: 'Perna Negra', color: '#f2d45c',
    desc: 'Lutador rápido que só usa as pernas. Saltos, giros e chutes flamejantes.',
    base: { maxHp: 130, maxEn: 100, dmg: 11, armor: 7, crit: 0.07, critDmg: 1.5, atkSpd: 1.15, moveSpd: 5.0, hpRegen: 1, enRegen: 10 },
    look: {
      sprite: 'sanji', skin: '#f0c7a0', hair: '#f2d45c', hairStyle: 'sanji', face: 'sanji', top: '#22262f', topStyle: 'suit',
      sleeves: true, pants: '#22262f', shoes: '#141414', scale: 1.02,
    },
    skills: {
      lmb: {
        name: 'Collier Shoot', icon: '🦵', cost: 0, cd: 0.4, unlock: 1, basic: true,
        desc: 'Chutes rápidos. Todo terceiro chute empurra os inimigos. Gera energia.',
        cast(p, a) {
          p.combo = (p.combo || 0) + 1;
          const strong = p.combo % 3 === 0;
          p.setPose('kick', 0.22);
          addFx({ type: 'arc', follow: p, a, arc: 1.7, r: 1.9, dur: 0.18, dir: p.combo % 2 ? 1 : -1, color: p.buffs.diable ? '#ffb13b' : '#f2f2f2', glow: p.buffs.diable ? '#ff5a00' : '#fff' });
          Sfx.play('swing');
          after(0.05, () => {
            if (hitCone(p.x, p.y, a, 1.95, 1.7, strong ? 1.6 : 0.85, { kb: strong ? 1.8 : 0.3, gain: 5 })) Sfx.play('kick');
          });
        },
      },
      rmb: {
        name: 'Anti-Manner Kick Course', icon: '⬆️', cost: 16, cd: 3, unlock: 1,
        desc: 'Chute para cima que lança e atordoa todos ao redor.',
        cast(p) {
          p.setPose('kick', 0.35);
          p.channel = 0.2; p.channelMove = 0.3;
          addFx({ type: 'ring', x: p.x, y: p.y, r0: 0.3, r1: 2.1, dur: 0.35, color: p.buffs.diable ? '#ff8a1e' : '#ffffff', w: 5 });
          Sfx.play('kick');
          if (hitCircle(p.x, p.y, 2.1, 1.8, { stun: 1.0, launch: 240 })) { shake(4); Sfx.play('punch'); }
        },
      },
      q: {
        name: 'Concassé', icon: '☄️', cost: 25, cd: 6, unlock: 2,
        desc: 'Salta até o mouse e cai com um chute de calcanhar que esmaga a área.',
        cast(p, a, tx, ty) {
          const d = Math.min(6.5, dist(p.x, p.y, tx, ty));
          const lx = p.x + Math.cos(a) * d, ly = p.y + Math.sin(a) * d;
          p.setPose('kick', 0.55);
          Sfx.play('dash');
          p.startJump(lx, ly, 0.5, () => {
            hitCircle(p.x, p.y, 2.4, 3.3, { stun: 0.8, kb: 1.2, hitstop: 0.07 });
            addFx({ type: 'ring', x: p.x, y: p.y, r0: 0.4, r1: 2.6, dur: 0.4, color: p.buffs.diable ? '#ff8a1e' : '#f5e6c8', w: 7 });
            burst(p.x, p.y, 2, 22, { colors: ['#c9b48e', '#a89472', '#e8dcc0'], speed: 5, life: 0.6, shape: 'smoke', grow: 8, g: 0 });
            shake(10); Sfx.play('boom');
            comicText(p.x, p.y, 'CONCASSÉ!');
          });
        },
      },
      e: {
        name: 'Party Table Kick Course', icon: '🌀', cost: 20, cd: 5, unlock: 3,
        desc: 'Plantando bananeira, gira chutando tudo ao redor enquanto anda.',
        cast(p) {
          p.channel = 0.9; p.channelMove = 0.75;
          p.setPose('handstand', 0.9);
          addFx({ type: 'tornado', follow: p, r: 2.1, dur: 0.9, color: p.buffs.diable ? 'rgba(255,150,40,0.9)' : 'rgba(255,255,255,0.8)' });
          for (let i = 0; i < 6; i++) {
            after(i * 0.15, () => {
              if (p.dead) return;
              if (hitCircle(p.x, p.y, 2.1, 0.55, { kb: 0.5, hitstop: 0.01 })) Sfx.play('kick');
              Sfx.play('swing');
            });
          }
        },
      },
      r: {
        name: 'Diable Jambe', icon: '🔥', cost: 40, cd: 24, unlock: 4,
        desc: 'Por 10s: pernas em chamas. +60% de dano, +20% de movimento e todos os golpes queimam.',
        cast(p) {
          p.addBuff('diable', 10);
          p.setPose('spinkick', 0.4);
          Sfx.play('buff'); Sfx.play('fire'); shake(5);
          comicText(p.x, p.y, 'DIABLE JAMBE!', '#ff8a1e');
          burst(p.x, p.y, 10, 40, { colors: ['#ffcc33', '#ff7a1a', '#ff3d00'], speed: 3, life: 0.8, g: -60 });
        },
      },
    },
  },
};

// Habilidades comuns a todos
const COMMON_SKILLS = {
  dash: { name: 'Esquiva', icon: '💨', desc: 'Avança rapidamente, ficando invulnerável por um instante.', cd: 1.6 },
  meat: { name: 'Carne!', icon: '🍖', desc: 'Come um pedaço de carne e recupera 50% da vida.', cd: 2 },
};
