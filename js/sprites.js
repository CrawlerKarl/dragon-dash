// ============================================================
// Dragon Dash — pixel art sprites, all drawn in code
// Char-grid format: each char = palette color, '.' = transparent
// ============================================================
const PAL = {
  k: '#16161f', // black / outline
  h: '#23232e', // hair black
  H: '#3a3a4d', // hair shine
  s: '#ffcfa2', // skin
  S: '#dd9c66', // skin shade
  o: '#ff8c1a', // gi orange
  O: '#c96a0c', // gi shade
  b: '#2a4fd6', // blue
  B: '#17307e', // blue dark
  w: '#ffffff', // white
  W: '#c9ccd8', // white shade
  y: '#ffd824', // gold
  Y: '#c79a00', // gold shade
  g: '#49b855', // green
  G: '#2c7a36', // green dark
  r: '#e03131', // red
  R: '#931d1d', // red dark
  p: '#a05ad8', // purple
  P: '#5e2a8a', // purple dark
  c: '#52d8f0', // cyan
  m: '#9298a8', // metal
  M: '#565c6c', // metal dark
  t: '#52d8c8', // teal (bulma hair)
  n: '#7a4a26', // brown
  e: '#ff3a3a', // glow red eye
  q: '#ffb6e0', // pink
};

// Super Saiyan palette: hair black -> gold
const PAL_SS = Object.assign({}, PAL, { h: '#ffe23a', H: '#fff7a8' });

function makeSprite(rows, pal = PAL) {
  const h = rows.length;
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      c.fillStyle = pal[ch] || '#f0f';
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

// ---------------- GOKU (composed from parts, 18 wide) ----------------
const GOKU_HAIR = [
  '....h...h..h......',
  '..h.hh.hhhh.h.....',
  '..hhhhhHhhhh......',
  '...hhhHhhhhhh.....',
  '..hhhhhhhhhhh.....',
];
const GOKU_FACE = [
  '...hhsssssss......',
  '...hsswkswks......',
  '....ssssssss......',
  '.....sSSSSs.......',
];
const GOKU_TORSO = {
  idle: [
    '....ooooooo.......',
    '...oobooboo.......',
    '..soooooooos......',
    '..soooooooos......',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  run: [
    '....ooooooo.......',
    '...oobooboo.......',
    '..sooooooos.......',
    '...soooooos.......',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  punch: [
    '....ooooooo.......',
    '...oobooboo.......',
    '..sooooooooosss...',
    '..sooooooo........',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  blast: [
    '....ooooooo.......',
    '...oobooboo.......',
    '..soooooooooss....',
    '..sooooooo..ss....',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  charge: [
    '....ooooooo.......',
    '...oobooboo.......',
    '.ssooooooooss.....',
    '.ssooooooooss.....',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  kame: [
    '....ooooooo.......',
    '...oobooboo.......',
    '...ooooooooosss...',
    '...ooooooooosss...',
    '...oobbbboo.......',
    '....oooooo........',
  ],
  hurt: [
    '.s..ooooooo..s....',
    '.s.oobooboo..s....',
    '..soooooooos......',
    '...oooooooo.......',
    '...oobbbboo.......',
    '....oooooo........',
  ],
};
const GOKU_LEGS = {
  idle: [
    '....oo..oo........',
    '....oo..oo........',
    '....oO..Oo........',
    '....bb..bb........',
    '...bbb..bbb.......',
    '..................',
  ],
  run1: [
    '...oo....oo.......',
    '..oo......oo......',
    '.oo........oO.....',
    '.bb........bb.....',
    'bbb........bbb....',
    '..................',
  ],
  run2: [
    '....oo..oo........',
    '....oo.oo.........',
    '....oO.oO.........',
    '....bb.bb.........',
    '...bbb.bbb........',
    '..................',
  ],
  run3: [
    '...ooooo..........',
    '..oo...oo.........',
    '..oO...oO.........',
    '..bb...bb.........',
    '.bbb...bbb........',
    '..................',
  ],
  jump: [
    '....ooooo.........',
    '....oo.oo.........',
    '...oO..Oo.........',
    '...bb..bb.........',
    '..bbb..bbb........',
    '..................',
  ],
  crouch: [
    '...oooooo.........',
    '...oo..oo.........',
    '...bb..bb.........',
    '..bbb..bbb........',
    '..................',
    '..................',
  ],
};

function gokuFrame(torso, legs, pal) {
  return makeSprite([...GOKU_HAIR, ...GOKU_FACE, ...GOKU_TORSO[torso], ...GOKU_LEGS[legs]], pal);
}

// Flying pose (horizontal, facing right, arms forward) 28x12
const GOKU_FLY1 = [
  '...............h.hh.h.......',
  '.............hhhhhhhh.......',
  '............hhhhssssss......',
  '...oo.......hhsswks.........',
  '..ooooooooooohssssss.sss....',
  '.oobboooooooooooooo..sss....',
  '..bb.ooooooobbooooo.........',
  '..............ooo...........',
];
const GOKU_FLY2 = [
  '...............h.hh.h.......',
  '.............hhhhhhhh.......',
  '............hhhhssssss......',
  '..oo........hhsswks.........',
  '...oooooooooohssssss.sss....',
  '..oobbooooooooooooo..sss....',
  '...bb.oooooobbooooo.........',
  '..............ooo...........',
];

// ---------------- NPCs & ENEMIES ----------------
const BULMA = [
  '....tttttt......',
  '...tttttttt.....',
  '..tttttttttt....',
  '..ttssssssst....',
  '..tsswkswks.....',
  '...ssssssss.....',
  '....ssSSs.......',
  '...wwwwwww......',
  '..swwwwwwws.....',
  '..swwwwwwws.....',
  '...wwwwww.......',
  '...rrrrrr.......',
  '...rrrrrr.......',
  '....ss..ss......',
  '....ss..ss......',
  '...nn..nn.......',
];

const RRBOT1 = [
  '....mmmmmmm.....',
  '...mmmmmmmmm....',
  '...mewmmmewm....',
  '...mmmmmmmmm....',
  '..MMMMMMMMMMM...',
  '.MmmmmmmmmmmM...',
  '.Mmmm.rr.mmmM...',
  '.Mmmm.rr.mmmM...',
  '.MmmmmmmmmmmM...',
  '..MMMMMMMMMM....',
  '...MM....MM.....',
  '...mm....mm.....',
  '..MMM....MMM....',
];
const RRBOT2 = [
  '....mmmmmmm.....',
  '...mmmmmmmmm....',
  '...mewmmmewm....',
  '...mmmmmmmmm....',
  '..MMMMMMMMMMM...',
  '.MmmmmmmmmmmM...',
  '.Mmmm.rr.mmmM...',
  '.Mmmm.rr.mmmM...',
  '.MmmmmmmmmmmM...',
  '..MMMMMMMMMM....',
  '....MM..MM......',
  '....mm..mm......',
  '...MMM..MMM.....',
];

const DRONE1 = [
  '....mmmm....',
  '..mmmmmmmm..',
  '.mmcceecmmm.',
  '..mmmmmmmm..',
  '....MMMM....',
  '.....MM.....',
];
const DRONE2 = [
  '....mmmm....',
  '..mmmmmmmm..',
  '.mmccceccmm.',
  '..mmmmmmmm..',
  '....MMMM....',
  '....M..M....',
];

const SAIBA1 = [
  '....gggg......',
  '...gGgggG.....',
  '..ggggggggg...',
  '..gewggewg....',
  '..ggggggggg...',
  '...ggrrgg.....',
  '...gggggg.....',
  '..gGggggGg....',
  '.gg.gggg.gg...',
  '....gg.gg.....',
  '....gg.gg.....',
  '...gG...Gg....',
];
const SAIBA2 = [
  '....gggg......',
  '...gGgggG.....',
  '..ggggggggg...',
  '..gewggewg....',
  '..ggggggggg...',
  '...ggrrgg.....',
  '..ggggggggg...',
  '.gg.gggg..gg..',
  'g...gggg...g..',
  '...gg..gg.....',
  '..gg....gg....',
  '.gG......Gg...',
];

const SOLDIER1 = [
  '....pppppp......',
  '...pppppppp.....',
  '..cccpwkpwk.....',
  '...ppppppp......',
  '....ppSSp.......',
  '...wwwwwww......',
  '..pwwwwwwwp.....',
  '..pwyyyyywp.....',
  '..pwwwwwwwp.....',
  '...wwwwww.......',
  '...pp..pp.......',
  '...pp..pp.......',
  '..ww....ww......',
];
const SOLDIER2 = [
  '....pppppp......',
  '...pppppppp.....',
  '..cccpwkpwk.....',
  '...ppppppp......',
  '....ppSSp.......',
  '...wwwwwww......',
  '..pwwwwwwwp.....',
  '..pwyyyyywp.....',
  '..pwwwwwwwp.....',
  '...wwwwww.......',
  '....pp.pp.......',
  '...pp...pp......',
  '..ww.....ww.....',
];

// ---------------- BOSSES ----------------
const VEGETA1 = [
  '......hhh.........',
  '.....hhhhh........',
  '....hhhhhhh.......',
  '...hhhhhhhhh......',
  '..hhhhhhhhhhh.....',
  '..hhhsssssss......',
  '...hsswkswks......',
  '....ssssssss......',
  '.....sSSSSs.......',
  '...wwwwwwwww......',
  '..ywwwwwwwwy......',
  '.syywwwwwwyys.....',
  '.sywwwwwwwwys.....',
  '..swwwwwwwws......',
  '...wwwwwwww.......',
  '....bb..bb........',
  '....bb..bb........',
  '....bb..bb........',
  '....bb..bb........',
  '...www..www.......',
  '..wwww..wwww......',
];
const VEGETA2 = [ // arm out blasting
  '......hhh.........',
  '.....hhhhh........',
  '....hhhhhhh.......',
  '...hhhhhhhhh......',
  '..hhhhhhhhhhh.....',
  '..hhhsssssss......',
  '...hsswkswks......',
  '....ssssssss......',
  '.....sSSSSs.......',
  '...wwwwwwwww......',
  '..ywwwwwwwwy......',
  '.syywwwwwwyyssss..',
  '.sywwwwwwwwys.....',
  '..swwwwwwwws......',
  '...wwwwwwww.......',
  '....bb..bb........',
  '....bb..bb........',
  '....bb..bb........',
  '....bb..bb........',
  '...www..www.......',
  '..wwww..wwww......',
];

const GINYU1 = [
  '..k..........k....',
  '..kk........kk....',
  '...pppppppppp.....',
  '..pppppppppppp....',
  '..ppwkppppwkpp....',
  '..pppppppppppp....',
  '...ppppSSppp......',
  '...wwwwwwwww......',
  '..ywwwwwwwwwy.....',
  '.pyywwwwwwwyyp....',
  '.pywwwwwwwwwyp....',
  '..pwwwwwwwww......',
  '...wwwwwwww.......',
  '....pp..pp........',
  '....pp..pp........',
  '....pp..pp........',
  '....pp..pp........',
  '...www..www.......',
  '..wwww..wwww......',
];
const GINYU2 = [
  '..k..........k....',
  '..kk........kk....',
  '...pppppppppp.....',
  '..pppppppppppp....',
  '..ppwkppppwkpp....',
  '..pppppppppppp....',
  '...ppppSSppp......',
  '...wwwwwwwww......',
  '.pywwwwwwwwwyp....',
  '.pyywwwwwwwyyp....',
  '..ywwwwwwwwwy.....',
  '..pwwwwwwwww......',
  '...wwwwwwww.......',
  '....pp..pp........',
  '....pp..pp........',
  '...pp....pp.......',
  '...pp....pp.......',
  '..www....www......',
  '.wwww....wwww.....',
];

const FRIEZA1 = [
  '....wwwwww........',
  '...wwwwwwww.......',
  '..wwPppppPww......',
  '..wwwkwwkwww......',
  '...wwwwwwww.......',
  '....wwWWww........',
  '...wwwwwwww.......',
  '..PwwwwwwwwP......',
  '..PwwwppwwwP......',
  '...wwwppwww.......',
  '...wwwwwwww.......',
  '....wwwwww........',
  '....ww..ww........',
  '....ww..ww.....ww.',
  '....ww..ww....ww..',
  '...www..www..ww...',
  '..wwww..wwwwww....',
];
const FRIEZA2 = [
  '....wwwwww........',
  '...wwwwwwww.......',
  '..wwPppppPww......',
  '..wwwkwwkwww......',
  '...wwwwwwww.......',
  '....wwWWww........',
  '..swwwwwwwws......',
  '.sPwwwwwwwwPs.....',
  '.sPwwwppwwwPs.....',
  '...wwwppwww.......',
  '...wwwwwwww.......',
  '....wwwwww........',
  '....ww..ww...ww...',
  '....ww..ww..ww....',
  '....ww..ww.ww.....',
  '...www..wwww......',
  '..wwww..www.......',
];

const MECH = [
  '.........MMMMMMMM...........',
  '.......MMmmmmmmmmMM.........',
  '......MmmccccccccmmM........',
  '......Mmcc.gg.gg.cmM........',
  '......Mmcc.gg.gg.cmM........',
  '......MmccccccccccmM........',
  '.....MMmmmmmmmmmmmmMM.......',
  '....MMMMMMMMMMMMMMMMMM......',
  '...MMmmmmmmmmmmmmmmmmMM.....',
  '..MMmmmmm.rrrrrr.mmmmmMM....',
  '.MMmmmmmm.rrrrrr.mmmmmmMM...',
  '.Mmmmmmmmm.rrrr.mmmmmmmmM...',
  '.Mmm..mmmmmmmmmmmmmm..mmM...',
  '.Mmm..MMMMMMMMMMMMMM..mmM...',
  '.MMM..MM..........MM..MMM...',
  '..MM..MM..........MM..MM....',
  '..mm..mm..........mm..mm....',
  '..mm..mm..........mm..mm....',
  '.MMM..MMM........MMM..MMM...',
  'MMMM..MMMM......MMMM..MMMM..',
];

// ---------------- OBJECTS ----------------
const DRAGONBALL = [
  '..ooo..',
  '.ooooo.',
  'oowoooo',
  'oooro.o',
  'oorrro.',
  '.ooro..',
  '..ooo..',
];
const ZENI = [
  '.yyyy.',
  'yYyyyy',
  'yyYYyy',
  'yyYYyy',
  'yyyyYy',
  '.yyyy.',
];
const SENZU = [
  '.ggg.',
  'ggggg',
  '.ggg.',
];
const SHIP = [
  '..........yyyyyy..........',
  '.......yyyyyyyyyyyy.......',
  '.....yyyyyccccccyyyyy.....',
  '....yyyyyycwwwwcyyyyyy....',
  '...yyyyyyyccccccyyyyyyy...',
  '...yyyyyyyyyyyyyyyyyyyy...',
  '...YYYYYYYYYYYYYYYYYYYY...',
  '....YYYYYYYYYYYYYYYYYY....',
  '......MM....MM....MM......',
  '.....MMM....MM....MMM.....',
];
const SHENRON_HEAD = [
  '...nn........nn.......',
  '..nnnn......nnnn......',
  '...gggggggggggg.......',
  '..gggggggggggggg......',
  '.ggeegggggggeegg......',
  '.gggggggggggggggg.....',
  '..ggggggggggggggggg...',
  '...wwwgggggggggggggg..',
  '....wwwggggggggggg....',
  '.....wwggggggg........',
  '......ggggg...........',
];

// ---------------- BUILD REGISTRY ----------------
const Sprites = {};
function buildSprites() {
  for (const ss of [false, true]) {
    const pal = ss ? PAL_SS : PAL;
    const k = ss ? 'ss_' : '';
    Sprites[k + 'idle']   = gokuFrame('idle', 'idle', pal);
    Sprites[k + 'run1']   = gokuFrame('run', 'run1', pal);
    Sprites[k + 'run2']   = gokuFrame('run', 'run2', pal);
    Sprites[k + 'run3']   = gokuFrame('run', 'run3', pal);
    Sprites[k + 'jump']   = gokuFrame('idle', 'jump', pal);
    Sprites[k + 'punch']  = gokuFrame('punch', 'idle', pal);
    Sprites[k + 'blast']  = gokuFrame('blast', 'run2', pal);
    Sprites[k + 'charge'] = gokuFrame('charge', 'crouch', pal);
    Sprites[k + 'kame']   = gokuFrame('kame', 'run2', pal);
    Sprites[k + 'hurt']   = gokuFrame('hurt', 'jump', pal);
    Sprites[k + 'fly1']   = makeSprite(GOKU_FLY1, pal);
    Sprites[k + 'fly2']   = makeSprite(GOKU_FLY2, pal);
  }
  Sprites.bulma = makeSprite(BULMA);
  Sprites.rrbot1 = makeSprite(RRBOT1);
  Sprites.rrbot2 = makeSprite(RRBOT2);
  Sprites.drone1 = makeSprite(DRONE1);
  Sprites.drone2 = makeSprite(DRONE2);
  Sprites.saiba1 = makeSprite(SAIBA1);
  Sprites.saiba2 = makeSprite(SAIBA2);
  Sprites.soldier1 = makeSprite(SOLDIER1);
  Sprites.soldier2 = makeSprite(SOLDIER2);
  Sprites.vegeta1 = makeSprite(VEGETA1);
  Sprites.vegeta2 = makeSprite(VEGETA2);
  Sprites.ginyu1 = makeSprite(GINYU1);
  Sprites.ginyu2 = makeSprite(GINYU2);
  Sprites.frieza1 = makeSprite(FRIEZA1);
  Sprites.frieza2 = makeSprite(FRIEZA2);
  Sprites.mech = makeSprite(MECH);
  Sprites.dragonball = makeSprite(DRAGONBALL);
  Sprites.zeni = makeSprite(ZENI);
  Sprites.senzu = makeSprite(SENZU);
  Sprites.ship = makeSprite(SHIP);
  Sprites.shenron = makeSprite(SHENRON_HEAD);
}
buildSprites();

// draw sprite with optional horizontal flip, anchored at bottom-center
function drawSprite(ctx, img, x, y, flip = false, scale = 1) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-scale, scale); else ctx.scale(scale, scale);
  ctx.drawImage(img, -img.width / 2, -img.height);
  ctx.restore();
}
