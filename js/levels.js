// ============================================================
// Dragon Dash — levels, tiles, themes, parallax backgrounds
// ============================================================
const TILE = 16;
// tile ids
const T_EMPTY = 0, T_SOLID = 1, T_PLAT = 2, T_SLOPE_UP = 3, T_SLOPE_DN = 4, T_SPIKE = 5, T_DASH = 6;

const THEMES = {
  city: {
    skyTop: '#7ec8f0', skyBot: '#cfeeff',
    top: '#9aa4b8', fill: '#5a6478', fillD: '#434b5c', accent: '#38e0c8',
    name: 'WEST CITY',
  },
  wasteland: {
    skyTop: '#ffb347', skyBot: '#ffe2a8',
    top: '#c8893a', fill: '#9a6428', fillD: '#7a4c1c', accent: '#e0a050',
    name: 'ROCKY WASTELAND',
  },
  space: {
    skyTop: '#05050f', skyBot: '#10102a',
    top: '#9aa4b8', fill: '#5a6478', fillD: '#434b5c', accent: '#52d8f0',
    name: 'DEEP SPACE',
  },
  namek: {
    skyTop: '#3fae49', skyBot: '#b8f0a0',
    top: '#3a78e0', fill: '#2a55a8', fillD: '#1d3c78', accent: '#52f0c8',
    name: 'PLANET NAMEK',
  },
};

// ---------------- level builder ----------------
function LevelBuilder(W, H) {
  const grid = [];
  for (let y = 0; y < H; y++) grid.push(new Array(W).fill(0));
  const ents = [];
  const b = {
    W, H, grid, ents,
    set(x, y, t) { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = t; },
    // solid ground from column x0..x1 inclusive, surface at row `top`, filled to bottom
    ground(x0, x1, top) {
      for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) b.set(x, y, T_SOLID);
    },
    // floating block region
    block(x0, x1, y0, y1) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) b.set(x, y, T_SOLID);
    },
    // jump-through platform
    plat(x0, x1, y) { for (let x = x0; x <= x1; x++) b.set(x, y, T_PLAT); },
    // ascending slope to the right starting at column x, surface starts at row top (goes up `len` tiles)
    slopeUp(x, top, len) {
      for (let i = 0; i < len; i++) {
        b.set(x + i, top - i, T_SLOPE_UP);
        for (let y = top - i + 1; y < b.H; y++) b.set(x + i, y, T_SOLID);
      }
      return top - len; // new surface row after slope
    },
    slopeDn(x, top, len) {
      for (let i = 0; i < len; i++) {
        b.set(x + i, top + i, T_SLOPE_DN);
        for (let y = top + i + 1; y < b.H; y++) b.set(x + i, y, T_SOLID);
      }
      return top + len;
    },
    spikes(x0, x1, y) { for (let x = x0; x <= x1; x++) { b.set(x, y, T_SPIKE); for (let yy = y + 1; yy < H; yy++) b.set(x, yy, T_SOLID); } },
    dash(x0, x1, y) { for (let x = x0; x <= x1; x++) b.set(x, y, T_DASH); },
    ent(type, tx, ty, opts) { ents.push(Object.assign({ type, x: tx * TILE + TILE / 2, y: ty * TILE }, opts)); },
    // a horizontal row of n zeni
    zrow(tx, ty, n, gap = 1.5) { for (let i = 0; i < n; i++) ents.push({ type: 'zeni', x: (tx + i * gap) * TILE, y: ty * TILE }); },
    zarc(tx, ty, n) { // arc of zeni (over a gap)
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        ents.push({ type: 'zeni', x: (tx + i * 1.6) * TILE, y: (ty - Math.sin(t * Math.PI) * 3) * TILE });
      }
    },
  };
  return b;
}

// ---------------- ZONE 1: WEST CITY ----------------
function buildZone1() {
  const b = LevelBuilder(240, 26);
  let top = 21;
  b.ground(0, 33, top);
  b.ent('npc_bulma', 13, top, {});
  b.zrow(20, 19, 5);
  // steps up and down
  b.block(26, 29, 19, 20);
  b.zrow(26, 17, 3);
  // street gap
  b.ground(37, 60, top);
  b.zarc(33, 20, 4);
  b.ent('rrbot', 44, top, {});
  b.dash(50, 52, top - 1);
  let t2 = b.slopeUp(54, top - 1, 4); // up to row 16... surface 17
  b.ground(58, 76, t2 + 1);
  b.ent('spring', 62, t2 + 1, {});
  b.ent('rrbot', 70, t2 + 1, {});
  b.zrow(66, t2 - 1, 4);
  // rooftop route (via spring)
  b.plat(60, 68, 11);
  b.zrow(61, 9, 5);
  b.ent('drone', 65, 9, {});
  b.plat(72, 78, 9);
  b.zrow(73, 7, 4);
  b.plat(82, 88, 11);
  b.ent('drone', 85, 9, {});
  b.zrow(83, 9, 4);
  // back to ground; mid section with spike pit
  let t3 = b.slopeDn(77, t2 + 1, 4);
  b.ground(81, 94, t3);
  b.ent('rrbot', 88, t3, {});
  b.spikes(95, 98, t3 + 2);
  b.zarc(94, t3 - 1, 5);
  b.ground(99, 130, t3);
  b.ent('rrbot', 104, t3, {});
  // rolling hills
  let t4 = b.slopeUp(110, t3 - 1, 3);
  b.ground(113, 118, t4 + 1);
  let t5 = b.slopeDn(119, t4 + 1, 3);
  b.ground(122, 130, t5);
  b.zrow(111, t4 - 1, 6);
  // hidden dragon ball alcove (spring at 124 launches up)
  b.ent('spring', 124, t5, {});
  b.plat(120, 127, 9);
  b.ent('dragonball', 123, 9, { id: 1 });
  b.zrow(121, 7, 4);
  b.ent('drone', 117, 10, {});
  // checkpoint + descent
  b.ground(131, 160, t5);
  b.ent('checkpoint', 134, t5, {});
  b.ent('senzu', 140, t5 - 1, {});
  b.ent('rrbot', 146, t5, {});
  b.ent('rrbot', 154, t5, {});
  b.zrow(148, t5 - 2, 5);
  // speed section
  b.ground(161, 196, t5);
  b.dash(164, 166, t5 - 1);
  b.zrow(168, t5 - 2, 8);
  let t6 = b.slopeUp(178, t5 - 1, 3);
  b.ground(181, 186, t6 + 1);
  let t7 = b.slopeDn(187, t6 + 1, 3);
  b.ground(190, 196, t7);
  b.dash(192, 194, t7 - 1);
  b.ent('drone', 184, t6 - 2, {});
  // gap then ball #2 high route
  b.zarc(197, t7 - 1, 5);
  b.ground(201, 239, t7);
  b.ent('spring', 205, t7, {});
  b.plat(208, 214, 11);
  b.ent('dragonball', 211, 11, { id: 2 });
  b.ent('drone', 211, 8, {});
  b.ent('rrbot', 212, t7, {});
  b.zrow(216, t7 - 2, 5);
  // boss arena
  b.ent('boss_trigger', 222, t7, { boss: 'mech', arenaL: 218 * TILE, arenaR: 239 * TILE });
  return {
    name: 'WEST CITY', theme: 'city', music: 'city',
    W: b.W, H: b.H, grid: b.grid, ents: b.ents,
    start: { x: 3 * TILE, y: 20 * TILE },
    intro: 'bulma',
  };
}

// ---------------- ZONE 2: ROCKY WASTELAND ----------------
function buildZone2() {
  const b = LevelBuilder(240, 26);
  let top = 21;
  b.ground(0, 20, top);
  b.zrow(8, 19, 5);
  b.ent('saiba', 14, top, {});
  // mesa climb
  let t2 = b.slopeUp(21, top - 1, 4);
  b.ground(25, 38, t2 + 1);
  b.ent('saiba', 30, t2 + 1, {});
  b.ent('checkpoint', 34, t2 + 1, {});
  b.zrow(28, t2 - 1, 5);
  // gap to mesa
  b.block(42, 52, t2 + 1, 25);
  b.zarc(38, t2, 5);
  b.ent('saiba', 46, t2 + 1, {});
  // taller mesa via spring
  b.ent('spring', 49, t2 + 1, {});
  b.block(53, 62, 13, 25);
  b.zrow(55, 11, 5);
  b.ent('drone', 58, 10, {});
  // down the cliff with platforms
  b.plat(65, 69, 15);
  b.plat(71, 75, 18);
  b.zrow(66, 13, 3);
  b.zrow(72, 16, 3);
  b.ground(70, 98, top);
  b.ent('saiba', 80, top, {});
  b.ent('saiba', 88, top, {});
  b.spikes(99, 102, top + 2);
  b.zarc(98, top - 1, 5);
  b.ground(103, 132, top);
  b.ent('checkpoint', 106, top, {});
  // canyon with dragon ball below (risky lower path)
  b.block(112, 130, 14, 16);   // upper ledge
  b.zrow(114, 13, 7);
  b.ent('saiba', 120, 14, {});
  b.spikes(117, 119, top);
  b.ent('dragonball', 124, top - 1, { id: 3 });
  b.ent('senzu', 128, top - 1, {});
  // climb out
  let t3 = b.slopeUp(133, top - 1, 5);
  b.ground(138, 158, t3 + 1);
  b.dash(140, 142, t3);
  b.zrow(144, t3 - 1, 8);
  b.ent('saiba', 150, t3 + 1, {});
  b.ent('drone', 146, t3 - 4, {});
  // rolling dunes
  let t4 = b.slopeDn(159, t3 + 1, 3);
  b.ground(162, 168, t4);
  let t5 = b.slopeUp(169, t4 - 1, 3);
  b.ground(172, 180, t5 + 1);
  b.zarc(162, t4 - 1, 6);
  let t6 = b.slopeDn(181, t5 + 1, 4);
  b.ground(185, 206, t6);
  b.ent('checkpoint', 188, t6, {});
  b.ent('saiba', 194, t6, {});
  b.ent('saiba', 200, t6, {});
  b.zrow(192, t6 - 2, 6);
  // hidden ball: spring to floating rock
  b.ent('spring', 203, t6, {});
  b.plat(206, 212, 10);
  b.ent('dragonball', 209, 10, { id: 4 });
  b.ent('drone', 209, 7, {});
  // approach + boss
  b.ground(207, 239, t6);
  b.zrow(214, t6 - 2, 5);
  b.ent('senzu', 219, t6 - 1, {});
  b.ent('boss_trigger', 224, t6, { boss: 'vegeta', arenaL: 220 * TILE, arenaR: 239 * TILE });
  return {
    name: 'ROCKY WASTELAND', theme: 'wasteland', music: 'wasteland',
    W: b.W, H: b.H, grid: b.grid, ents: b.ents,
    start: { x: 3 * TILE, y: 20 * TILE },
  };
}

// ---------------- ZONE 3: DEEP SPACE (flying shooter) ----------------
// scripted spawn timeline: t in seconds
function buildZone3() {
  const waves = [];
  let t = 2;
  const add = (type, y, opts) => waves.push(Object.assign({ t, type, y }, opts || {}));
  // opening asteroids
  add('asteroid', 60); t += 1.2; add('asteroid', 160); t += 1.0; add('asteroid', 110); t += 1.2;
  add('zline', 80, { n: 6 }); t += 1.5;
  add('asteroid', 200); t += 0.8; add('asteroid', 40); t += 1.4;
  // first soldiers
  add('soldier', 70); t += 1.6; add('soldier', 150); t += 1.6;
  add('zline', 180, { n: 6 }); t += 2;
  add('soldier', 100); add('asteroid', 200); t += 1.8;
  // asteroid field
  for (let i = 0; i < 8; i++) { add('asteroid', 30 + ((i * 67) % 200)); t += 0.7; }
  add('zline', 120, { n: 8 }); t += 2;
  // soldier squad
  add('soldier', 60); t += 0.8; add('soldier', 120); t += 0.8; add('soldier', 180); t += 1.6;
  add('senzu', 100); t += 2;
  // dragon ball escort (guarded!)
  add('soldier', 90); add('soldier', 150); t += 1.2;
  add('dragonball', 120, { id: 5 }); t += 2.5;
  // dense mixed run
  for (let i = 0; i < 10; i++) {
    add(i % 3 === 0 ? 'soldier' : 'asteroid', 30 + ((i * 83) % 210));
    t += 0.75;
  }
  add('zline', 60, { n: 6 }); t += 1.5;
  add('zline', 190, { n: 6 }); t += 2.5;
  add('soldier', 80); add('soldier', 160); t += 1.5;
  add('asteroid', 120); t += 2.5;
  const bossAt = t + 2;
  return {
    name: 'DEEP SPACE', theme: 'space', music: 'space', mode: 'fly',
    waves, bossAt, boss: 'ginyu',
  };
}

// ---------------- ZONE 4: PLANET NAMEK ----------------
function buildZone4() {
  const b = LevelBuilder(250, 26);
  let top = 21;
  b.ground(0, 22, top);
  b.zrow(8, 19, 5);
  b.ent('soldier_g', 15, top, {});
  // island hopping over water (water at row 24+)
  b.block(26, 31, top, 25);
  b.zarc(22, top - 1, 4);
  b.block(35, 40, top - 1, 25);
  b.zarc(31, top - 2, 4);
  b.ent('soldier_g', 37, top - 1, {});
  b.block(44, 52, top, 25);
  b.ent('spring', 50, top, {});
  // high route on ajisa platforms
  b.plat(54, 60, 13);
  b.zrow(55, 11, 5);
  b.ent('drone_f', 57, 10, {});
  b.plat(63, 69, 11);
  b.zrow(64, 9, 5);
  b.plat(72, 78, 14);
  // low route
  b.block(56, 78, top + 1, 25);
  b.ent('soldier_g', 62, top + 1, {});
  b.ent('soldier_g', 72, top + 1, {});
  b.ground(82, 108, top);
  b.zarc(78, top - 1, 5);
  b.ent('checkpoint', 86, top, {});
  b.ent('soldier_g', 94, top, {});
  // namekian ruins with spikes
  b.spikes(100, 102, top);
  b.block(104, 106, 18, 20);
  b.zrow(104, 16, 3);
  b.ground(109, 134, top);
  b.ent('soldier_g', 114, top, {});
  let t2 = b.slopeUp(118, top - 1, 4);
  b.ground(122, 134, t2 + 1);
  b.dash(124, 126, t2);
  b.zrow(128, t2 - 1, 6);
  // dragon ball in underwater-style cave (drop through gap)
  let t3 = b.slopeDn(135, t2 + 1, 4);
  b.ground(139, 156, t3);
  b.block(141, 152, t3 - 6, t3 - 5); // roof creating cave illusion
  b.ent('dragonball', 146, t3 - 1, { id: 6 });
  b.ent('soldier_g', 149, t3, {});
  b.ent('senzu', 153, t3 - 1, {});
  b.spikes(157, 159, t3 + 2);
  b.zarc(156, t3 - 1, 5);
  b.ground(160, 190, t3);
  b.ent('checkpoint', 163, t3, {});
  b.ent('soldier_g', 170, t3, {});
  b.ent('drone_f', 175, t3 - 5, {});
  b.zrow(172, t3 - 2, 7);
  // grand staircase to Frieza
  b.block(182, 186, t3 - 2, 25);
  b.block(187, 191, t3 - 4, 25);
  b.zrow(183, t3 - 4, 3);
  b.zrow(188, t3 - 6, 3);
  // final ball #7 on high pillar before boss
  b.block(195, 197, t3 - 8, 25);
  b.ent('dragonball', 196, t3 - 9, { id: 7 });
  b.ground(192, 249, t3);
  b.ent('spring', 193, t3, {});
  b.ent('soldier_g', 204, t3, {});
  b.ent('senzu', 210, t3 - 1, {});
  b.zrow(206, t3 - 2, 6);
  b.ent('boss_trigger', 222, t3, { boss: 'frieza', arenaL: 216 * TILE, arenaR: 248 * TILE });
  return {
    name: 'PLANET NAMEK', theme: 'namek', music: 'namek',
    W: b.W, H: b.H, grid: b.grid, ents: b.ents,
    start: { x: 3 * TILE, y: 20 * TILE },
  };
}

const ZONES = [buildZone1, buildZone2, buildZone3, buildZone4];

// ---------------- terrain queries ----------------
function tileAt(level, tx, ty) {
  if (tx < 0 || tx >= level.W) return T_SOLID;
  if (ty < 0) return T_EMPTY;
  if (ty >= level.H) return T_EMPTY;
  return level.grid[ty][tx];
}

// surface Y (pixel) at world x for a column, scanning from scanY upward/downward
// returns the y of the floor surface at/below (x, y) within `range` px, or null
function floorAt(level, x, y, range = 20, up = 6) {
  const tx = Math.floor(x / TILE);
  for (let ty = Math.floor((y - up) / TILE); ty <= Math.floor((y + range) / TILE); ty++) {
    const t = tileAt(level, tx, ty);
    if (t === T_EMPTY || t === T_SPIKE) continue;
    let surf;
    const lx = x - tx * TILE;
    if (t === T_SLOPE_UP) surf = ty * TILE + (TILE - 1 - lx);
    else if (t === T_SLOPE_DN) surf = ty * TILE + lx;
    else surf = ty * TILE;
    if (t === T_PLAT && y > surf + 6) continue; // platforms only from above
    if (surf >= y - up) return { y: surf, tile: t, tx, ty };
  }
  return null;
}

// true if (x,y) is inside a tile that should block horizontal movement.
// Solid tiles directly beneath a slope tile are "slope support" — never walls.
function wallAt(level, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tileAt(level, tx, ty) !== T_SOLID) return false;
  const above = tileAt(level, tx, ty - 1);
  if (above === T_SLOPE_UP || above === T_SLOPE_DN) return false;
  return true;
}

function solidAt(level, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const t = tileAt(level, tx, ty);
  if (t === T_SOLID) return true;
  if (t === T_SLOPE_UP) { const lx = x - tx * TILE; return (y - ty * TILE) >= (TILE - 1 - lx); }
  if (t === T_SLOPE_DN) { const lx = x - tx * TILE; return (y - ty * TILE) >= lx; }
  return false;
}

function spikeAt(level, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return tileAt(level, tx, ty) === T_SPIKE;
}

function dashAt(level, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return tileAt(level, tx, ty) === T_DASH;
}

// ---------------- rendering ----------------
function hashXY(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }

function drawTiles(ctx, level, camX, camY, time) {
  const th = THEMES[level.theme];
  const x0 = Math.max(0, Math.floor(camX / TILE));
  const x1 = Math.min(level.W - 1, Math.ceil((camX + VW) / TILE));
  const y0 = Math.max(0, Math.floor(camY / TILE));
  const y1 = Math.min(level.H - 1, Math.ceil((camY + VH) / TILE));
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = level.grid[ty][tx];
      if (!t) continue;
      const px = tx * TILE - camX, py = ty * TILE - camY;
      const h = hashXY(tx, ty);
      if (t === T_SOLID) {
        const topOpen = tileAt(level, tx, ty - 1) === T_EMPTY || tileAt(level, tx, ty - 1) >= T_SPIKE;
        ctx.fillStyle = (h % 7 === 0) ? th.fillD : th.fill;
        ctx.fillRect(px, py, TILE, TILE);
        if (h % 5 === 0) { ctx.fillStyle = th.fillD; ctx.fillRect(px + (h % 12), py + ((h >> 4) % 12), 3, 2); }
        if (topOpen) { ctx.fillStyle = th.top; ctx.fillRect(px, py, TILE, 4); ctx.fillStyle = th.accent; if (h % 3 === 0) ctx.fillRect(px + (h % 13), py, 2, 2); }
      } else if (t === T_PLAT) {
        ctx.fillStyle = th.top; ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = th.fillD; ctx.fillRect(px, py + 5, TILE, 3);
      } else if (t === T_SLOPE_UP) {
        ctx.fillStyle = th.fill;
        for (let i = 0; i < TILE; i++) ctx.fillRect(px + i, py + TILE - 1 - i, 1, i + 1);
        ctx.fillStyle = th.top;
        for (let i = 0; i < TILE; i++) ctx.fillRect(px + i, py + TILE - 1 - i, 1, 3);
      } else if (t === T_SLOPE_DN) {
        ctx.fillStyle = th.fill;
        for (let i = 0; i < TILE; i++) ctx.fillRect(px + i, py + i, 1, TILE - i);
        ctx.fillStyle = th.top;
        for (let i = 0; i < TILE; i++) ctx.fillRect(px + i, py + i, 1, 3);
      } else if (t === T_SPIKE) {
        ctx.fillStyle = '#c9ccd8';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(px + i * 4, py + TILE);
          ctx.lineTo(px + i * 4 + 2, py + 6);
          ctx.lineTo(px + i * 4 + 4, py + TILE);
          ctx.fill();
        }
      } else if (t === T_DASH) {
        ctx.fillStyle = th.fill; ctx.fillRect(px, py, TILE, TILE);
        const ph = Math.floor(time * 10) % 3;
        ctx.fillStyle = ph === 0 ? '#ffd824' : '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 3); ctx.lineTo(px + 8, py + 8); ctx.lineTo(px + 2, py + 13); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 3); ctx.lineTo(px + 14, py + 8); ctx.lineTo(px + 8, py + 13); ctx.fill();
      }
    }
  }
}

function skyGradient(ctx, th) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.skyTop); g.addColorStop(1, th.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

// All painters anchor to VW/VH so the game works in landscape AND portrait.
function drawBackground(ctx, theme, camX, camY, time) {
  const th = THEMES[theme];
  skyGradient(ctx, th);
  const W = VW, H = VH;
  const horizon = H * 0.78; // skyline base
  if (theme === 'city') {
    // sun + clouds
    ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(W * 0.83, H * 0.17, 18, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 170 - camX * 0.1 + time * 4) % 600 + 600) % 600 - 60;
      ctx.fillRect(cx, H * 0.11 + i * H * 0.08, 50, 8); ctx.fillRect(cx + 10, H * 0.09 + i * H * 0.08, 30, 8);
    }
    // far skyline
    ctx.fillStyle = '#a8c4dd';
    for (let i = 0; i < 14; i++) {
      const bx = ((i * 90 - camX * 0.25) % 1260 + 1260) % 1260 - 90;
      const h = 60 + (hashXY(i, 7) % 50);
      ctx.fillRect(bx, horizon - h, 56, h + H - horizon);
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(bx + 28, horizon - h, 28, Math.PI, 0); ctx.fill(); } // capsule domes
    }
    // near skyline
    ctx.fillStyle = '#7e9cc0';
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 120 - camX * 0.5) % 1440 + 1440) % 1440 - 120;
      const h = 40 + (hashXY(i, 3) % 60);
      const base = H * 0.89;
      ctx.fillRect(bx, base - h, 70, h + H - base);
      ctx.fillStyle = '#ffe9a8';
      for (let w = 0; w < 6; w++) if (hashXY(i, w) % 3 === 0) ctx.fillRect(bx + 8 + (w % 3) * 20, base + 10 - h + Math.floor(w / 3) * 18, 6, 8);
      ctx.fillStyle = '#7e9cc0';
    }
  } else if (theme === 'wasteland') {
    ctx.fillStyle = '#ff7b2e'; ctx.beginPath(); ctx.arc(W * 0.25, H * 0.22, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a060';
    for (let i = 0; i < 8; i++) {
      const mx = ((i * 180 - camX * 0.2) % 1440 + 1440) % 1440 - 120;
      ctx.beginPath();
      ctx.moveTo(mx, horizon + 10); ctx.lineTo(mx + 30, horizon - 110 + (hashXY(i, 2) % 30)); ctx.lineTo(mx + 90, horizon - 115 + (hashXY(i, 5) % 30)); ctx.lineTo(mx + 120, horizon + 10);
      ctx.fill();
      ctx.fillRect(mx, horizon - 10, 130, H - horizon + 10);
    }
    ctx.fillStyle = '#c07838';
    for (let i = 0; i < 7; i++) {
      const mx = ((i * 230 - camX * 0.45) % 1610 + 1610) % 1610 - 160;
      const top = horizon - 60 + (hashXY(i, 9) % 20);
      ctx.fillRect(mx, top, 60, H - top);
      ctx.fillRect(mx + 15, top - 15, 30, 20);
    }
  } else if (theme === 'space') {
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      const sx = ((hashXY(i, 1) % W) - camX * (0.1 + (i % 3) * 0.15) % W + W * 2) % W;
      const sy = hashXY(i, 2) % H;
      const tw = (Math.floor(time * 3) + i) % 5 === 0;
      ctx.fillStyle = tw ? '#ffffff' : (i % 3 === 0 ? '#9ad1ff' : '#666a88');
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    // distant planets
    ctx.fillStyle = '#3fae49'; ctx.beginPath(); ctx.arc(W * 0.9 - camX * 0.02 % 100, H * 0.22, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#2c7a36'; ctx.beginPath(); ctx.arc(W * 0.9 - 4 - camX * 0.02 % 100, H * 0.22 - 4, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c87830'; ctx.beginPath(); ctx.arc(W * 0.17, H * 0.74, 9, 0, 7); ctx.fill();
  } else if (theme === 'namek') {
    // green sky, two suns
    ctx.fillStyle = '#fff7a0'; ctx.beginPath(); ctx.arc(W * 0.79, H * 0.15, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe23a'; ctx.beginPath(); ctx.arc(W * 0.67, H * 0.26, 9, 0, 7); ctx.fill();
    // distant islands + water
    const water = H * 0.83;
    ctx.fillStyle = '#7adfb0';
    for (let i = 0; i < 6; i++) {
      const ix = ((i * 200 - camX * 0.2) % 1200 + 1200) % 1200 - 100;
      ctx.beginPath(); ctx.ellipse(ix + 60, water - 10, 80, 22, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#2a8ad0'; ctx.fillRect(0, water, W, H - water);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 10; i++) {
      const wx = ((i * 70 - camX * 0.35 + time * 12) % 550 + 550) % 550 - 35;
      ctx.fillRect(wx, water + 7 + (i % 4) * 9, 26, 2);
    }
    // ajisa trees (dark teal)
    ctx.fillStyle = '#1d6e58';
    for (let i = 0; i < 6; i++) {
      const tx2 = ((i * 220 - camX * 0.5) % 1320 + 1320) % 1320 - 110;
      const ty2 = water - 55;
      ctx.fillRect(tx2 + 24, ty2, 8, 60);
      ctx.beginPath(); ctx.arc(tx2 + 28, ty2 - 8, 26, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(tx2 + 8, ty2 + 8, 16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(tx2 + 48, ty2 + 8, 16, 0, 7); ctx.fill();
    }
  }
}
