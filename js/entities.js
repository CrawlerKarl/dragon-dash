// ============================================================
// Dragon Dash — player physics, enemies, projectiles, particles
// All update functions operate on the global game state `G`
// ============================================================

const PHYS = {
  RUN_ACC: 620, MAX_RUN: 215, FRICTION: 520, SKID: 1300,
  AIR_ACC: 480, GRAV: 1040, JUMP_V: -348, JUMP_CUT: -120,
  SPRING_V: -560, DASH_BOOST: 360, MAX_FALL: 460,
  SS_SPEED: 1.32, SS_JUMP: 1.12,
};

function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 12, h: 20,
    facing: 1, onGround: false, anim: 0,
    attackT: 0, attackKind: null, // 'punch' | 'blast' | 'kame'
    chargeT: 0, charging: false,
    kameT: 0,
    hurtT: 0, invulnT: 0, deadT: 0,
    ki: 50, kiMax: 100,
    ss: false, ssT: 0, ssPermanent: false,
    flyMode: false, fy: 135,
    boostT: 0,
  };
}

// ---------------- PLAYER ----------------
function updatePlayer(dt) {
  const p = G.player;
  const inp = Input;
  if (p.deadT > 0) { p.deadT -= dt; p.vy += PHYS.GRAV * dt; p.y += p.vy * dt; if (p.deadT <= 0) respawnPlayer(); return; }

  if (p.flyMode) { updatePlayerFly(dt); return; }

  const spdMul = (p.ss ? PHYS.SS_SPEED : 1) * (p.boostT > 0 ? 1.45 : 1);
  const maxRun = PHYS.MAX_RUN * spdMul;
  if (p.boostT > 0) p.boostT -= dt;

  // --- horizontal input ---
  let move = 0;
  if (inp.left) move = -1;
  if (inp.right) move = 1;
  const controlLocked = p.hurtT > 0 || p.kameT > 0 || (p.charging && p.onGround);
  if (!controlLocked && move !== 0) {
    p.facing = move;
    const acc = p.onGround ? (Math.sign(p.vx) === -move && Math.abs(p.vx) > 40 ? PHYS.SKID : PHYS.RUN_ACC) : PHYS.AIR_ACC;
    p.vx += move * acc * dt;
    if (Math.abs(p.vx) > maxRun && Math.sign(p.vx) === move) p.vx = move * Math.max(Math.abs(p.vx) - PHYS.FRICTION * dt * 2, maxRun);
  } else if (p.onGround) {
    const f = PHYS.FRICTION * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= Math.sign(p.vx) * f;
  }

  // --- jump ---
  if (inp.jumpPressed && p.onGround && !controlLocked) {
    p.vy = PHYS.JUMP_V * (p.ss ? PHYS.SS_JUMP : 1);
    p.onGround = false;
    AudioSys.sfx('jump');
    spawnDust(p.x, p.y, 4);
  }
  if (!inp.jump && p.vy < PHYS.JUMP_CUT) p.vy = PHYS.JUMP_CUT;

  // --- gravity ---
  p.vy += PHYS.GRAV * dt;
  if (p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;

  // --- attack input ---
  handleAttacks(dt);

  // --- integrate + collide ---
  moveAndCollide(p, dt);

  // dash pads
  if (p.onGround && dashAt(G.level, p.x, p.y + 2)) {
    if (Math.abs(p.vx) < PHYS.DASH_BOOST) {
      p.vx = (p.facing || 1) * PHYS.DASH_BOOST;
      p.boostT = 1.2;
      AudioSys.sfx('spring');
      spawnDust(p.x, p.y, 8);
    }
  }

  // spikes
  if (p.invulnT <= 0 && (spikeAt(G.level, p.x, p.y + 1) || spikeAt(G.level, p.x - 4, p.y + 1) || spikeAt(G.level, p.x + 4, p.y + 1))) {
    hurtPlayer();
  }

  // fell off world
  if (p.y > G.level.H * TILE + 40) killPlayer();

  // timers
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.invulnT > 0) p.invulnT -= dt;
  if (p.attackT > 0) { p.attackT -= dt; if (p.attackT <= 0) p.attackKind = null; }
  if (p.kameT > 0) p.kameT -= dt;
  if (p.ss && !p.ssPermanent) {
    p.ssT -= dt;
    if (p.ssT <= 0) { p.ss = false; AudioSys.sfx('scatter'); }
  }
  // ki regen
  p.ki = Math.min(p.kiMax, p.ki + (p.ss ? 14 : 6) * dt);
  p.anim += dt * (1 + Math.abs(p.vx) / 60);

  // SS aura particles
  if (p.ss && Math.random() < 0.5) spawnAura(p.x, p.y - 10);
}

function handleAttacks(dt) {
  const p = G.player;
  const inp = Input;
  if (p.hurtT > 0 || p.kameT > 0) { p.charging = false; p.chargeT = 0; return; }

  if (inp.attack) {
    p.chargeT += dt;
    if (p.chargeT > 0.45 && p.ki >= p.kiMax * 0.99) {
      p.charging = true;
      if (Math.random() < 0.4) spawnChargeParticle(p.x, p.y - 10);
      if (p.chargeT > 0.5 && (p.chargeT % 0.4) < dt) AudioSys.sfx('charge');
    }
  }
  if (inp.attackReleased) {
    if (p.charging && p.chargeT >= 1.1 && p.ki >= p.kiMax * 0.99) {
      fireKamehameha();
    } else if (p.chargeT < 0.45) {
      // quick tap: punch if enemy close, else ki blast
      const near = G.enemies.find(e => !e.dead && Math.abs(e.x - p.x) < 30 && Math.abs((e.y - 8) - (p.y - 10)) < 24 && Math.sign(e.x - p.x) === p.facing);
      if (near || G.boss && !G.boss.dead && Math.abs(G.boss.x - p.x) < 40) {
        doPunch();
      } else if (p.ki >= 10) {
        fireKiBlast();
      } else {
        doPunch();
      }
    }
    p.charging = false;
    p.chargeT = 0;
  }
}

function doPunch() {
  const p = G.player;
  p.attackKind = 'punch';
  p.attackT = 0.22;
  AudioSys.sfx('stomp');
  const hx = p.x + p.facing * 16, hy = p.y - 10;
  let hitSomething = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (Math.abs(e.x - hx) < 18 && Math.abs((e.y - e.h / 2) - hy) < 18) {
      damageEnemy(e, p.ss ? 4 : 2);
      hitSomething = true;
    }
  }
  if (G.boss && !G.boss.dead && Math.abs(G.boss.x - hx) < 26 && Math.abs((G.boss.y - 16) - hy) < 26) {
    damageBoss(p.ss ? 3 : 2);
    hitSomething = true;
  }
  if (hitSomething) spawnHitSpark(hx, hy);
}

function fireKiBlast() {
  const p = G.player;
  p.ki -= 10;
  p.attackKind = 'blast';
  p.attackT = 0.2;
  AudioSys.sfx('blast');
  const x0 = p.x + p.facing * 10, y0 = p.y - 11;
  let vx = p.facing * 360, vy = 0;
  // soft aim assist: home toward the boss or a nearby enemy in front of Goku
  let tgt = null;
  if (G.boss && !G.boss.dead && Math.sign(G.boss.x - p.x) === p.facing && Math.abs(G.boss.x - p.x) < 420) {
    tgt = { x: G.boss.x, y: G.boss.y - 14 };
  } else {
    let best = 1e9;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      if (Math.sign(dx) !== p.facing || Math.abs(dx) > 320) continue;
      const d = Math.abs(dx) + Math.abs(e.y - e.h / 2 - y0) * 2;
      if (d < best) { best = d; tgt = { x: e.x, y: e.y - e.h / 2 }; }
    }
  }
  if (tgt) {
    const dx = tgt.x - x0, dy = tgt.y - y0;
    const len = Math.hypot(dx, dy) || 1;
    vx = dx / len * 360; vy = dy / len * 360;
  }
  G.projectiles.push({
    kind: 'ki', x: x0, y: y0,
    vx, vy, r: p.ss ? 5 : 3.5, dmg: p.ss ? 2 : 1, life: 1.4, friendly: true,
  });
}

function fireKamehameha() {
  const p = G.player;
  p.ki = 0;
  p.kameT = 1.6;
  p.attackKind = 'kame';
  p.attackT = 1.6;
  p.vx = -p.facing * 60;
  AudioSys.sfx('kame');
  G.shake = Math.max(G.shake, 0.5);
  G.kame = { t: 1.6, dir: p.facing };
}

function updateKame(dt) {
  const p = G.player;
  if (!G.kame) return;
  G.kame.t -= dt;
  if (G.kame.t <= 0) { G.kame = null; return; }
  const dir = G.kame.dir;
  const y = p.flyMode ? p.fy : p.y - 11;
  const x0 = p.x + dir * 12;
  // damage everything in the beam path
  for (const e of G.enemies) {
    if (e.dead) continue;
    const inX = dir > 0 ? e.x > x0 - 10 : e.x < x0 + 10;
    if (inX && Math.abs((e.y - e.h / 2) - y) < 22) damageEnemy(e, 18 * dt + 0.4);
  }
  if (G.boss && !G.boss.dead) {
    const by = G.boss.y - 16;
    const inX = dir > 0 ? G.boss.x > x0 - 14 : G.boss.x < x0 + 14;
    if (inX && Math.abs(by - y) < 30) damageBoss(14 * dt);
  }
  if (Math.random() < 0.6) spawnChargeParticle(x0 + dir * (30 + Math.random() * 200), y + (Math.random() * 16 - 8));
}

function moveAndCollide(p, dt) {
  const lvl = G.level;
  // horizontal
  p.x += p.vx * dt;
  const hw = p.w / 2;
  for (const dy of [-12, -18]) {
    if (wallAt(lvl, p.x + hw, p.y + dy)) {
      p.x = Math.floor((p.x + hw) / TILE) * TILE - hw - 0.01; p.vx = Math.min(p.vx, 0);
    }
    if (wallAt(lvl, p.x - hw, p.y + dy)) {
      p.x = (Math.floor((p.x - hw) / TILE) + 1) * TILE + hw + 0.01; p.vx = Math.max(p.vx, 0);
    }
  }
  // vertical
  p.y += p.vy * dt;
  if (p.vy >= 0) {
    // grounded: stick to floor and allow stepping up slopes (up to 13px)
    const f = p.onGround ? floorAt(lvl, p.x, p.y, 8, 13) : floorAt(lvl, p.x, p.y, 2, 6);
    if (f && p.y >= f.y - 14) {
      if (!p.onGround && p.vy > 200) AudioSys.sfx('land');
      p.y = f.y;
      p.vy = 0;
      p.onGround = true;
      // slope momentum: gain speed downhill
      if (f.tile === T_SLOPE_DN && p.vx > 0) p.vx += 130 * dt;
      if (f.tile === T_SLOPE_UP && p.vx < 0) p.vx -= 130 * dt;
    } else {
      p.onGround = false;
    }
  } else {
    // ceiling
    if (solidAt(lvl, p.x, p.y - p.h)) { p.vy = 0; p.y = (Math.floor((p.y - p.h) / TILE) + 1) * TILE + p.h; }
    p.onGround = false;
  }
}

function slopeOnly(lvl, x, y) {
  const t = tileAt(lvl, Math.floor(x / TILE), Math.floor(y / TILE));
  return t === T_SLOPE_UP || t === T_SLOPE_DN;
}

// ---------------- fly mode (space zone) ----------------
function updatePlayerFly(dt) {
  const p = G.player;
  const inp = Input;
  const spd = 165 * (p.ss ? 1.25 : 1);
  let mx = 0, my = 0;
  if (inp.left) mx = -1;
  if (inp.right) mx = 1;
  if (inp.up || inp.jump) my = -1;
  if (inp.down) my = 1;
  p.x += mx * spd * dt;
  p.fy += my * spd * dt;
  p.x = Math.max(G.camX + 14, Math.min(G.camX + VW * 0.75, p.x));
  p.fy = Math.max(16, Math.min(VH - 16, p.fy));
  p.y = p.fy + 6; // keep y roughly synced for shared code
  p.facing = 1;

  // attacks: tap = blast, hold+release full = kamehameha
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.invulnT > 0) p.invulnT -= dt;
  if (p.kameT > 0) p.kameT -= dt;
  if (p.attackT > 0) { p.attackT -= dt; if (p.attackT <= 0) p.attackKind = null; }
  if (p.kameT <= 0) {
    if (inp.attack) {
      p.chargeT += dt;
      if (p.chargeT > 0.45 && p.ki >= p.kiMax * 0.99) {
        p.charging = true;
        if (Math.random() < 0.4) spawnChargeParticle(p.x + 10, p.fy);
      }
    }
    if (inp.attackReleased) {
      if (p.charging && p.chargeT >= 1.1 && p.ki >= p.kiMax * 0.99) {
        fireKamehameha();
      } else if (p.chargeT < 0.45 && p.ki >= 6) {
        p.ki -= 6;
        p.attackKind = 'blast'; p.attackT = 0.15;
        AudioSys.sfx('blast');
        let vx = 420, vy = 0;
        let tgt = null;
        if (G.boss && !G.boss.dead && G.boss.x > p.x) tgt = { x: G.boss.x, y: G.boss.y - 12 };
        else {
          let best = 1e9;
          for (const e of G.enemies) {
            if (e.dead || e.x <= p.x + 10) continue;
            const d = (e.x - p.x) + Math.abs(e.y - e.h / 2 - p.fy) * 2;
            if (d < best) { best = d; tgt = { x: e.x, y: e.y - e.h / 2 }; }
          }
        }
        if (tgt) {
          const dx = tgt.x - (p.x + 14), dy = tgt.y - p.fy;
          const len = Math.hypot(dx, dy) || 1;
          vx = dx / len * 420; vy = dy / len * 420;
        }
        G.projectiles.push({ kind: 'ki', x: p.x + 14, y: p.fy, vx, vy, r: p.ss ? 5 : 3.5, dmg: p.ss ? 2 : 1, life: 1.4, friendly: true });
      }
      p.charging = false; p.chargeT = 0;
    }
  }
  p.ki = Math.min(p.kiMax, p.ki + (p.ss ? 16 : 9) * dt);
  if (p.ss && !p.ssPermanent) { p.ssT -= dt; if (p.ssT <= 0) p.ss = false; }
  if (p.ss && Math.random() < 0.5) spawnAura(p.x - 8, p.fy + 6);
  p.anim += dt * 4;
}

// ---------------- damage / death ----------------
function hurtPlayer() {
  const p = G.player;
  if (p.invulnT > 0 || p.deadT > 0) return;
  if (G.zeni > 0) {
    scatterZeni(Math.min(G.zeni, 20));
    G.zeni -= Math.min(G.zeni, 20);
    p.hurtT = 0.4; p.invulnT = 1.6;
    p.vy = -200; p.vx = -p.facing * 130;
    p.charging = false; p.chargeT = 0;
    AudioSys.sfx('hurt');
  } else if (p.ss) {
    p.hurtT = 0.4; p.invulnT = 1.6;
    p.vy = -200;
    AudioSys.sfx('hurt');
  } else {
    killPlayer();
  }
}

function killPlayer() {
  const p = G.player;
  if (p.deadT > 0) return;
  p.deadT = 1.6;
  p.vy = -340; p.vx = 0;
  AudioSys.sfx('death');
}

function respawnPlayer() {
  const p = G.player;
  const cp = G.checkpoint;
  p.x = cp.x; p.y = cp.y; p.vx = 0; p.vy = 0;
  p.fy = 135;
  p.invulnT = 2; p.hurtT = 0; p.deadT = 0;
  p.ki = 50;
  G.kame = null;
  G.zeni = Math.max(G.zeni, 10); // mercy zeni so you're never at zero
  if (G.state === 'boss' && G.boss) {
    // retry boss with arena reset
    G.boss.hp = G.boss.hpMax;
    G.boss.phase = 0; G.boss.t = 0;
    G.projectiles.length = 0;
  }
}

function scatterZeni(n) {
  const p = G.player;
  AudioSys.sfx('scatter');
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI - Math.PI; // upward fan
    G.pickups.push({
      type: 'zeni', x: p.x, y: p.y - 10,
      vx: Math.cos(a) * (60 + Math.random() * 90),
      vy: -120 - Math.random() * 140,
      scattered: true, life: 5, graceT: 0.6,
    });
  }
}

// ---------------- ENEMIES ----------------
function spawnEnemiesFromLevel(level) {
  G.enemies = [];
  G.pickups = [];
  G.springs = [];
  G.checkpoints = [];
  G.npcs = [];
  G.bossTrigger = null;
  for (const e of level.ents || []) {
    switch (e.type) {
      case 'zeni': G.pickups.push({ type: 'zeni', x: e.x, y: e.y, life: Infinity }); break;
      case 'dragonball':
        if (!G.save.balls.includes(e.id)) G.pickups.push({ type: 'dragonball', x: e.x, y: e.y - 6, id: e.id, life: Infinity });
        break;
      case 'senzu': G.pickups.push({ type: 'senzu', x: e.x, y: e.y, life: Infinity }); break;
      case 'spring': G.springs.push({ x: e.x, y: e.y, t: 0 }); break;
      case 'checkpoint': G.checkpoints.push({ x: e.x, y: e.y, hit: false }); break;
      case 'npc_bulma': G.npcs.push({ kind: 'bulma', x: e.x, y: e.y }); break;
      case 'boss_trigger': G.bossTrigger = e; break;
      case 'rrbot': G.enemies.push(makeEnemy('rrbot', e.x, e.y)); break;
      case 'drone': G.enemies.push(makeEnemy('drone', e.x, e.y - 10)); break;
      case 'drone_f': G.enemies.push(makeEnemy('drone', e.x, e.y, { frieza: true })); break;
      case 'saiba': G.enemies.push(makeEnemy('saiba', e.x, e.y)); break;
      case 'soldier_g': G.enemies.push(makeEnemy('soldier_g', e.x, e.y)); break;
    }
  }
}

function makeEnemy(kind, x, y, opts = {}) {
  const base = { kind, x, y, vx: 0, vy: 0, dead: false, t: Math.random() * 3, hurtT: 0, homeX: x, homeY: y };
  switch (kind) {
    case 'rrbot': return Object.assign(base, { hp: 2, w: 14, h: 20, dir: -1, shootT: 1.5 });
    case 'drone': return Object.assign(base, { hp: 1, w: 12, h: 8, frieza: !!opts.frieza });
    case 'saiba': return Object.assign(base, { hp: 2, w: 12, h: 16, hopT: 1 + Math.random() });
    case 'soldier': return Object.assign(base, { hp: 2, w: 14, h: 18, shootT: 1.2, fly: true });
    case 'soldier_g': return Object.assign(base, { hp: 3, w: 14, h: 18, shootT: 1.8, dir: -1 });
    case 'asteroid': return Object.assign(base, { hp: 3, w: 20, h: 20, rot: 0, r: 10 + Math.random() * 6 });
  }
  return base;
}

function updateEnemies(dt) {
  const p = G.player;
  const py = p.flyMode ? p.fy : p.y - 10;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.hurtT > 0) e.hurtT -= dt;
    const distX = p.x - e.x;
    switch (e.kind) {
      case 'rrbot': {
        e.vx = e.dir * 28;
        e.x += e.vx * dt;
        const f = floorAt(G.level, e.x + e.dir * 8, e.y, 6);
        if (!f || solidAt(G.level, e.x + e.dir * 8, e.y - 8)) e.dir *= -1;
        e.shootT -= dt;
        if (e.shootT <= 0 && Math.abs(distX) < 170 && Math.abs(py - (e.y - 10)) < 30 && onScreen(e)) {
          e.shootT = 2.4;
          const d = Math.sign(distX) || 1;
          G.projectiles.push({ kind: 'shot', x: e.x + d * 8, y: e.y - 10, vx: d * 150, vy: 0, r: 3, life: 2.5, friendly: false });
          AudioSys.sfx('blast');
        }
        break;
      }
      case 'drone': {
        e.y = e.homeY + Math.sin(e.t * 2.2) * 10;
        if (Math.abs(distX) < 130 && onScreen(e)) e.homeX += Math.sign(distX) * 34 * dt;
        e.x = e.homeX + Math.sin(e.t * 3.1) * 6;
        break;
      }
      case 'saiba': {
        const grounded = (() => { const f = floorAt(G.level, e.x, e.y, 4); return f && e.y >= f.y - 1; })();
        if (grounded) {
          e.vy = 0; e.vx = 0;
          const f = floorAt(G.level, e.x, e.y, 4); e.y = f.y;
          e.hopT -= dt;
          if (e.hopT <= 0 && Math.abs(distX) < 150 && onScreen(e)) {
            e.hopT = 1.4 + Math.random() * 0.6;
            e.vy = -260; e.vx = Math.sign(distX) * (90 + Math.random() * 50);
            AudioSys.sfx('jump');
          }
        } else {
          e.vy += PHYS.GRAV * 0.9 * dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.vy > 0) { const f = floorAt(G.level, e.x, e.y, 4); if (f && e.y >= f.y - 1) { e.y = f.y; e.vy = 0; } }
        }
        break;
      }
      case 'soldier': { // space zone, flies leftward
        e.x -= 95 * dt;
        e.y = e.homeY + Math.sin(e.t * 2.4) * 26;
        e.shootT -= dt;
        if (e.shootT <= 0 && e.x > p.x) {
          e.shootT = 1.7;
          const dx = p.x - e.x, dy = py - e.y;
          const len = Math.hypot(dx, dy) || 1;
          G.projectiles.push({ kind: 'shot', x: e.x - 8, y: e.y, vx: dx / len * 170, vy: dy / len * 170, r: 3, life: 3, friendly: false });
          AudioSys.sfx('blast');
        }
        if (e.x < G.camX - 40) e.dead = true;
        break;
      }
      case 'soldier_g': { // namek, hovers and strafes
        e.y = e.homeY - 14 + Math.sin(e.t * 2) * 6;
        if (Math.abs(distX) < 180 && onScreen(e)) {
          e.x += Math.sign(distX) * 26 * dt;
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = 2.1;
            const dx = p.x - e.x, dy = (p.y - 10) - (e.y - 10);
            const len = Math.hypot(dx, dy) || 1;
            G.projectiles.push({ kind: 'shot', x: e.x, y: e.y - 10, vx: dx / len * 160, vy: dy / len * 160, r: 3, life: 3, friendly: false });
            AudioSys.sfx('blast');
          }
        }
        break;
      }
      case 'asteroid': {
        e.x -= (70 + e.r * 2) * dt;
        e.rot += dt * 1.5;
        if (e.x < G.camX - 50) e.dead = true;
        break;
      }
    }
    // touch damage & stomp
    if (p.invulnT <= 0 && p.deadT <= 0 && !e.dead) {
      const ey = e.y - e.h / 2;
      const pyc = p.flyMode ? p.fy : p.y - 10;
      if (Math.abs(e.x - p.x) < (e.w + p.w) / 2 && Math.abs(ey - pyc) < (e.h + p.h) / 2) {
        if (!p.flyMode && p.vy > 60 && p.y - 6 < ey) {
          // stomp!
          damageEnemy(e, 2);
          p.vy = Input.jump ? -330 : -200;
          AudioSys.sfx('stomp');
        } else if (p.ss && e.kind !== 'asteroid') {
          damageEnemy(e, 4); // SS plows through grunts
        } else {
          hurtPlayer();
        }
      }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead || e.deathT > 0);
}

function onScreen(e) {
  return e.x > G.camX - 24 && e.x < G.camX + VW + 24 && e.y > G.camY - 24 && e.y < G.camY + VH + 24;
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.hurtT = 0.15;
  if (e.hp <= 0) {
    e.dead = true;
    AudioSys.sfx('explode');
    spawnExplosion(e.x, e.y - e.h / 2);
    G.score += 100;
    // drop zeni
    for (let i = 0; i < 3; i++) {
      G.pickups.push({ type: 'zeni', x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 120, vy: -100 - Math.random() * 80, scattered: true, life: 6, graceT: 0 });
    }
  } else {
    AudioSys.sfx('hit');
  }
}

// ---------------- PROJECTILES ----------------
function updateProjectiles(dt) {
  const p = G.player;
  for (const pr of G.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { pr.dead = true; continue; }
    if (pr.friendly) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - pr.x) < e.w / 2 + pr.r + 2 && Math.abs((e.y - e.h / 2) - pr.y) < e.h / 2 + pr.r + 2) {
          damageEnemy(e, pr.dmg);
          pr.dead = true;
          spawnHitSpark(pr.x, pr.y);
          break;
        }
      }
      if (!pr.dead && G.boss && !G.boss.dead && bossHitTest(pr.x, pr.y, pr.r)) {
        damageBoss(pr.dmg);
        pr.dead = true;
        spawnHitSpark(pr.x, pr.y);
      }
      if (!pr.dead && !p.flyMode && solidAt(G.level, pr.x, pr.y)) { pr.dead = true; spawnHitSpark(pr.x, pr.y); }
    } else {
      const pyc = p.flyMode ? p.fy : p.y - 10;
      if (p.invulnT <= 0 && p.deadT <= 0 && Math.abs(pr.x - p.x) < p.w / 2 + pr.r && Math.abs(pr.y - pyc) < p.h / 2 + pr.r) {
        pr.dead = true;
        hurtPlayer();
      }
      if (!p.flyMode && solidAt(G.level, pr.x, pr.y)) pr.dead = true;
    }
  }
  G.projectiles = G.projectiles.filter(pr => !pr.dead);
}

// ---------------- PICKUPS / SPRINGS / CHECKPOINTS ----------------
function updatePickups(dt) {
  const p = G.player;
  const pyc = p.flyMode ? p.fy : p.y - 10;
  for (const pk of G.pickups) {
    if (pk.scattered) {
      if (p.flyMode) {
        // in space: drift and slow, no gravity
        pk.vx *= 0.96; pk.vy *= 0.96;
        pk.x += pk.vx * dt;
        pk.y += pk.vy * dt;
      } else {
        pk.vy += PHYS.GRAV * 0.8 * dt;
        pk.x += pk.vx * dt;
        pk.y += pk.vy * dt;
        if (pk.vy > 0) {
          const f = floorAt(G.level, pk.x, pk.y, 4);
          if (f && pk.y >= f.y - 1) { pk.y = f.y - 1; pk.vy *= -0.55; pk.vx *= 0.8; }
        }
      }
      pk.life -= dt;
      if (pk.graceT > 0) pk.graceT -= dt;
      if (pk.life <= 0) { pk.dead = true; continue; }
    }
    if (pk.graceT > 0 || pk.dead) continue;
    const dx = pk.x - p.x, dy = pk.y - (p.flyMode ? p.fy : p.y - 10);
    if (Math.abs(dx) < 14 && Math.abs(dy) < 16) {
      pk.dead = true;
      if (pk.type === 'zeni') {
        G.zeni++; G.score += 10;
        AudioSys.sfx('coin');
        if (G.zeni === 200) { AudioSys.sfx('powerup'); G.toast('200 ZENI! Press TRANSFORM to go SUPER SAIYAN!', 4); }
      } else if (pk.type === 'dragonball') {
        G.save.balls.push(pk.id);
        saveGame();
        AudioSys.sfx('dragonball');
        G.shake = 0.3;
        G.toast(`DRAGON BALL ${G.save.balls.length}/7 FOUND!`, 3.5);
        if (G.save.balls.length >= 7) {
          G.toast('ALL 7 DRAGON BALLS! Super Saiyan is PERMANENT when you transform!', 5);
        }
      } else if (pk.type === 'senzu') {
        p.ki = p.kiMax;
        G.zeni += 25;
        AudioSys.sfx('powerup');
        G.toast('Senzu Bean! +25 zeni, full Ki!', 2.5);
      }
    }
  }
  G.pickups = G.pickups.filter(pk => !pk.dead);

  // springs
  if (!p.flyMode) {
    for (const s of G.springs) {
      if (s.t > 0) s.t -= dt;
      if (Math.abs(p.x - s.x) < 12 && Math.abs(p.y - s.y) < 10 && p.vy >= 0) {
        p.vy = PHYS.SPRING_V;
        p.onGround = false;
        s.t = 0.3;
        AudioSys.sfx('spring');
      }
    }
    for (const c of G.checkpoints) {
      if (!c.hit && Math.abs(p.x - c.x) < 14 && Math.abs(p.y - c.y) < 24) {
        c.hit = true;
        G.checkpoint = { x: c.x, y: c.y - 2 };
        AudioSys.sfx('checkpoint');
        G.toast('Checkpoint!', 1.5);
      }
    }
  }
}

// ---------------- PARTICLES ----------------
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    G.particles.push({ x: x + (Math.random() - 0.5) * 10, y: y - 2, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40, life: 0.4, maxLife: 0.4, color: '#cccccc', size: 2 });
  }
}
function spawnExplosion(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 130;
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, maxLife: 0.5, color: ['#ffd824', '#ff8c1a', '#e03131', '#ffffff'][i % 4], size: 2 + Math.random() * 2 });
  }
}
function spawnHitSpark(x, y) {
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    G.particles.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.25, maxLife: 0.25, color: '#9ad1ff', size: 2 });
  }
}
function spawnAura(x, y) {
  G.particles.push({ x: x + (Math.random() - 0.5) * 14, y: y + 8, vx: (Math.random() - 0.5) * 20, vy: -60 - Math.random() * 60, life: 0.35, maxLife: 0.35, color: Math.random() < 0.5 ? '#ffe23a' : '#fff7a8', size: 2 + Math.random() * 2.5 });
}
function spawnChargeParticle(x, y) {
  const a = Math.random() * Math.PI * 2;
  const r = 16 + Math.random() * 10;
  G.particles.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.3, maxLife: 0.3, color: '#52d8f0', size: 2 });
}
function updateParticles(dt) {
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  G.particles = G.particles.filter(pt => pt.life > 0);
}

// ---------------- TRANSFORM ----------------
function tryTransform() {
  const p = G.player;
  if (p.ss) return;
  const hasBalls = G.save.balls.length >= 7;
  if (hasBalls) {
    p.ss = true; p.ssPermanent = true; p.ssT = 9999;
  } else if (G.zeni >= 200) {
    G.zeni -= 200;
    p.ss = true; p.ssT = 30;
  } else {
    G.toast('Need 200 zeni or all 7 Dragon Balls to transform!', 2.5);
    AudioSys.sfx('scatter');
    return;
  }
  AudioSys.sfx('transform');
  G.shake = 0.6;
  G.flashT = 0.5;
  p.ki = p.kiMax;
  p.invulnT = 1.5;
  for (let i = 0; i < 30; i++) spawnAura(p.x, (p.flyMode ? p.fy : p.y - 10));
  G.toast(p.ssPermanent ? 'SUPER SAIYAN — THE LEGEND AWAKENS!' : 'SUPER SAIYAN! (30 seconds)', 3);
}
