// ============================================================
// Dragon Dash — main game: input, states, camera, render, loop
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// dynamic internal resolution: landscape 480x270, portrait 270x480
let VW = 480, VH = 270;

// touch button layout, recomputed for the current resolution
const BTN = {};
function layoutButtons() {
  BTN.jump = { x: VW - 48, y: VH - 44, r: 30 };
  BTN.attack = { x: VW - 116, y: VH - 32, r: 25 };
  BTN.transform = { x: VW - 48, y: VH - 104, r: 18 };
  BTN.pause = { x: 16, y: 14, r: 13 };
  BTN.mute = { x: VW - 16, y: 14, r: 13 };
}

// ---------------- canvas scaling ----------------
function fitCanvas() {
  const ww = window.innerWidth, wh = window.innerHeight;
  if (!ww || !wh) return; // transient zero-size; try again later
  const portrait = wh > ww;
  const nw = portrait ? 270 : 480, nh = portrait ? 480 : 270;
  if (nw !== VW || nh !== VH) {
    VW = nw; VH = nh;
    canvas.width = VW; canvas.height = VH;
    layoutButtons();
  }
  let scale = Math.min(ww / VW, wh / VH);
  if (scale > 1.5) scale = Math.floor(scale * 2) / 2;
  canvas.style.width = (VW * scale) + 'px';
  canvas.style.height = (VH * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 120));
setInterval(fitCanvas, 500); // self-heal if a resize was missed
layoutButtons();
fitCanvas();

// ---------------- input ----------------
const Input = {
  left: false, right: false, up: false, down: false,
  jump: false, jumpPressed: false,
  attack: false, attackReleased: false,
  transformPressed: false, pausePressed: false,
  tapped: false,
  _prevJump: false, _prevAttack: false,
  isTouch: false,
};
const keys = {};
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  keys[e.key.toLowerCase()] = true;
  AudioSys.init(); AudioSys.resume();
  if (e.key === 'Enter' || e.key.toLowerCase() === 'z' || e.key === ' ') Input.tapped = true;
  if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'j') Input.tapped = true;
  if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'k') Input.transformPressed = true;
  if (e.key.toLowerCase() === 'p' || e.key === 'Escape') Input.pausePressed = true;
  if (e.key.toLowerCase() === 'm') AudioSys.toggleMute();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// touch
const touches = {}; // id -> {sx, sy, x, y, t, zone}
function canvasPos(t) {
  const r = canvas.getBoundingClientRect();
  return { x: (t.clientX - r.left) / r.width * VW, y: (t.clientY - r.top) / r.height * VH };
}
function inBtn(p, b) { return Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 6; }
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  Input.isTouch = true;
  AudioSys.init(); AudioSys.resume();
  for (const t of e.changedTouches) {
    const p = canvasPos(t);
    let zone = 'stick';
    if (inBtn(p, BTN.jump)) { zone = 'jump'; }
    else if (inBtn(p, BTN.attack)) { zone = 'attack'; }
    else if (inBtn(p, BTN.transform) && transformAvailable()) { zone = 'transform'; Input.transformPressed = true; }
    else if (inBtn(p, BTN.pause)) { zone = 'pause'; Input.pausePressed = true; }
    else if (inBtn(p, BTN.mute)) { zone = 'mute'; AudioSys.toggleMute(); }
    else if (p.x > VW * 0.5) { zone = 'jump'; } // right half fallback = jump (outside buttons)
    touches[t.identifier] = { sx: p.x, sy: p.y, x: p.x, y: p.y, t: performance.now(), zone };
    Input.tapped = true;
    lastPointer = p;
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const tr = touches[t.identifier];
    if (!tr) continue;
    const p = canvasPos(t);
    tr.x = p.x; tr.y = p.y;
  }
}, { passive: false });
function endTouch(e) {
  e.preventDefault();
  for (const t of e.changedTouches) delete touches[t.identifier];
}
canvas.addEventListener('touchend', endTouch, { passive: false });
canvas.addEventListener('touchcancel', endTouch, { passive: false });
let lastPointer = null; // canvas-space coords of the most recent tap/click (for menu hit tests)
canvas.addEventListener('mousedown', e => {
  AudioSys.init(); AudioSys.resume();
  Input.tapped = true;
  lastPointer = canvasPos(e);
});

function pollInput() {
  // keyboard
  let L = keys['arrowleft'] || keys['a'];
  let R = keys['arrowright'] || keys['d'];
  let U = keys['arrowup'] || keys['w'];
  let D = keys['arrowdown'] || keys['s'];
  let J = keys['z'] || keys[' '] || keys['arrowup'] || keys['w'];
  let A = keys['x'] || keys['j'];
  // touch
  for (const id in touches) {
    const tr = touches[id];
    if (tr.zone === 'stick') {
      const dx = tr.x - tr.sx, dy = tr.y - tr.sy;
      if (dx < -9) L = true;
      if (dx > 9) R = true;
      if (dy < -12) U = true;
      if (dy > 12) D = true;
    } else if (tr.zone === 'jump') J = true;
    else if (tr.zone === 'attack') A = true;
  }
  Input.left = !!L; Input.right = !!R; Input.up = !!U; Input.down = !!D;
  Input.jump = !!J;
  Input.jumpPressed = Input.jump && !Input._prevJump;
  Input.attack = !!A;
  Input.attackReleased = !Input.attack && Input._prevAttack;
}
function lateInput() {
  Input._prevJump = Input.jump;
  Input._prevAttack = Input.attack;
  Input.tapped = false;
  Input.transformPressed = false;
  Input.pausePressed = false;
  lastPointer = null;
}

// ---------------- save ----------------
const SAVE_KEY = 'dragondash_v1';
function defaultSave() { return { zone: 0, balls: [], zeni: 0, radar: false, beaten: false, maxZone: 0 }; }
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.balls)) return Object.assign(defaultSave(), s);
  } catch (e) {}
  return defaultSave();
}
function saveGame() {
  G.save.zeni = G.zeni;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {}
}

// ---------------- game state ----------------
const G = {
  state: 'title',
  save: loadSave(),
  zoneIdx: 0,
  level: null,
  player: null,
  enemies: [], projectiles: [], pickups: [], particles: [],
  springs: [], checkpoints: [], npcs: [],
  boss: null, bossTrigger: null,
  camX: 0, camY: 0,
  zeni: 0, score: 0, time: 0,
  shake: 0, flashT: 0,
  bannerT: 0,
  toastMsg: '', toastT: 0,
  kame: null,
  checkpoint: { x: 48, y: 320 },
  dialogue: null, // {lines, idx, chars, done, after}
  travelT: 0, travelFrom: '', travelTo: '',
  endT: 0, endPhase: 0,
  paused: false,
  menuIdx: 0,
  titleT: 0,
  flyT: 0, waveIdx: 0,
  spaceIntroDone: false,
  toast(msg, dur) { G.toastMsg = msg; G.toastT = dur; },
};

function transformAvailable() {
  return G.player && !G.player.ss && (G.state === 'play' || G.state === 'boss') &&
    (G.zeni >= 200 || G.save.balls.length >= 7);
}

// ---------------- dialogue ----------------
const PORTRAITS = {
  goku: () => Sprites.idle, goku_ss: () => Sprites.ss_idle,
  bulma: () => Sprites.bulma,
  mech: () => Sprites.mech, vegeta: () => Sprites.vegeta1,
  ginyu: () => Sprites.ginyu1, frieza: () => Sprites.frieza1,
  shenron: () => Sprites.shenron,
};
const NAMES = { goku: 'GOKU', goku_ss: 'GOKU', bulma: 'BULMA', mech: 'RR MECH', vegeta: 'VEGETA', ginyu: 'GINYU', frieza: 'FRIEZA', shenron: 'SHENRON' };

function startDialogue(lines, after) {
  G.dialogue = { lines, idx: 0, chars: 0, after: after || null };
}
function updateDialogue(dt) {
  const d = G.dialogue;
  if (!d) return;
  const line = d.lines[d.idx];
  if (d.chars < line.text.length) {
    d.chars += dt * 45;
    if (Math.floor(d.chars) % 3 === 0) AudioSys.sfx('text');
    if (d.chars > line.text.length) d.chars = line.text.length;
  }
  if (Input.tapped) {
    AudioSys.sfx('select');
    if (d.chars < line.text.length) {
      d.chars = line.text.length;
    } else {
      d.idx++;
      d.chars = 0;
      if (d.idx >= d.lines.length) {
        G.dialogue = null;
        if (d.after) d.after();
      }
    }
  }
}

const DIALOGUES = {
  intro: [
    { who: 'bulma', text: "Goku! Frieza's henchmen are tearing up West City hunting for the Dragon Balls!" },
    { who: 'goku', text: "Not on my watch! I'll send them packing!" },
    { who: 'bulma', text: "Take my DRAGON RADAR — it points to any Dragon Ball nearby. Find all 7 before Frieza does!" },
    { who: 'bulma', text: "Oh — and grab zeni as you go! With 200 zeni of energy you can push past your limits... maybe even go SUPER SAIYAN!" },
    { who: 'goku', text: "Right! Here I go!" },
  ],
  pre_mech: [
    { who: 'mech', text: "TARGET ACQUIRED: SON GOKU. SURRENDER THE DRAGON BALLS." },
    { who: 'goku', text: "A Red Ribbon mech?! Sorry, big guy — let's dance!" },
  ],
  post_mech: [
    { who: 'goku', text: "Piece of cake! The radar says the next Dragon Ball is out in the rocky wasteland..." },
    { who: 'bulma', text: "(radio) Take my capsule ship, Goku! And be careful — I'm picking up a HUGE power level out there!" },
  ],
  pre_vegeta: [
    { who: 'vegeta', text: "Kakarot! Hand over the Dragon Balls, you low-class clown." },
    { who: 'vegeta', text: "Wait... my scouter says your power level... IT'S OVER 9000!? THAT CAN'T BE RIGHT!" },
    { who: 'goku', text: "Vegeta! I don't want to fight you... but I will!" },
  ],
  post_vegeta: [
    { who: 'vegeta', text: "Tch... enjoy your little victory, Kakarot. Frieza will crush you anyway!" },
    { who: 'goku', text: "Frieza?! The radar's pointing... up?! To SPACE! Time to fly!" },
  ],
  pre_ginyu: [
    { who: 'ginyu', text: "Behold! You face CAPTAIN GINYU of the elite Ginyu Force! Witness my ultimate fighting pose!" },
    { who: 'goku', text: "No time for poses — Namek needs me!" },
  ],
  post_ginyu: [
    { who: 'goku', text: "There it is... Planet Namek! Frieza's down there with the last Dragon Balls. Hang on, everyone!" },
  ],
  pre_frieza: [
    { who: 'frieza', text: "So the little monkey finally arrives. Ho ho ho... I'll take those Dragon Balls now." },
    { who: 'goku', text: "Frieza! For everyone you've hurt — THIS ENDS HERE!" },
  ],
};

// ---------------- zone management ----------------
function startZone(idx, fresh) {
  G.zoneIdx = idx;
  G.save.zone = idx;
  G.save.maxZone = Math.max(G.save.maxZone || 0, idx);
  const def = ZONES[idx]();
  G.level = def;
  G.enemies = []; G.projectiles = []; G.pickups = []; G.particles = [];
  G.boss = null; G.kame = null;
  G.state = 'play';
  G.bannerT = 2.6;
  G.paused = false;
  if (fresh) G.zeni = G.save.zeni || 0;
  AudioSys.playMusic(def.music);

  if (def.mode === 'fly') {
    G.player = makePlayer(60, 140);
    G.player.flyMode = true;
    G.player.fy = 135;
    G.camX = 0; G.camY = 0;
    G.flyT = 0; G.waveIdx = 0;
    G.springs = []; G.checkpoints = []; G.npcs = []; G.bossTrigger = null;
    G.checkpoint = { x: 60, y: 140 };
    restoreSS();
    return;
  }
  G.player = makePlayer(def.start.x, def.start.y);
  G.checkpoint = { x: def.start.x, y: def.start.y };
  spawnEnemiesFromLevel(def);
  G.camX = 0; G.camY = Math.max(0, def.start.y - 160);
  restoreSS();
}

function restoreSS() {
  // permanent SS carries across zones once unlocked & transformed
  if (G.ssPermanentActive) {
    G.player.ss = true; G.player.ssPermanent = true; G.player.ssT = 9999;
  }
}

function completeZone() {
  saveGame();
  if (G.zoneIdx >= 3) {
    startEnding();
  } else {
    const names = ['WEST CITY', 'ROCKY WASTELAND', 'DEEP SPACE', 'PLANET NAMEK'];
    G.travelFrom = names[G.zoneIdx];
    G.travelTo = names[G.zoneIdx + 1];
    G.travelT = 0;
    G.state = 'travel';
    AudioSys.playMusic('travel');
    G.save.zone = G.zoneIdx + 1;
    saveGame();
  }
}

// ---------------- play update ----------------
function updatePlay(dt) {
  const p = G.player;
  G.playTime = (G.playTime || 0) + dt;

  if (G.paused) return;

  if (G.level.mode === 'fly') { updateFlyZone(dt); }

  // bulma intro trigger
  if (G.zoneIdx === 0 && !G.save.radar && !G.dialogue && p.x > 9 * TILE) {
    p.vx = 0;
    startDialogue(DIALOGUES.intro, () => {
      G.save.radar = true;
      saveGame();
      AudioSys.sfx('radar');
      G.toast('Got the DRAGON RADAR! Follow the arrow to Dragon Balls!', 4);
    });
  }

  if (G.dialogue) { updateDialogue(dt); return; }

  if (Input.transformPressed) tryTransform();
  if (G.ssPermanentActive !== true && p.ssPermanent) G.ssPermanentActive = true;

  updatePlayer(dt);
  updateKame(dt);
  updateEnemies(dt);
  homingSteer(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateParticles(dt);
  if (G.boss) updateBoss(dt);

  // boss trigger
  if (G.state === 'play' && G.bossTrigger && p.x > G.bossTrigger.x) {
    const tr = G.bossTrigger;
    G.bossTrigger = null;
    G.state = 'boss';
    p.vx = 0;
    // clear regular enemies near the arena so the duel is clean
    for (const e of G.enemies) if (e.x > tr.arenaL - 80) e.dead = true;
    AudioSys.playMusic('boss');
    startDialogue(DIALOGUES['pre_' + tr.boss], () => {
      G.boss = makeBoss(tr.boss, tr.arenaL, tr.arenaR, tr.y);
    });
    G.bossArena = { l: tr.arenaL, r: tr.arenaR };
  }

  // boss arena lock
  if (G.state === 'boss' && G.bossArena && !p.flyMode) {
    p.x = Math.max(G.bossArena.l + 8, Math.min(G.bossArena.r - 8, p.x));
  }

  // boss defeated
  if (G.boss && G.boss.dead && G.boss.deathT <= 0) {
    const kind = G.boss.kind;
    G.boss = null;
    G.projectiles = [];
    AudioSys.playMusic('victory');
    G.score += 1000;
    const post = DIALOGUES['post_' + kind];
    if (post) startDialogue(post, completeZone);
    else completeZone();
  }

  // camera
  updateCamera(dt);
}

function homingSteer(dt) {
  const p = G.player;
  const py = p.flyMode ? p.fy : p.y - 10;
  for (const pr of G.projectiles) {
    if (!pr.homing) continue;
    const dx = p.x - pr.x, dy = py - pr.y;
    const len = Math.hypot(dx, dy) || 1;
    pr.vx += dx / len * 220 * dt;
    pr.vy += dy / len * 220 * dt;
    const sp = Math.hypot(pr.vx, pr.vy);
    if (sp > 130) { pr.vx = pr.vx / sp * 130; pr.vy = pr.vy / sp * 130; }
  }
}

function updateCamera(dt) {
  const p = G.player;
  if (G.level.mode === 'fly') return; // handled in updateFlyZone
  let tx = p.x - VW / 2 + 40 + p.vx * 0.22;
  let ty = p.y - VH / 2 - 24;
  if (G.state === 'boss' && G.bossArena) {
    tx = Math.max(G.bossArena.l, Math.min(G.bossArena.r - VW, (G.bossArena.l + G.bossArena.r) / 2 - VW / 2));
  }
  tx = Math.max(0, Math.min(G.level.W * TILE - VW, tx));
  const maxY = G.level.H * TILE - VH;
  // level shorter than the view (portrait): anchor its floor to the screen bottom
  ty = maxY <= 0 ? maxY : Math.max(0, Math.min(maxY, ty));
  G.camX += (tx - G.camX) * Math.min(1, 8 * dt);
  G.camY += (ty - G.camY) * Math.min(1, 6 * dt);
}

// ---------------- fly (space) zone ----------------
function updateFlyZone(dt) {
  const lvl = G.level;
  if (G.dialogue) return;
  G.flyT += dt;
  const scroll = 62;
  G.camX += scroll * dt;
  G.player.x += scroll * dt;
  G.checkpoint = { x: G.camX + 70, y: 135 };

  // spawn waves (wave y values are authored for a 270px field — scale to viewport)
  while (G.waveIdx < lvl.waves.length && lvl.waves[G.waveIdx].t <= G.flyT) {
    const w = lvl.waves[G.waveIdx++];
    const sx = G.camX + VW + 30;
    const wy = Math.round(w.y * VH / 270);
    if (w.type === 'asteroid') G.enemies.push(makeEnemy('asteroid', sx, wy));
    else if (w.type === 'soldier') { const e = makeEnemy('soldier', sx, wy); e.homeY = wy; G.enemies.push(e); }
    else if (w.type === 'zline') { for (let i = 0; i < w.n; i++) G.pickups.push({ type: 'zeni', x: sx + i * 22, y: wy, life: Infinity }); }
    else if (w.type === 'senzu') G.pickups.push({ type: 'senzu', x: sx, y: wy, life: Infinity });
    else if (w.type === 'dragonball') { if (!G.save.balls.includes(w.id)) G.pickups.push({ type: 'dragonball', x: sx, y: wy, id: w.id, life: Infinity }); }
  }
  // clean offscreen pickups
  for (const pk of G.pickups) if (pk.x < G.camX - 30) pk.dead = true;

  // boss time
  if (!G.boss && G.state === 'play' && G.flyT >= lvl.bossAt) {
    G.state = 'boss';
    AudioSys.playMusic('boss');
    startDialogue(DIALOGUES.pre_ginyu, () => {
      G.boss = makeBoss('ginyu', G.camX, G.camX + VW, 200);
      G.boss.x = G.camX + VW + 40;
      G.boss.y = VH * 0.48;
    });
  }
  if (G.boss && !G.boss.dead) {
    // keep arena moving with camera
    G.boss.arenaL = G.camX; G.boss.arenaR = G.camX + VW;
  }
}

// ---------------- travel interlude ----------------
const TRAVEL_LINES = [
  ['Leaving West City...', 'Bulma\'s capsule ship roars to life!'],
  ['Crossing the badlands sky...', 'A massive power level looms ahead!'],
  ['Blasting through deep space...', 'Next stop: PLANET NAMEK!'],
];
function updateTravel(dt) {
  G.travelT += dt;
  if (G.travelT > 1 && Input.tapped) G.travelT = Math.max(G.travelT, 6.2);
  if (G.travelT > 6.5) {
    startZone(G.zoneIdx + 1);
  }
}
function drawTravel() {
  ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, VW, VH);
  const t = G.travelT;
  // stars streaking
  for (let i = 0; i < 70; i++) {
    const sp = 30 + (i % 5) * 40;
    const sx = ((hashXY(i, 3) % VW) - t * sp % VW + VW * 3) % VW;
    const sy = hashXY(i, 8) % VH;
    ctx.fillStyle = i % 4 === 0 ? '#9ad1ff' : '#555a77';
    ctx.fillRect(sx, sy, 1 + (i % 5 === 0 ? sp / 30 : 1), 1);
  }
  // origin planet shrinking (left), destination growing (right)
  const shrink = Math.max(4, 30 - t * 6);
  ctx.fillStyle = '#3a78e0'; ctx.beginPath(); ctx.arc(VW * 0.12, VH * 0.74, shrink, 0, 7); ctx.fill();
  const grow = Math.min(40, 4 + t * 7);
  ctx.fillStyle = G.zoneIdx >= 2 ? '#3fae49' : '#c8893a';
  ctx.beginPath(); ctx.arc(VW * 0.9, VH * 0.26, grow, 0, 7); ctx.fill();
  // ship flying with bob + flame
  const fr = Math.min(1, t / 6);
  const shipX = VW * 0.19 + fr * VW * 0.5;
  const shipY = VH * 0.55 - fr * VH * 0.22 + Math.sin(t * 3) * 6;
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.rotate(-0.25);
  ctx.drawImage(Sprites.ship, -13, -7);
  ctx.fillStyle = Math.floor(t * 12) % 2 ? '#ff8c1a' : '#ffd824';
  ctx.fillRect(-20, -2, 7 + Math.random() * 5, 4);
  ctx.restore();
  // text
  const lines = TRAVEL_LINES[Math.min(2, G.zoneIdx)];
  drawTextC(lines[0], VW / 2, VH - 50, 10, '#ffd24a');
  if (t > 2) drawTextC(lines[1], VW / 2, VH - 34, 10, '#9ad1ff');
  drawTextC(G.travelFrom + ' >>> ' + G.travelTo, VW / 2, 30, VW < 300 ? 8 : 10, '#ffffff');
  if (t > 1.5 && Math.floor(t * 2) % 2) drawTextC(Input.isTouch ? 'tap to skip' : 'press Z to skip', VW / 2, VH - 14, 8, '#666a88');
}

// ---------------- ending ----------------
function startEnding() {
  G.state = 'ending';
  G.endT = 0; G.endPhase = 0;
  AudioSys.playMusic('ending');
  G.save.beaten = true;
  saveGame();
}
function updateEnding(dt) {
  G.endT += dt;
  const allBalls = G.save.balls.length >= 7;
  if (G.endPhase === 0 && G.endT > 2.5) {
    G.endPhase = 1;
    if (allBalls) {
      AudioSys.sfx('dragonball');
      startDialogue([
        { who: 'shenron', text: 'YOU HAVE GATHERED ALL SEVEN DRAGON BALLS. I AM SHENRON. SPEAK YOUR WISH.' },
        { who: 'goku_ss', text: 'Shenron! Please restore everything Frieza destroyed — and bring peace to the universe!' },
        { who: 'shenron', text: 'IT IS DONE. FAREWELL.' },
        { who: 'goku', text: 'We did it, everyone!!' },
      ], () => { G.endPhase = 2; G.endT = 0; });
    } else {
      startDialogue([
        { who: 'goku', text: 'Frieza is defeated! The universe is safe!' },
        { who: 'bulma', text: `But Goku — you only found ${G.save.balls.length} of the 7 Dragon Balls! Find them all to summon SHENRON for the true ending!` },
        { who: 'goku', text: 'Heh... time to go training — I mean, searching!' },
      ], () => { G.endPhase = 2; G.endT = 0; });
    }
  }
  if (G.endPhase === 1) updateDialogue(dt);
  if (G.endPhase === 2 && (G.endT > 6 || (G.endT > 1 && Input.tapped))) {
    G.state = 'title';
    G.menuIdx = 0;
    G.titleT = 0;
    AudioSys.playMusic('title');
  }
}
function drawEnding() {
  drawBackground(ctx, 'namek', 0, 0, G.time);
  const allBalls = G.save.balls.length >= 7;
  // ground strip
  ctx.fillStyle = THEMES.namek.fill; ctx.fillRect(0, VH - 40, VW, 40);
  ctx.fillStyle = THEMES.namek.top; ctx.fillRect(0, VH - 40, VW, 5);
  // goku
  drawSprite(ctx, allBalls && G.endPhase >= 1 ? Sprites.ss_idle : Sprites.idle, VW * 0.23, VH - 40, false, 1.6);
  if (allBalls) {
    // shenron rises
    const rise = Math.min(1, G.endT / 2.5);
    const hx = VW * 0.69, hy = VH - 20 - rise * VH * 0.7;
    const bx = VW * 0.875;
    // body coils
    ctx.strokeStyle = '#49b855';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(bx, VH);
    for (let i = 0; i <= 10; i++) {
      const tt = i / 10;
      ctx.lineTo(bx - tt * (bx - hx) + Math.sin(tt * 6 + G.time * 2) * 18 * rise, VH - tt * (VH - hy - 8));
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    drawSprite(ctx, Sprites.shenron, hx, hy + 14, true, 1.8);
    // glow
    ctx.fillStyle = `rgba(255,255,160,${0.12 + Math.sin(G.time * 3) * 0.05})`;
    ctx.fillRect(0, 0, VW, VH);
    // 7 balls circling at base
    for (let i = 0; i < 7; i++) {
      const a = G.time * 1.5 + i / 7 * Math.PI * 2;
      drawSprite(ctx, Sprites.dragonball, hx + Math.cos(a) * 40, VH - 8 + Math.sin(a) * 8, false, 1);
    }
  }
  if (G.endPhase === 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH);
    const cy = Math.round(VH * 0.26);
    drawTextC(allBalls ? 'TRUE ENDING' : 'THE END...?', VW / 2, cy, 22, '#ffd824');
    drawTextC(`ZENI COLLECTED: ${G.zeni}`, VW / 2, cy + 40, 10, '#ffffff');
    drawTextC(`DRAGON BALLS: ${G.save.balls.length} / 7`, VW / 2, cy + 58, 10, '#ffffff');
    drawTextC(`TIME: ${Math.floor((G.playTime || 0) / 60)}:${String(Math.floor((G.playTime || 0) % 60)).padStart(2, '0')}`, VW / 2, cy + 76, 10, '#ffffff');
    drawTextC('Thanks for playing DRAGON DASH!', VW / 2, cy + 110, 10, '#9ad1ff');
    if (!allBalls) drawTextC('Use CHAPTER SELECT to find the missing Dragon Balls!', VW / 2, cy + 128, 8, '#52d8c8');
    if (Math.floor(G.endT * 2) % 2) drawTextC(Input.isTouch ? 'tap to continue' : 'press Z to continue', VW / 2, VH - 36, 9, '#666a88');
  }
}

// ---------------- title ----------------
function titleMenuItems() {
  const items = [];
  const hasSave = G.save.maxZone > 0 || G.save.balls.length > 0 || G.save.beaten;
  if (hasSave) items.push({ label: `CONTINUE  (ZONE ${Math.min(G.save.zone, 3) + 1})`, act: () => startZone(Math.min(G.save.zone, 3), true) });
  items.push({ label: 'NEW GAME', act: () => { G.save = defaultSave(); G.zeni = 0; G.score = 0; G.time = 0; G.ssPermanentActive = false; saveGame(); startZone(0, false); } });
  if (hasSave && G.save.maxZone > 0) {
    items.push({ label: 'CHAPTER SELECT', act: () => { G.state = 'chapters'; G.menuIdx = 0; } });
  }
  return items;
}
function menuRowY(i) { return Math.round(VH * 0.62) + i * 30; }
function chapterRowY(i) { return Math.round(VH * 0.32) + i * 30; }

function drawMenuButton(label, y, selected) {
  const w = Math.min(VW - 40, 220);
  ctx.fillStyle = selected ? 'rgba(255,216,36,0.92)' : 'rgba(10,10,28,0.78)';
  ctx.fillRect(VW / 2 - w / 2, y - 13, w, 26);
  ctx.strokeStyle = selected ? '#ffffff' : '#ffd824';
  ctx.strokeRect(VW / 2 - w / 2 + 0.5, y - 12.5, w - 1, 25);
  drawTextC(label, VW / 2, y, 11, selected ? '#16161f' : '#ffffff');
}

function updateTitle(dt) {
  G.titleT += dt;
  if (AudioSys.current !== 'title' && G.titleT > 0.2) AudioSys.playMusic('title');
  const items = titleMenuItems();
  if (keys['arrowdown'] || keys['s']) { if (!G._menuHeld) { G.menuIdx = (G.menuIdx + 1) % items.length; AudioSys.sfx('select'); } G._menuHeld = true; }
  else if (keys['arrowup'] || keys['w']) { if (!G._menuHeld) { G.menuIdx = (G.menuIdx - 1 + items.length) % items.length; AudioSys.sfx('select'); } G._menuHeld = true; }
  else G._menuHeld = false;
  if (Input.tapped) {
    // tap/click on a button selects it; tapping anywhere else picks the highlighted one
    let chosen = G.menuIdx;
    if (lastPointer) {
      for (let i = 0; i < items.length; i++) {
        if (Math.abs(lastPointer.y - menuRowY(i)) <= 15) { chosen = i; break; }
      }
    }
    AudioSys.sfx('powerup');
    items[chosen].act();
  }
}
const GAME_VERSION = 'v3';
function drawTitle() {
  drawBackground(ctx, 'city', G.titleT * 30, 0, G.titleT);
  ctx.fillStyle = 'rgba(0,0,30,0.35)'; ctx.fillRect(0, 0, VW, VH);
  const ly = Math.round(VH * 0.18);
  // shenron silhouette winding across the sky
  ctx.strokeStyle = 'rgba(44,122,54,0.85)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-10, ly + 90);
  for (let i = 0; i <= 16; i++) {
    const tt = i / 16;
    ctx.lineTo(tt * (VW + 20) - 10, ly + 90 - tt * 110 + Math.sin(tt * 7 + G.time * 1.2) * 14);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  drawSprite(ctx, Sprites.shenron, VW - 24, ly - 8 + Math.sin(G.time * 1.2 + 7) * 6, false, 1.5);
  // giant glowing dragon ball behind the logo
  const glow = 0.25 + Math.sin(G.time * 2.5) * 0.08;
  ctx.fillStyle = `rgba(255,180,40,${glow})`;
  ctx.beginPath(); ctx.arc(VW / 2, ly + 22, 64, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.95;
  drawSprite(ctx, Sprites.dragonball, VW / 2, ly + 70, false, 14);
  ctx.globalAlpha = 1;
  // logo
  drawTextC('DRAGON', VW / 2, ly, 40, '#ff8c1a', '#16161f');
  drawTextC('DASH', VW / 2, ly + 42, 40, '#ffd824', '#16161f');
  drawTextC('~ a Dragon Ball Z adventure ~', VW / 2, ly + 66, 10, '#9ad1ff');
  // goku running along the bottom
  const gx = ((G.titleT * 120) % (VW + 120)) - 60;
  const frame = ['run1', 'run2', 'run3', 'run2'][Math.floor(G.titleT * 10) % 4];
  ctx.fillStyle = '#2c2c3a'; ctx.fillRect(0, VH - 20, VW, 20);
  drawSprite(ctx, Sprites[(G.save.beaten ? 'ss_' : '') + frame], gx, VH - 20, false, 1.5);
  for (let i = 0; i < 7; i++) {
    const a = G.titleT * 0.8 + i / 7 * Math.PI * 2;
    drawSprite(ctx, Sprites.dragonball, VW / 2 + Math.cos(a) * VW * 0.31, ly + 32 + Math.sin(a) * 34, false, 1);
  }
  // menu buttons
  const items = titleMenuItems();
  items.forEach((it, i) => drawMenuButton(it.label, menuRowY(i), i === G.menuIdx));
  drawTextC(Input.isTouch ? 'tap to play!' : 'arrows + Z to select · X attack · C transform · M mute', VW / 2, VH - 30, 8, '#c9ccd8');
  if (G.save.balls.length > 0) {
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = G.save.balls.includes(i + 1) ? 1 : 0.25;
      drawSprite(ctx, Sprites.dragonball, VW / 2 - 40 + i * 12, ly + 86, false, 1);
    }
    ctx.globalAlpha = 1;
  }
  drawTextC(GAME_VERSION, VW - 14, VH - 8, 7, '#c9ccd8');
}
function updateChapters(dt) {
  const n = Math.min(G.save.maxZone, 3) + 1;
  if (keys['arrowdown'] || keys['s']) { if (!G._menuHeld) { G.menuIdx = (G.menuIdx + 1) % (n + 1); AudioSys.sfx('select'); } G._menuHeld = true; }
  else if (keys['arrowup'] || keys['w']) { if (!G._menuHeld) { G.menuIdx = (G.menuIdx - 1 + n + 1) % (n + 1); AudioSys.sfx('select'); } G._menuHeld = true; }
  else G._menuHeld = false;
  if (Input.tapped) {
    let chosen = -1;
    if (lastPointer) {
      for (let i = 0; i <= n; i++) if (Math.abs(lastPointer.y - chapterRowY(i)) <= 15) { chosen = i; break; }
      if (chosen === -1) return; // tapped empty space: ignore (avoid accidental zone start)
    } else chosen = G.menuIdx;
    AudioSys.sfx('powerup');
    if (chosen >= n) { G.state = 'title'; G.menuIdx = 0; }
    else { G.zeni = G.save.zeni || 0; startZone(chosen, false); }
  }
}
function drawChapters() {
  drawBackground(ctx, 'space', G.titleT * 10, 0, G.titleT);
  drawTextC('CHAPTER SELECT', VW / 2, Math.round(VH * 0.16), 20, '#ffd824');
  const names = ['1. WEST CITY', '2. ROCKY WASTELAND', '3. DEEP SPACE', '4. PLANET NAMEK'];
  const n = Math.min(G.save.maxZone, 3) + 1;
  for (let i = 0; i <= n; i++) {
    const label = i < n ? names[i] : 'BACK';
    drawMenuButton(label, chapterRowY(i), i === G.menuIdx);
  }
  drawTextC('Dragon Balls you already found stay collected!', VW / 2, VH - 18, 8, '#52d8c8');
}

// ---------------- text helper (canvas font) ----------------
function drawTextC(str, x, y, size, color, outline) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = Math.max(2, size / 8);
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
function drawTextL(str, x, y, size, color) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ---------------- world rendering ----------------
function drawWorld() {
  const camX = Math.round(G.camX), camY = Math.round(G.camY);
  const isFly = G.level.mode === 'fly';
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake * 9, (Math.random() - 0.5) * G.shake * 9);

  drawBackground(ctx, G.level.theme, camX, camY, G.time);
  if (!isFly) drawTiles(ctx, G.level, camX, camY, G.time);

  // springs
  for (const s of G.springs || []) {
    const x = s.x - camX, y = s.y - camY;
    const compressed = s.t > 0;
    ctx.fillStyle = '#e03131';
    ctx.fillRect(x - 8, y - (compressed ? 4 : 8), 16, compressed ? 4 : 8);
    ctx.fillStyle = '#ffd824';
    ctx.fillRect(x - 8, y - (compressed ? 5 : 10), 16, 2);
  }
  // checkpoints
  for (const c of G.checkpoints || []) {
    const x = c.x - camX, y = c.y - camY;
    ctx.fillStyle = '#9298a8'; ctx.fillRect(x - 1, y - 26, 2, 26);
    ctx.fillStyle = c.hit ? '#ffd824' : '#565c6c';
    ctx.beginPath(); ctx.moveTo(x + 1, y - 26); ctx.lineTo(x + 13, y - 21); ctx.lineTo(x + 1, y - 16); ctx.fill();
  }
  // npcs
  for (const n of G.npcs || []) {
    drawSprite(ctx, Sprites.bulma, n.x - camX, n.y - camY, G.player.x < n.x, 1.4);
    if (!G.save.radar) {
      const bob = Math.sin(G.time * 4) * 2;
      drawTextC('!', n.x - camX, n.y - camY - 34 + bob, 12, '#ffd824', '#16161f');
    }
  }
  // pickups
  for (const pk of G.pickups) {
    if (pk.dead) continue;
    const x = pk.x - camX, y = pk.y - camY;
    if (x < -20 || x > VW + 20) continue;
    if (pk.type === 'zeni') {
      const ph = Math.floor(G.time * 8 + pk.x * 0.1) % 4;
      const w = [6, 4, 2, 4][ph];
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 6, 1);
      ctx.drawImage(Sprites.zeni, -3, -3);
      ctx.restore();
    } else if (pk.type === 'dragonball') {
      const bob = Math.sin(G.time * 3 + pk.id) * 3;
      ctx.fillStyle = `rgba(255,216,36,${0.25 + Math.sin(G.time * 5) * 0.1})`;
      ctx.beginPath(); ctx.arc(x, y + bob - 3, 10, 0, 7); ctx.fill();
      drawSprite(ctx, Sprites.dragonball, x, y + bob + 3, false, 1.4);
    } else if (pk.type === 'senzu') {
      const bob = Math.sin(G.time * 3) * 2;
      drawSprite(ctx, Sprites.senzu, x, y + bob, false, 1.6);
    }
  }
  // enemies
  for (const e of G.enemies) {
    if (e.dead) continue;
    const x = e.x - camX, y = e.y - camY;
    if (x < -40 || x > VW + 40) continue;
    if (e.hurtT > 0 && Math.floor(e.hurtT * 30) % 2 === 0) continue;
    const f2 = Math.floor((G.time + e.t) * 6) % 2 === 0;
    const flip = G.player.x < e.x;
    switch (e.kind) {
      case 'rrbot': drawSprite(ctx, f2 ? Sprites.rrbot1 : Sprites.rrbot2, x, y, e.dir > 0, 1.2); break;
      case 'drone': {
        const img = f2 ? Sprites.drone1 : Sprites.drone2;
        ctx.save();
        if (e.frieza) ctx.filter = 'hue-rotate(90deg)';
        drawSprite(ctx, img, x, y, flip, 1.2);
        ctx.restore();
        break;
      }
      case 'saiba': drawSprite(ctx, e.vy !== 0 ? Sprites.saiba2 : (f2 ? Sprites.saiba1 : Sprites.saiba2), x, y, flip, 1.2); break;
      case 'soldier': case 'soldier_g': drawSprite(ctx, f2 ? Sprites.soldier1 : Sprites.soldier2, x, y, e.kind === 'soldier' ? false : flip, 1.2); break;
      case 'asteroid': {
        ctx.save();
        ctx.translate(x, y - 10);
        ctx.rotate(e.rot);
        ctx.fillStyle = '#7a6a5a';
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2;
          const r = e.r * (0.8 + ((hashXY(i, Math.floor(e.homeX)) % 40) / 100));
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.fill();
        ctx.fillStyle = '#564a3e';
        ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.2, e.r * 0.25, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.3, e.r * 0.3, e.r * 0.18, 0, 7); ctx.fill();
        ctx.restore();
        break;
      }
    }
  }
  // boss
  drawBoss(ctx, camX, camY);
  // player
  drawPlayer(camX, camY);
  // projectiles
  for (const pr of G.projectiles) {
    const x = pr.x - camX, y = pr.y - camY;
    if (pr.kind === 'ki') {
      ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.arc(x, y, pr.r + 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, pr.r - 1, 0, 7); ctx.fill();
    } else if (pr.kind === 'shot') {
      ctx.fillStyle = '#ff8050'; ctx.beginPath(); ctx.arc(x, y, pr.r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(x, y, pr.r - 1, 0, 7); ctx.fill();
    } else if (pr.kind === 'orb') {
      ctx.fillStyle = 'rgba(160,90,216,0.5)'; ctx.beginPath(); ctx.arc(x, y, pr.r + 3 + Math.sin(G.time * 10) * 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#e060ff'; ctx.beginPath(); ctx.arc(x, y, pr.r, 0, 7); ctx.fill();
    } else if (pr.kind === 'deathball') {
      ctx.fillStyle = 'rgba(255,120,40,0.4)'; ctx.beginPath(); ctx.arc(x, y, pr.r + 5 + Math.sin(G.time * 12) * 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff6020'; ctx.beginPath(); ctx.arc(x, y, pr.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd824'; ctx.beginPath(); ctx.arc(x - 3, y - 3, pr.r * 0.4, 0, 7); ctx.fill();
    } else if (pr.kind === 'wave') {
      ctx.fillStyle = '#ffd824';
      ctx.beginPath(); ctx.arc(x, y, 6 + Math.sin(G.time * 20) * 2, Math.PI, 0); ctx.fill();
    }
  }
  // kamehameha beam
  if (G.kame && G.kame.t > 0) drawKameBeam(camX, camY);
  // particles
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - camX - pt.size / 2, pt.y - camY - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlayer(camX, camY) {
  const p = G.player;
  if (p.invulnT > 0 && p.deadT <= 0 && Math.floor(p.invulnT * 24) % 2 === 0) return;
  const ss = p.ss ? 'ss_' : '';
  let img;
  const px = p.x - camX;
  const py = (p.flyMode ? p.fy + 7 : p.y) - camY;

  // SS aura glow
  if (p.ss) {
    ctx.fillStyle = `rgba(255,226,58,${0.18 + Math.sin(G.time * 14) * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(px, py - 14, 16, 22 + Math.sin(G.time * 10) * 3, 0, 0, 7);
    ctx.fill();
  }
  if (p.flyMode) {
    img = Sprites[ss + (Math.floor(p.anim * 2) % 2 ? 'fly1' : 'fly2')];
    if (p.kameT > 0) img = Sprites[ss + 'fly1'];
    drawSprite(ctx, img, px, py, false, 1.3);
    // engine trail
    if (Math.random() < 0.6) G.particles.push({ x: p.x - 16, y: p.fy + 4, vx: -80, vy: (Math.random() - 0.5) * 20, life: 0.3, maxLife: 0.3, color: p.ss ? '#ffe23a' : '#9ad1ff', size: 2 });
  } else {
    if (p.deadT > 0) img = Sprites[ss + 'hurt'];
    else if (p.kameT > 0) img = Sprites[ss + 'kame'];
    else if (p.charging) img = Sprites[ss + 'charge'];
    else if (p.hurtT > 0) img = Sprites[ss + 'hurt'];
    else if (p.attackKind === 'punch') img = Sprites[ss + 'punch'];
    else if (p.attackKind === 'blast') img = Sprites[ss + 'blast'];
    else if (!p.onGround) img = Sprites[ss + 'jump'];
    else if (Math.abs(p.vx) > 15) img = Sprites[ss + ['run1', 'run2', 'run3', 'run2'][Math.floor(p.anim * 9) % 4]];
    else img = Sprites[ss + 'idle'];
    drawSprite(ctx, img, px, py, p.facing < 0, 1.4);
    // speed lines when boosting
    if (Math.abs(p.vx) > 260) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 3; i++) {
        const ly = py - 6 - i * 8;
        ctx.beginPath(); ctx.moveTo(px - Math.sign(p.vx) * 18, ly); ctx.lineTo(px - Math.sign(p.vx) * (30 + Math.random() * 14), ly); ctx.stroke();
      }
    }
  }
  // charge orb + the chant
  if (p.charging) {
    const cy = p.flyMode ? p.fy - camY : py - 15;
    const cx = px + p.facing * 13;
    const r = 3 + Math.min(5, p.chargeT * 3) + Math.sin(G.time * 20) * 1.5;
    ctx.fillStyle = 'rgba(82,216,240,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#c8f4ff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    const chant = p.chargeT < 0.7 ? 'KA...' : p.chargeT < 0.95 ? 'KA-ME...' : p.chargeT < 1.2 ? 'KA-ME-HA...' : 'KA-ME-HA-ME...';
    drawTextC(chant, px, py - 44 + Math.sin(G.time * 12), 10, '#c8f4ff', '#16161f');
  }
  if (p.kameT > 0) {
    drawTextC('HAAAAA!!!', px, py - 46 + Math.sin(G.time * 25) * 2, 14, '#ffffff', '#1a4fa0');
  }
  // radar arrow
  if (G.save.radar && (G.state === 'play') && !G.dialogue) {
    let nearest = null, nd = 1e9;
    for (const pk of G.pickups) {
      if (pk.type !== 'dragonball' || pk.dead) continue;
      const d = Math.hypot(pk.x - p.x, pk.y - (p.flyMode ? p.fy : p.y));
      if (d < nd) { nd = d; nearest = pk; }
    }
    if (nearest && nd > 60) {
      const a = Math.atan2(nearest.y - (p.flyMode ? p.fy : p.y - 20), nearest.x - p.x);
      const ax = px, ay = py - 38 + Math.sin(G.time * 6) * 2;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(82,216,240,0.9)';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.fill();
      ctx.restore();
    }
  }
}

function drawKameBeam(camX, camY) {
  const p = G.player;
  const dir = G.kame.dir;
  const y = (p.flyMode ? p.fy : p.y - 11) - camY;
  const x0 = p.x - camX + dir * 13;
  const len = dir > 0 ? VW - x0 + 20 : x0 + 20;
  const wob = Math.sin(G.time * 30) * 2;
  const w = 16 + wob + Math.min(8, G.kame.t * 14);
  const sx = dir > 0 ? x0 : x0 - len;
  ctx.fillStyle = 'rgba(82,160,255,0.55)';
  ctx.fillRect(sx, y - w / 2 - 3, len, w + 6);
  ctx.fillStyle = '#8ecbff';
  ctx.fillRect(sx, y - w / 2, len, w);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx, y - w / 4, len, w / 2);
  // muzzle flare
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x0, y, w * 0.7, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(82,160,255,0.5)';
  ctx.beginPath(); ctx.arc(x0, y, w, 0, 7); ctx.fill();
}

// ---------------- HUD ----------------
function drawHUD() {
  const p = G.player;
  // zeni
  ctx.drawImage(Sprites.zeni, 34, 8);
  const zeniCol = G.zeni === 0 && Math.floor(G.time * 4) % 2 ? '#ff5050' : '#ffd824';
  drawTextL('' + G.zeni, 44, 12, 11, zeniCol);
  // ki bar
  drawTextL('KI', 34, 26, 8, '#9ad1ff');
  ctx.fillStyle = '#22242e'; ctx.fillRect(48, 22, 62, 7);
  const kr = p.ki / p.kiMax;
  ctx.fillStyle = kr >= 0.99 ? (Math.floor(G.time * 6) % 2 ? '#ffffff' : '#52d8f0') : '#52d8f0';
  ctx.fillRect(49, 23, 60 * kr, 5);
  if (kr >= 0.99 && !p.ss) drawTextL('KAMEHAMEHA READY! (hold attack)', 34, 38, 7, '#c8f4ff');
  if (p.ss && !p.ssPermanent) drawTextL('SS ' + Math.ceil(p.ssT) + 's', 34, 38, 9, '#ffe23a');
  if (p.ss && p.ssPermanent) drawTextL('SUPER SAIYAN', 34, 38, 9, '#ffe23a');
  // dragon balls
  for (let i = 0; i < 7; i++) {
    const has = G.save.balls.includes(i + 1);
    ctx.globalAlpha = has ? 1 : 0.22;
    ctx.drawImage(Sprites.dragonball, VW - 100 + i * 10, 28);
    ctx.globalAlpha = 1;
  }
  // scouter readout (always over 9000, obviously)
  drawTextL('POWER LVL ' + (9001 + G.score * 3 + (p.ss ? 150000000 : 0)), VW - 118, 44, 7, '#7cfc00');
  // boss hp (top center, clear of touch buttons)
  if (G.boss && !G.boss.dead) {
    const b = G.boss;
    drawTextC(b.name, VW / 2, 50, 9, '#ff8080');
    ctx.fillStyle = '#22242e'; ctx.fillRect(VW / 2 - 80, 56, 160, 8);
    ctx.fillStyle = b.kind === 'frieza' && b.phase === 1 ? '#e060ff' : '#e03131';
    ctx.fillRect(VW / 2 - 79, 57, 158 * (b.hp / b.hpMax), 6);
  }
  // toast (wraps on narrow screens)
  if (G.toastT > 0) {
    ctx.font = 'bold 9px monospace';
    const words = G.toastMsg.split(' ');
    const maxW = VW - 24;
    const lines = [''];
    for (const w of words) {
      const test = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w;
      if (ctx.measureText(test).width > maxW) lines.push(w);
      else lines[lines.length - 1] = test;
    }
    const bw = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 20;
    const bh = lines.length * 12 + 8;
    const ty0 = G.boss && !G.boss.dead ? 70 : 50; // sit below the boss bar when present
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VW / 2 - bw / 2, ty0, bw, bh);
    lines.forEach((l, i) => drawTextC(l, VW / 2, ty0 + 10 + i * 12, 9, '#ffd824'));
  }
  // zone banner
  if (G.bannerT > 0) {
    const a = Math.min(1, G.bannerT > 2 ? (2.6 - G.bannerT) * 2.5 : G.bannerT);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, VH / 2 - 35, VW, 56);
    drawTextC('SAGA ' + (G.zoneIdx + 1), VW / 2, VH / 2 - 17, 12, '#9ad1ff');
    drawTextC(G.level.name, VW / 2, VH / 2 + 3, 20, '#ffd824');
    ctx.globalAlpha = 1;
  }
  // touch controls
  if (Input.isTouch && (G.state === 'play' || G.state === 'boss') && !G.dialogue) {
    ctx.globalAlpha = 0.3;
    // stick hint
    const stY = VH - 48;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(60, stY, 28, 0, 7); ctx.stroke();
    drawTextC('<', 40, stY, 14, '#ffffff');
    drawTextC('>', 80, stY, 14, '#ffffff');
    if (G.level.mode === 'fly') { drawTextC('^', 60, stY - 18, 12, '#ffffff'); drawTextC('v', 60, stY + 18, 12, '#ffffff'); }
    // buttons
    ctx.fillStyle = '#2a4fd6'; ctx.beginPath(); ctx.arc(BTN.jump.x, BTN.jump.y, BTN.jump.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#e07820'; ctx.beginPath(); ctx.arc(BTN.attack.x, BTN.attack.y, BTN.attack.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.85;
    drawTextC(G.level.mode === 'fly' ? 'UP' : 'JUMP', BTN.jump.x, BTN.jump.y, 9, '#ffffff');
    drawTextC('KI', BTN.attack.x, BTN.attack.y, 9, '#ffffff');
    if (transformAvailable()) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffd824'; ctx.beginPath(); ctx.arc(BTN.transform.x, BTN.transform.y, BTN.transform.r + Math.sin(G.time * 8), 0, 7); ctx.fill();
      drawTextC('SS', BTN.transform.x, BTN.transform.y, 9, '#16161f');
    }
    ctx.globalAlpha = 0.4;
    drawTextC('II', BTN.pause.x, BTN.pause.y, 11, '#ffffff');
    ctx.globalAlpha = 1;
  }
  if (!Input.isTouch && transformAvailable() && Math.floor(G.time * 2) % 2) {
    drawTextC('PRESS C — SUPER SAIYAN!', VW / 2, 78, 10, '#ffe23a');
  }
  // mute icon
  if (AudioSys.muted) drawTextC('MUTE', BTN.mute.x - 4, BTN.mute.y, 7, '#888');
}

// ---------------- dialogue rendering ----------------
function drawDialogue() {
  const d = G.dialogue;
  if (!d) return;
  const line = d.lines[d.idx];
  // measure full text to size the box (stable while typing)
  ctx.font = 'bold 10px monospace';
  const maxW = VW - 130;
  let nLines = 1, lw = 0;
  for (const word of line.text.split(' ')) {
    const w = ctx.measureText(word + ' ').width;
    if (lw + w > maxW) { nLines++; lw = 0; }
    lw += w;
  }
  const boxH = Math.max(74, nLines * 13 + 28);
  const top = VH - 12 - boxH;
  ctx.fillStyle = 'rgba(8,8,20,0.88)';
  ctx.fillRect(16, top, VW - 32, boxH);
  ctx.strokeStyle = '#ffd824';
  ctx.strokeRect(16.5, top + 0.5, VW - 33, boxH - 1);
  // portrait
  const img = PORTRAITS[line.who]();
  ctx.fillStyle = '#22242e';
  ctx.fillRect(24, top + 8, 52, 58);
  const sc = Math.min(48 / img.width, 52 / img.height);
  ctx.save();
  ctx.translate(50, top + 64);
  ctx.scale(sc, sc);
  ctx.drawImage(img, -img.width / 2, -img.height);
  ctx.restore();
  drawTextC(NAMES[line.who], 50, top + 14, 8, '#ffd824');
  // text with wrapping
  const shown = line.text.slice(0, Math.floor(d.chars));
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  let lx = 88, ly = top + 18;
  for (const word of shown.split(' ')) {
    const w = ctx.measureText(word + ' ').width;
    if (lx + w > 88 + maxW) { lx = 88; ly += 13; }
    ctx.fillText(word, lx, ly);
    lx += w;
  }
  if (d.chars >= line.text.length && Math.floor(G.time * 3) % 2) {
    drawTextC(Input.isTouch ? 'tap' : 'Z', VW - 36, top + boxH - 10, 8, '#ffd824');
  }
}

// ---------------- main loop ----------------
let lastT = performance.now();
let lastFrameAt = performance.now();
function tick(dt) {
  pollInput();

  G.time += dt; // global clock for all animation

  if (G.toastT > 0) G.toastT -= dt;
  if (G.shake > 0) G.shake -= dt * 1.6;
  if (G.flashT > 0) G.flashT -= dt;
  if (G.bannerT > 0) G.bannerT -= dt;

  switch (G.state) {
    case 'title':
      updateTitle(dt);
      drawTitle();
      break;
    case 'chapters':
      G.titleT += dt;
      updateChapters(dt);
      drawChapters();
      break;
    case 'play':
    case 'boss':
      if (Input.pausePressed) { G.paused = !G.paused; AudioSys.sfx('select'); }
      else if (G.paused && Input.tapped) G.paused = false;
      updatePlay(dt);
      drawWorld();
      drawHUD();
      drawDialogue();
      if (G.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH);
        drawTextC('PAUSED', VW / 2, VH / 2 - 15, 22, '#ffd824');
        drawTextC(Input.isTouch ? 'tap to resume' : 'press P to resume', VW / 2, VH / 2 + 15, 10, '#ffffff');
      }
      break;
    case 'travel':
      updateTravel(dt);
      drawTravel();
      break;
    case 'ending':
      updateEnding(dt);
      drawEnding();
      drawDialogue();
      break;
  }

  // white flash (transform / phase change)
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(255,255,240,${Math.min(0.85, G.flashT * 1.8)})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  lateInput();
}

// crash guard: never let an exception kill the loop or freeze silently —
// show the error on screen so it can be reported.
let crashMsg = null;
function safeTick(dt) {
  try {
    tick(dt);
  } catch (err) {
    crashMsg = String(err && err.message || err).slice(0, 120);
  }
  if (crashMsg) {
    ctx.fillStyle = 'rgba(180,20,20,0.92)';
    ctx.fillRect(0, 0, VW, 30);
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ERROR: ' + crashMsg, VW / 2, 10);
    ctx.fillText('screenshot this & send it to Andrew!', VW / 2, 22);
  }
}
window.addEventListener('error', e => { crashMsg = String(e.message || 'unknown').slice(0, 120); });

function frame(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  lastFrameAt = now;
  safeTick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// watchdog: keep the game alive if rAF is throttled (background tab)
setInterval(() => {
  const now = performance.now();
  if (now - lastFrameAt > 250) {
    lastT = now;
    lastFrameAt = now;
    safeTick(1 / 30);
  }
}, 100);

// deterministic stepper for automated testing
window.__step = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); return G.state; };
