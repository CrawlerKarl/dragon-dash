// ============================================================
// Dragon Dash — boss fights
// ============================================================

const BOSS_DEFS = {
  mech:   { hp: 30, name: 'RED RIBBON MECH' },
  vegeta: { hp: 45, name: 'VEGETA' },
  ginyu:  { hp: 40, name: 'CAPTAIN GINYU' },
  frieza: { hp: 72, name: 'FRIEZA' },
};

function makeBoss(kind, arenaL, arenaR, groundY) {
  const def = BOSS_DEFS[kind];
  return {
    kind, name: def.name,
    hp: def.hp, hpMax: def.hp,
    x: arenaR - 50, y: groundY,
    vx: 0, vy: 0,
    arenaL, arenaR, groundY,
    t: 0, phase: 0, state: 'enter', stateT: 1.5,
    hurtT: 0, dead: false, deathT: 0,
    flipped: true, telegraphT: 0,
  };
}

function bossHitTest(x, y, r) {
  const b = G.boss;
  if (!b || b.dead) return false;
  const hw = b.kind === 'mech' ? 14 : 9;
  const hh = b.kind === 'mech' ? 20 : 11;
  return Math.abs(x - b.x) < hw + r && Math.abs(y - (b.y - hh)) < hh + r;
}

function damageBoss(dmg) {
  const b = G.boss;
  if (!b || b.dead || b.state === 'enter') return;
  b.hp -= dmg;
  b.hurtT = 0.18;
  AudioSys.sfx('bossHit');
  if (b.hp <= 0) {
    b.hp = 0;
    b.dead = true;
    b.deathT = 2.2;
    G.projectiles = G.projectiles.filter(pr => pr.friendly);
    AudioSys.sfx('explode');
    G.shake = 0.8;
  } else if (b.kind === 'frieza' && b.phase === 0 && b.hp <= b.hpMax / 2) {
    b.phase = 1;
    b.state = 'rage'; b.stateT = 1.8;
    G.flashT = 0.4;
    G.shake = 0.7;
    AudioSys.sfx('transform');
    G.toast('FRIEZA: "This isn\'t even my final form... 100% POWER!"', 4);
  }
}

function bossShoot(x, y, tx, ty, speed, r = 3.5) {
  const dx = tx - x, dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  G.projectiles.push({ kind: 'shot', x, y, vx: dx / len * speed, vy: dy / len * speed, r, life: 4, friendly: false });
}

function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  const p = G.player;
  const py = p.flyMode ? p.fy : p.y - 10;
  b.t += dt;
  if (b.hurtT > 0) b.hurtT -= dt;

  if (b.dead) {
    b.deathT -= dt;
    if (Math.random() < 0.35) {
      spawnExplosion(b.x + (Math.random() - 0.5) * 30, b.y - 10 - Math.random() * 25);
      if (Math.random() < 0.3) AudioSys.sfx('explode');
    }
    return;
  }

  b.flipped = p.x < b.x;
  b.stateT -= dt;

  switch (b.kind) {
    case 'mech': updateMech(b, p, dt); break;
    case 'vegeta': updateVegeta(b, p, py, dt); break;
    case 'ginyu': updateGinyu(b, p, py, dt); break;
    case 'frieza': updateFrieza(b, p, py, dt); break;
  }

  // touch damage
  if (p.invulnT <= 0 && p.deadT <= 0 && b.state !== 'enter') {
    const hw = b.kind === 'mech' ? 15 : 10, hh = b.kind === 'mech' ? 20 : 12;
    if (Math.abs(b.x - p.x) < hw + p.w / 2 && Math.abs((b.y - hh) - py) < hh + p.h / 2) {
      hurtPlayer();
    }
  }
}

// --- RED RIBBON MECH: walks, triple shot, jump stomp shockwave ---
function updateMech(b, p, dt) {
  switch (b.state) {
    case 'enter':
      if (b.stateT <= 0) { b.state = 'walk'; b.stateT = 2.2; }
      break;
    case 'walk': {
      const dir = p.x < b.x ? -1 : 1;
      b.x += dir * 34 * dt;
      b.x = Math.max(b.arenaL + 30, Math.min(b.arenaR - 30, b.x));
      if (b.stateT <= 0) {
        b.state = Math.random() < 0.55 ? 'shoot' : 'stomp';
        b.stateT = b.state === 'shoot' ? 1.0 : 0.6;
        b.telegraphT = b.stateT;
      }
      break;
    }
    case 'shoot':
      if (b.stateT <= 0) {
        const d = b.flipped ? -1 : 1;
        for (const sp of [-0.25, 0, 0.25]) {
          G.projectiles.push({ kind: 'shot', x: b.x + d * 14, y: b.y - 22, vx: d * 160 * Math.cos(sp), vy: 160 * Math.sin(sp), r: 3.5, life: 3, friendly: false });
        }
        AudioSys.sfx('blast');
        b.state = 'walk'; b.stateT = 1.6 + Math.random();
      }
      break;
    case 'stomp':
      if (b.stateT <= 0) { b.state = 'air'; b.vy = -380; b.stateT = 5; AudioSys.sfx('jump'); }
      break;
    case 'air':
      b.vy += PHYS.GRAV * dt;
      b.y += b.vy * dt;
      b.x += (p.x - b.x) * 0.8 * dt;
      if (b.vy > 0 && b.y >= b.groundY) {
        b.y = b.groundY;
        b.state = 'walk'; b.stateT = 1.8;
        G.shake = 0.5;
        AudioSys.sfx('explode');
        // shockwaves both directions along the ground
        for (const d of [-1, 1]) {
          G.projectiles.push({ kind: 'wave', x: b.x + d * 18, y: b.y - 5, vx: d * 200, vy: 0, r: 5, life: 1.4, friendly: false });
        }
        // player takes hit if grounded & close when it lands
        if (p.onGround && Math.abs(p.x - b.x) < 46 && p.invulnT <= 0) hurtPlayer();
      }
      break;
  }
}

// --- VEGETA: hover, dash attack, ki volley, galick gun ---
function updateVegeta(b, p, py, dt) {
  const hoverY = b.groundY - 30 + Math.sin(b.t * 2.5) * 8;
  switch (b.state) {
    case 'enter':
      b.y += (hoverY - b.y) * 2 * dt;
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 1.6; }
      break;
    case 'hover': {
      b.y += (hoverY - b.y) * 3 * dt;
      const want = p.x + (p.x < b.x ? 90 : -90);
      b.x += (Math.max(b.arenaL + 20, Math.min(b.arenaR - 20, want)) - b.x) * 1.2 * dt;
      if (b.stateT <= 0) {
        const r = Math.random();
        if (r < 0.4) { b.state = 'volley'; b.stateT = 1.3; b.volleyN = 4; }
        else if (r < 0.75) { b.state = 'dashTele'; b.stateT = 0.55; b.telegraphT = 0.55; }
        else { b.state = 'galickTele'; b.stateT = 0.9; b.telegraphT = 0.9; }
      }
      break;
    }
    case 'volley':
      b.y += (hoverY - b.y) * 3 * dt;
      if (b.volleyN > 0 && b.stateT <= 1.3 - (4 - b.volleyN + 1) * 0.28) {
        bossShoot(b.x + (b.flipped ? -10 : 10), b.y - 14, p.x, py, 190);
        AudioSys.sfx('blast');
        b.volleyN--;
      }
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 1.4 + Math.random() * 0.8; }
      break;
    case 'dashTele':
      if (b.stateT <= 0) {
        b.state = 'dash';
        b.dashVX = Math.sign(p.x - b.x) * 330;
        b.dashY = py;
        b.stateT = 0.7;
        AudioSys.sfx('kame');
      }
      break;
    case 'dash':
      b.x += b.dashVX * dt;
      b.y += (b.dashY + 10 - b.y) * 6 * dt;
      if (b.x < b.arenaL + 14 || b.x > b.arenaR - 14 || b.stateT <= 0) {
        b.x = Math.max(b.arenaL + 14, Math.min(b.arenaR - 14, b.x));
        b.state = 'hover'; b.stateT = 1.5;
      }
      break;
    case 'galickTele':
      b.y += (b.groundY - 26 - b.y) * 4 * dt;
      if (Math.random() < 0.5) spawnChargeParticle(b.x + (b.flipped ? -12 : 12), b.y - 14);
      if (b.stateT <= 0) {
        b.state = 'galick'; b.stateT = 1.1;
        AudioSys.sfx('kame');
        G.shake = 0.4;
        b.galickDir = b.flipped ? -1 : 1;
      }
      break;
    case 'galick': {
      // horizontal beam at body height — jump over it!
      const dir = b.galickDir;
      const beamY = b.y - 14;
      if (p.invulnT <= 0 && p.deadT <= 0) {
        const inX = dir > 0 ? p.x > b.x : p.x < b.x;
        if (inX && Math.abs((p.y - 10) - beamY) < 16) hurtPlayer();
      }
      if (Math.random() < 0.7) spawnChargeParticle(b.x + dir * (20 + Math.random() * 180), beamY + (Math.random() * 10 - 5));
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 1.8; }
      break;
    }
  }
}

// --- GINYU: space fight; sine hover right side, spreads, charge across ---
function updateGinyu(b, p, py, dt) {
  switch (b.state) {
    case 'enter':
      b.x += (G.camX + VW - 80 - b.x) * 2 * dt;
      b.y = VH * 0.48 + Math.sin(b.t * 1.5) * 60;
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 2; }
      break;
    case 'hover':
      b.x += (G.camX + VW - 80 - b.x) * 2.5 * dt;
      b.y += ((py + 20) + Math.sin(b.t * 2) * 40 - b.y) * 1.8 * dt;
      b.y = Math.max(40, Math.min(VH - 20, b.y));
      if (b.stateT <= 0) {
        const r = Math.random();
        if (r < 0.45) { b.state = 'spread'; b.stateT = 0.4; }
        else if (r < 0.8) { b.state = 'chargeTele'; b.stateT = 0.6; b.telegraphT = 0.6; b.chargeY = py; }
        else { b.state = 'orb'; b.stateT = 0.5; }
      }
      break;
    case 'spread':
      if (b.stateT <= 0) {
        for (const a of [-0.45, -0.15, 0.15, 0.45]) {
          const base = Math.atan2(py - (b.y - 12), p.x - b.x);
          G.projectiles.push({ kind: 'shot', x: b.x, y: b.y - 12, vx: Math.cos(base + a) * 175, vy: Math.sin(base + a) * 175, r: 3.5, life: 3.5, friendly: false });
        }
        AudioSys.sfx('blast');
        b.state = 'hover'; b.stateT = 1.6;
      }
      break;
    case 'chargeTele':
      b.y += (b.chargeY + 12 - b.y) * 5 * dt;
      if (b.stateT <= 0) { b.state = 'charge'; b.stateT = 1.4; AudioSys.sfx('kame'); }
      break;
    case 'charge':
      b.x -= 380 * dt;
      if (b.x < G.camX - 40) {
        b.x = G.camX + VW - 60;
        b.state = 'hover'; b.stateT = 1.4;
      }
      break;
    case 'orb':
      if (b.stateT <= 0) {
        // slow homing orb
        G.projectiles.push({ kind: 'orb', x: b.x, y: b.y - 12, vx: -60, vy: 0, r: 7, life: 6, friendly: false, homing: true });
        AudioSys.sfx('charge');
        b.state = 'hover'; b.stateT = 2.2;
      }
      break;
  }
}

// --- FRIEZA: 2 phases. Teleports, death beams; phase 2 = death ball + speed ---
function updateFrieza(b, p, py, dt) {
  const fast = b.phase === 1 ? 1.45 : 1;
  const hoverY = b.groundY - 34 + Math.sin(b.t * 2.2) * 10;
  switch (b.state) {
    case 'enter':
      b.y += (hoverY - b.y) * 2 * dt;
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 1.4; }
      break;
    case 'rage':
      b.y += (hoverY - 20 - b.y) * 3 * dt;
      if (Math.random() < 0.8) spawnAuraPurple(b.x, b.y - 14);
      if (b.stateT <= 0) { b.state = 'hover'; b.stateT = 0.8; }
      break;
    case 'hover': {
      b.y += (hoverY - b.y) * 3 * dt;
      const want = p.x + (p.x < b.x ? 100 : -100);
      b.x += (Math.max(b.arenaL + 20, Math.min(b.arenaR - 20, want)) - b.x) * 1.3 * fast * dt;
      if (b.stateT <= 0) {
        const r = Math.random();
        if (r < 0.35) { b.state = 'beams'; b.stateT = 1.4 / fast; b.volleyN = b.phase === 1 ? 6 : 4; }
        else if (r < 0.6) { b.state = 'teleport'; b.stateT = 0.3; }
        else if (r < 0.85 || b.phase === 0) { b.state = 'dashTele'; b.stateT = 0.5 / fast; b.telegraphT = 0.5 / fast; }
        else { b.state = 'deathballTele'; b.stateT = 1.0; b.telegraphT = 1.0; }
      }
      break;
    }
    case 'beams': {
      b.y += (hoverY - b.y) * 3 * dt;
      const interval = (1.4 / fast) / (b.phase === 1 ? 6 : 4);
      const fired = Math.floor((1.4 / fast - b.stateT) / interval);
      if (fired > (b.firedN || 0)) {
        b.firedN = fired;
        bossShoot(b.x + (b.flipped ? -8 : 8), b.y - 16, p.x + (Math.random() - 0.5) * 30, py + (Math.random() - 0.5) * 20, 230, 2.5);
        AudioSys.sfx('blast');
      }
      if (b.stateT <= 0) { b.firedN = 0; b.state = 'hover'; b.stateT = (1.2 + Math.random() * 0.6) / fast; }
      break;
    }
    case 'teleport':
      if (b.stateT <= 0) {
        spawnHitSpark(b.x, b.y - 14);
        const side = Math.random() < 0.5 ? -1 : 1;
        b.x = Math.max(b.arenaL + 24, Math.min(b.arenaR - 24, p.x + side * 70));
        b.y = py - 10;
        spawnHitSpark(b.x, b.y - 14);
        AudioSys.sfx('radar');
        b.state = 'beams'; b.stateT = 0.8 / fast; b.volleyN = 2; b.firedN = 0;
      }
      break;
    case 'dashTele':
      if (b.stateT <= 0) {
        b.state = 'dash';
        b.dashVX = Math.sign(p.x - b.x) * 360 * fast;
        b.dashY = py;
        b.stateT = 0.6;
        AudioSys.sfx('kame');
      }
      break;
    case 'dash':
      b.x += b.dashVX * dt;
      b.y += (b.dashY + 10 - b.y) * 6 * dt;
      if (b.x < b.arenaL + 14 || b.x > b.arenaR - 14 || b.stateT <= 0) {
        b.x = Math.max(b.arenaL + 14, Math.min(b.arenaR - 14, b.x));
        b.state = 'hover'; b.stateT = 1.2 / fast;
      }
      break;
    case 'deathballTele':
      b.y += (b.groundY - 70 - b.y) * 3 * dt;
      if (Math.random() < 0.8) spawnAuraPurple(b.x + (Math.random() - 0.5) * 30, b.y - 30);
      if (b.stateT <= 0) {
        b.state = 'hover'; b.stateT = 2.0;
        AudioSys.sfx('kame');
        G.shake = 0.5;
        G.projectiles.push({ kind: 'deathball', x: b.x, y: b.y - 24, vx: Math.sign(p.x - b.x) * 90, vy: 30, r: 14, life: 5, friendly: false });
      }
      break;
  }
}

function spawnAuraPurple(x, y) {
  G.particles.push({ x: x + (Math.random() - 0.5) * 16, y: y + 8, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 70, life: 0.4, maxLife: 0.4, color: Math.random() < 0.5 ? '#a05ad8' : '#e060ff', size: 2 + Math.random() * 2.5 });
}

// ---------------- boss rendering ----------------
function drawBoss(ctx, camX, camY) {
  const b = G.boss;
  if (!b) return;
  const x = b.x - camX, y = b.y - camY;
  if (b.hurtT > 0 && Math.floor(b.hurtT * 30) % 2 === 0) return; // hit flicker
  let img = null;
  const f2 = Math.floor(b.t * 4) % 2 === 0;
  switch (b.kind) {
    case 'mech': img = Sprites.mech; break;
    case 'vegeta': img = (b.state === 'volley' || b.state === 'galick' || b.state === 'galickTele') ? Sprites.vegeta2 : Sprites.vegeta1; break;
    case 'ginyu': img = f2 ? Sprites.ginyu1 : Sprites.ginyu2; break;
    case 'frieza': img = f2 ? Sprites.frieza1 : Sprites.frieza2; break;
  }
  // telegraph glow
  if (b.telegraphT > 0 && (b.state.includes('Tele') || b.state === 'stomp' || b.state === 'shoot')) {
    b.telegraphT -= 1 / 60;
    ctx.fillStyle = 'rgba(255,60,60,0.35)';
    ctx.beginPath(); ctx.arc(x, y - (b.kind === 'mech' ? 18 : 13), 22 + Math.sin(b.t * 18) * 4, 0, 7); ctx.fill();
  }
  // frieza phase-2 aura
  if (b.kind === 'frieza' && b.phase === 1 && !b.dead) {
    ctx.fillStyle = 'rgba(160,90,216,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y - 13, 18 + Math.sin(b.t * 10) * 3, 22, 0, 0, 7); ctx.fill();
  }
  if (img) drawSprite(ctx, img, x, y, b.flipped, 1.4);
  // galick gun / vegeta beam
  if (b.kind === 'vegeta' && b.state === 'galick') {
    const dir = b.galickDir;
    const by = y - 19;
    const len = dir > 0 ? VW - x : x;
    ctx.fillStyle = 'rgba(190,80,255,0.85)';
    ctx.fillRect(dir > 0 ? x + 14 : x - 14 - len, by - 7, len, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dir > 0 ? x + 14 : x - 14 - len, by - 3, len, 6);
  }
}
