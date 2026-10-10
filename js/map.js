'use strict';
/* =========================================================================
   Mapa: geração procedural de Arlong Park (salas + corredores cercados
   pelo mar), campo de fluxo para a IA e colisão com paredes.
   ========================================================================= */

class Dungeon {
  constructor() {
    this.w = 96;
    this.h = 96;
    const n = this.w * this.h;
    this.tiles = new Uint8Array(n);
    this.style = new Uint8Array(n);      // 0 pedra, 1 madeira, 2 arena do chefe, 3 areia
    this.roomOf = new Int16Array(n).fill(-1);
    this.explored = new Uint8Array(n);
    this.flow = new Int16Array(n);
    this.colors = new Array(n);
    this.rooms = [];
    this.flowTile = -1;
    this.revealDirty = true;
    this.generate();
  }

  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inb(x, y) ? this.tiles[y * this.w + x] : T_VOID; }
  walkable(x, y) { return this.tile(Math.floor(x), Math.floor(y)) === T_FLOOR; }

  generate() {
    const W = this.w, H = this.h, rooms = this.rooms;
    const overlaps = (r) => rooms.some((o) =>
      r.x < o.x + o.w + 3 && r.x + r.w + 3 > o.x && r.y < o.y + o.h + 3 && r.y + r.h + 3 > o.y);

    // Arena do chefe primeiro, num canto aleatório
    const bs = 17, corner = randi(0, 3);
    rooms.push({ x: corner & 1 ? W - bs - 4 : 4, y: corner & 2 ? H - bs - 4 : 4, w: bs, h: bs, boss: true });
    let tries = 0;
    while (rooms.length < 16 && tries++ < 900) {
      const w = randi(7, 12), h = randi(7, 12);
      const r = { x: randi(3, W - w - 4), y: randi(3, H - h - 4), w, h };
      if (!overlaps(r)) rooms.push(r);
    }
    for (const r of rooms) { r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2; }
    const boss = rooms[0];
    let start = rooms[1];
    for (const r of rooms) {
      if (!r.boss && dist(r.cx, r.cy, boss.cx, boss.cy) > dist(start.cx, start.cy, boss.cx, boss.cy)) start = r;
    }
    start.start = true;
    this.bossRoom = boss;
    this.startRoom = start;

    rooms.forEach((r, i) => {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const k = this.idx(x, y);
          this.tiles[k] = T_FLOOR;
          this.style[k] = r.boss ? 2 : r.start ? 3 : 0;
          this.roomOf[k] = i;
        }
      }
    });

    // Árvore geradora mínima entre as salas comuns (o chefe fica como "folha")
    const normal = rooms.filter((r) => !r.boss);
    const tree = [start];
    const rest = normal.filter((r) => r !== start);
    while (rest.length) {
      let best = null, bd = Infinity, bi = -1;
      for (const a of tree) {
        rest.forEach((b, i) => {
          const d = dist(a.cx, a.cy, b.cx, b.cy);
          if (d < bd) { bd = d; best = [a, b]; bi = i; }
        });
      }
      this.corridor(best[0], best[1]);
      tree.push(best[1]);
      rest.splice(bi, 1);
    }
    // Alguns laços extras para não ficar linear demais
    for (let i = 0; i < 3; i++) {
      const a = pick(normal), b = pick(normal);
      if (a !== b && dist(a.cx, a.cy, b.cx, b.cy) < 30) this.corridor(a, b);
    }
    // Liga a arena do chefe à sala comum mais próxima (que não seja o início)
    let near = null;
    for (const r of normal) {
      if (r === start && normal.length > 2) continue;
      if (!near || dist(r.cx, r.cy, boss.cx, boss.cy) < dist(near.cx, near.cy, boss.cx, boss.cy)) near = r;
    }
    this.corridor(near, boss);

    // Paredes em volta de todo chão
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = this.idx(x, y);
        if (this.tiles[k] !== T_VOID) continue;
        let wall = false;
        for (let dy = -1; dy <= 1 && !wall; dy++) {
          for (let dx = -1; dx <= 1; dx++) if (this.tile(x + dx, y + dy) === T_FLOOR) { wall = true; break; }
        }
        if (wall) this.tiles[k] = T_WALL;
      }
    }

    // Cores pré-calculadas
    const tint = rooms.map(() => randi(-8, 8));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = this.idx(x, y), t = this.tiles[k];
        if (t === T_FLOOR) {
          const st = this.style[k];
          if (st === 0) this.colors[k] = `hsl(${32 + tint[this.roomOf[k]] || 32}, 12%, ${43 + rand(-3, 3)}%)`;
          else if (st === 1) this.colors[k] = `hsl(27, 42%, ${33 + rand(-3, 3)}%)`;
          else if (st === 2) this.colors[k] = (x + y) % 2 ? `hsl(192, 30%, ${30 + rand(-2, 2)}%)` : `hsl(190, 25%, ${40 + rand(-2, 2)}%)`;
          else this.colors[k] = `hsl(43, 48%, ${66 + rand(-3, 3)}%)`;
        } else if (t === T_WALL) {
          this.colors[k] = rand(-4, 4);
        }
      }
    }
  }

  corridor(a, b) {
    let x = Math.floor(a.cx), y = Math.floor(a.cy);
    const tx = Math.floor(b.cx), ty = Math.floor(b.cy);
    const carve = (cx, cy) => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = cx + dx, yy = cy + dy;
          if (!this.inb(xx, yy)) continue;
          const k = this.idx(xx, yy);
          if (this.tiles[k] !== T_FLOOR) { this.tiles[k] = T_FLOOR; this.style[k] = 1; }
        }
      }
    };
    const stepX = () => { while (x !== tx) { carve(x, y); x += Math.sign(tx - x); } };
    const stepY = () => { while (y !== ty) { carve(x, y); y += Math.sign(ty - y); } };
    if (chance(0.5)) { stepX(); stepY(); } else { stepY(); stepX(); }
    carve(x, y);
  }

  roomAt(x, y) {
    if (!this.inb(Math.floor(x), Math.floor(y))) return null;
    const i = this.roomOf[this.idx(Math.floor(x), Math.floor(y))];
    return i >= 0 ? this.rooms[i] : null;
  }

  randomPointIn(r, margin = 1.2) {
    for (let i = 0; i < 30; i++) {
      const x = rand(r.x + margin, r.x + r.w - margin), y = rand(r.y + margin, r.y + r.h - margin);
      if (this.walkable(x, y)) return [x, y];
    }
    return [r.cx, r.cy];
  }

  los(ax, ay, bx, by) {
    const d = dist(ax, ay, bx, by), n = Math.ceil(d / 0.35);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.walkable(lerp(ax, bx, t), lerp(ay, by, t))) return false;
    }
    return true;
  }

  reveal(px, py, r) {
    const x0 = Math.floor(px - r), x1 = Math.ceil(px + r), y0 = Math.floor(py - r), y1 = Math.ceil(py + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.inb(x, y)) continue;
        const k = this.idx(x, y);
        if (!this.explored[k] && (x - px) ** 2 + (y - py) ** 2 < r * r) { this.explored[k] = 1; this.revealDirty = true; }
      }
    }
  }

  // BFS a partir do jogador: cada tile guarda a distância (em passos) até ele
  computeFlow(px, py) {
    const k0 = this.idx(Math.floor(px), Math.floor(py));
    if (k0 === this.flowTile) return;
    this.flowTile = k0;
    const f = this.flow, W = this.w;
    f.fill(-1);
    if (!this._q) this._q = new Int32Array(this.w * this.h);
    const q = this._q;
    let head = 0, tail = 0;
    q[tail++] = k0; f[k0] = 0;
    while (head < tail) {
      const k = q[head++], d = f[k];
      if (d > 45) continue;
      const x = k % W, y = (k / W) | 0;
      const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of nb) {
        if (!this.inb(nx, ny)) continue;
        const nk = ny * W + nx;
        if (f[nk] === -1 && this.tiles[nk] === T_FLOOR) { f[nk] = d + 1; q[tail++] = nk; }
      }
    }
  }

  flowStep(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!this.inb(tx, ty)) return null;
    let best = this.flow[this.idx(tx, ty)];
    if (best < 0) return null;
    let bx = tx, by = ty;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = tx + dx, ny = ty + dy;
        if (!this.inb(nx, ny)) continue;
        const v = this.flow[this.idx(nx, ny)];
        if (v < 0) continue;
        if (dx && dy && (this.tile(tx + dx, ty) !== T_FLOOR || this.tile(tx, ty + dy) !== T_FLOOR)) continue;
        if (v < best) { best = v; bx = nx; by = ny; }
      }
    }
    return [bx + 0.5, by + 0.5];
  }
}

// ---------- Colisão ----------
function collidesAt(x, y, r) {
  const m = G.map;
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (m.tile(tx, ty) === T_FLOOR) continue;
      const cx = clamp(x, tx, tx + 1), cy = clamp(y, ty, ty + 1);
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    }
  }
  return false;
}

function moveEntity(e, dx, dy) {
  let blocked = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.25));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (!collidesAt(e.x + sx, e.y, e.r)) e.x += sx; else blocked = true;
    if (!collidesAt(e.x, e.y + sy, e.r)) e.y += sy; else blocked = true;
  }
  return blocked;
}
