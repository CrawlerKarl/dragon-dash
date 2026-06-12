// ============================================================
// Dragon Dash — modern vector character & item renderer
// Smooth gradient-shaded characters drawn with canvas paths.
// All characters anchored at feet-center, facing +x, ~42px tall.
// ============================================================

function vGrad(g, x0, y0, x1, y1, c0, c1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
const V_OUT = 'rgba(18,18,40,0.55)';

const VPAL = {
  goku:    { skin: ['#ffe2bb', '#eaa86f'], gi: ['#ffa33c', '#e06d10'], giD: '#c25a08', under: '#2a4fd6', belt: '#1d3aa8', boots: ['#3a5ce8', '#1d3590'], wrist: '#2a4fd6', hair: ['#3a3a55', '#16161f'], hairLine: '#5a5a80' },
  gokuSS:  { skin: ['#ffe2bb', '#eaa86f'], gi: ['#ffa33c', '#e06d10'], giD: '#c25a08', under: '#2a4fd6', belt: '#1d3aa8', boots: ['#3a5ce8', '#1d3590'], wrist: '#2a4fd6', hair: ['#fff3a0', '#f0b800'], hairLine: '#fff8d0' },
  vegeta:  { skin: ['#ffe2bb', '#eaa86f'], gi: ['#2c3460', '#161c38'], giD: '#9aa0bc', under: '#1d2a6e', belt: '#ffd824', boots: ['#ffffff', '#a8aec8'], wrist: '#ffffff', hair: ['#3a3a55', '#16161f'], hairLine: '#5a5a80', limb: ['#2c3460', '#161c38'] },
  ginyu:   { skin: ['#c08ae8', '#7a4aaa'], gi: ['#ffffff', '#b8bdd4'], giD: '#9aa0bc', under: '#2a1d50', belt: '#ffd824', boots: ['#ffffff', '#a8aec8'], wrist: '#3a2a60', hair: null, hairLine: null, limb: ['#8a5ab8', '#5a3585'] },
  frieza:  { skin: ['#ffffff', '#c8cde0'], gi: ['#ffffff', '#c8cde0'], giD: '#aab0c8', under: '#7a3ab0', belt: '#7a3ab0', boots: ['#b06ae0', '#6a2a9a'], wrist: '#7a3ab0', hair: null, hairLine: null, limb: ['#e8ecf8', '#a8aec8'] },
  bulma:   { skin: ['#ffe2bb', '#eaa86f'], gi: ['#ffe04a', '#d8a818'], giD: '#b8881a', under: '#2c3560', belt: '#444a5e', boots: ['#8a5a30', '#5e3a1c'], wrist: '#2c3560', hair: ['#7ae8d8', '#2aa898'], hairLine: '#b8fff4', limb: ['#2c3560', '#1a2040'] },
  soldier: { skin: ['#c08ae8', '#7a4aaa'], gi: ['#f0f2fa', '#b0b6cc'], giD: '#969cb8', under: '#3a2a60', belt: '#ffd824', boots: ['#ffffff', '#a8aec8'], wrist: '#3a2a60', hair: null, hairLine: null, limb: ['#6a4a9a', '#46306a'] },
};

// limb drawn as a tapered capsule from (x0,y0) to (x1,y1)
function vLimb(g, x0, y0, x1, y1, w, fill) {
  g.strokeStyle = fill;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = 1;
}

// hair spike silhouettes per style: [tip points relative to head center]
const V_HAIR = {
  goku:   [[-16, -2], [-13, -11], [-8, -17], [-2, -20], [3, -16], [8, -19], [13, -10], [15, -3]],
  gokuSS: [[-9, -9], [-6, -19], [-2, -25], [3, -26], [6, -20], [9, -13], [11, -5]],
  vegeta: [[-7, -8], [-5, -18], [-2, -24], [2, -26], [5, -22], [7, -15], [9, -7]],
};

// poses: hand/foot endpoint generators (new muscular skeleton)
function vPose(pose, t) {
  const swing = Math.sin(t * 11);
  switch (pose) {
    case 'run': return {
      legB: [3 + swing * 6, -1 + Math.max(0, -swing) * -3], legF: [3 - swing * 6, -1 + Math.max(0, swing) * -3],
      armB: [-5 - swing * 5, -23], armF: [-5 + swing * 5, -23], lean: 0.13,
    };
    case 'jump': return { legB: [-3, -7], legF: [6, -4], armB: [-9, -30], armF: [8, -32], lean: 0.05 };
    case 'punch': return { legB: [-4, 0], legF: [6, 0], armB: [-8, -22], armF: [17, -30], lean: 0.12 };
    case 'blast': return { legB: [-4, 0], legF: [6, 0], armB: [-8, -22], armF: [16, -31], lean: 0.07 };
    case 'charge': return { legB: [-5, 0], legF: [6, 0], armB: [-10, -19], armF: [10, -19], lean: 0 };
    case 'kame': return { legB: [-5, 0], legF: [6, 0], armB: [15, -29], armF: [16, -31], lean: 0.12 };
    case 'hurt': return { legB: [-5, -4], legF: [5, -2], armB: [-12, -35], armF: [11, -36], lean: -0.12 };
    case 'fly': return { legB: [-2, 2], legF: [1, 3], armB: [2, -50], armF: [5, -52], lean: 0 };
    default: return {
      legB: [-4, 0], legF: [5, 0], armB: [-7, -19 + Math.sin(t * 2.4) * 0.5], armF: [7, -19 + Math.sin(t * 2.4) * 0.5], lean: 0,
    };
  }
}

// two-segment limb with a joint (elbow/knee) — key to the 3D feel
function vJointLimb(g, x0, y0, x1, y1, w0, w1, c, bend, perpSign) {
  let dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const ex = (x0 + x1) / 2 - dy * bend * perpSign, ey = (y0 + y1) / 2 + dx * bend * perpSign;
  g.strokeStyle = c; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = w0;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, ey); g.stroke();
  g.lineWidth = w1;
  g.beginPath(); g.moveTo(ex, ey); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = 1;
}

// spiky hair mass around the upper head
function vHair(g, hx, hy, pts, pal) {
  const hg = vGrad(g, hx - 10, hy - 20, hx + 8, hy, pal.hair[0], pal.hair[1]);
  g.fillStyle = hg;
  g.strokeStyle = V_OUT; g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(hx - 7.4, hy + 1.5);
  for (let i = 0; i < pts.length; i++) {
    const [tx, ty] = pts[i];
    const a = Math.atan2(ty, tx) + 0.4;
    g.lineTo(hx + tx, hy + ty);
    g.lineTo(hx + Math.cos(a) * 6.4, hy + Math.sin(a) * 6.4);
  }
  g.lineTo(hx + 7.6, hy + 0.5);
  g.quadraticCurveTo(hx + 2, hy - 6.5, hx - 7.4, hy + 1.5);
  g.closePath();
  g.fill(); g.stroke();
  // sheen
  g.strokeStyle = pal.hairLine; g.lineWidth = 1;
  g.beginPath(); g.moveTo(hx - 4, hy - 7); g.lineTo(hx + pts[2][0] * 0.5, hy + pts[2][1] * 0.5); g.stroke();
}

// the parametric DBZ fighter — muscular build, jointed limbs, cel shading
function drawVChar(g, x, y, o) {
  const pal = VPAL[o.ss ? 'gokuSS' : o.style] || VPAL.goku;
  const sc = o.scale || 1;
  g.save();
  g.translate(x, y);
  if (o.rotate) g.rotate(o.rotate);
  g.scale((o.flip ? -1 : 1) * sc, sc);
  const P = vPose(o.pose || 'idle', o.anim || 0);
  g.rotate(-(P.lean || 0));
  g.lineJoin = 'round';

  const hipY = -17, shY = -33;
  const limb = pal.limb || pal.gi;
  const armored = o.style === 'vegeta' || o.style === 'ginyu' || o.style === 'soldier';
  const gloved = armored;

  // ---- back limbs (shaded darker) ----
  vJointLimb(g, -1.5, hipY, P.legB[0], P.legB[1], 6.2, 5, limb[1], 2.4, -1);
  g.fillStyle = pal.boots[1];
  g.beginPath(); g.ellipse(P.legB[0] + 0.8, P.legB[1] - 0.6, 4, 2.6, 0, 0, 7); g.fill();
  vJointLimb(g, -4.5, shY + 1, P.armB[0], P.armB[1], 5.6, 4.4, limb[1], 2.6, 1);
  g.fillStyle = gloved ? '#cfd4e4' : pal.skin[1];
  g.beginPath(); g.arc(P.armB[0], P.armB[1], 2.8, 0, 7); g.fill();

  // ---- torso: broad shoulders, V-taper, muscle shading ----
  const torso = vGrad(g, -8, -31, 8, -14, pal.gi[0], pal.gi[1]);
  g.fillStyle = torso;
  g.strokeStyle = V_OUT; g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-8.6, shY - 1);
  g.quadraticCurveTo(0.5, shY - 3.6, 9.2, shY - 1);
  g.quadraticCurveTo(9.4, -22, 5.6, hipY - 1);
  g.quadraticCurveTo(0, hipY + 1.6, -5.4, hipY - 1);
  g.quadraticCurveTo(-9, -22, -8.6, shY - 1);
  g.closePath();
  g.fill(); g.stroke();
  // pec line + side shade (cel shading)
  g.strokeStyle = 'rgba(20,20,50,0.28)'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-4.5, -25.5); g.quadraticCurveTo(1, -23.6, 6, -25.5); g.stroke();
  g.fillStyle = 'rgba(20,20,60,0.13)';
  g.beginPath();
  g.moveTo(9.2, shY - 1); g.quadraticCurveTo(9.4, -22, 5.6, hipY - 1);
  g.quadraticCurveTo(7.5, -22, 6.4, shY - 1.4); g.closePath(); g.fill();
  // rim light (top-left)
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(-7.8, shY - 1.4); g.quadraticCurveTo(-8.6, -24, -6.6, -18); g.stroke();
  g.lineWidth = 1;

  if (armored) {
    // saiyan battle armor: white chest plate + golden shoulder pads
    g.fillStyle = vGrad(g, -8, -30, 8, -18, '#ffffff', '#b8bdd4');
    g.strokeStyle = V_OUT; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-8.4, shY - 0.6);
    g.quadraticCurveTo(0.5, shY - 3, 9, shY - 0.6);
    g.quadraticCurveTo(8.6, -21.5, 4.6, -19.5);
    g.quadraticCurveTo(0, -18.3, -4.4, -19.5);
    g.quadraticCurveTo(-8.4, -21.5, -8.4, shY - 0.6);
    g.closePath(); g.fill(); g.stroke();
    if (o.style === 'vegeta') {
      // gold shoulder straps
      g.fillStyle = vGrad(g, 0, shY - 3, 0, shY + 4, '#ffe04a', '#c89210');
      g.fillRect(-7.2, shY - 2.6, 3.1, 6.5);
      g.fillRect(4.6, shY - 2.6, 3.1, 6.5);
      g.strokeStyle = V_OUT; g.lineWidth = 0.9;
      g.strokeRect(-7.2, shY - 2.6, 3.1, 6.5); g.strokeRect(4.6, shY - 2.6, 3.1, 6.5);
      g.lineWidth = 1;
      // abdomen crest
      g.fillStyle = '#ffd230';
      g.fillRect(-2.6, -23.4, 5.2, 2.0);
    } else if (o.style !== 'frieza') {
      g.fillStyle = vGrad(g, -12, -31, -4, -26, '#ffe04a', '#d09a10');
      g.beginPath(); g.ellipse(-8.6, shY - 0.4, 4.4, 3, 0.25, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(9.2, shY - 0.4, 4.4, 3, -0.25, 0, 7);
      g.fillStyle = vGrad(g, 5, -31, 13, -26, '#ffe04a', '#d09a10'); g.fill(); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.ellipse(-3, -26.5, 3, 2, 0.4, 0, 7); g.fill();
  } else if (o.style === 'frieza') {
    // chest gem
    g.fillStyle = vGrad(g, -3, -27, 3, -21, '#b06ae0', '#6a2a9a');
    g.beginPath(); g.ellipse(0.5, -24, 3.6, 4.4, 0, 0, 7); g.fill();
    g.strokeStyle = V_OUT; g.lineWidth = 1; g.stroke();
    // shoulder orbs
    for (const sx of [-8.6, 9.2]) {
      g.fillStyle = vGrad(g, sx - 3, -32, sx + 3, -26, '#b06ae0', '#6a2a9a');
      g.beginPath(); g.arc(sx, shY - 0.5, 3.4, 0, 7); g.fill(); g.stroke();
    }
  } else if (o.style === 'goku' || o.ss) {
    // wide navy collar wrap (iconic gi neckline)
    g.strokeStyle = pal.under; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-7.5, shY - 0.5); g.quadraticCurveTo(1, shY + 4.5, 8, shY - 0.5); g.stroke();
    g.lineWidth = 1;
    // sternum + ab definition
    g.strokeStyle = 'rgba(20,20,50,0.22)';
    g.beginPath(); g.moveTo(0.6, -27); g.lineTo(0.6, -22); g.stroke();
    g.fillStyle = '#fff3da';
    g.beginPath(); g.arc(-3.8, -24.5, 2.5, 0, 7); g.fill();
    g.strokeStyle = '#c2520a'; g.lineWidth = 0.9;
    g.beginPath(); g.arc(-3.8, -24.5, 2.5, 0, 7); g.stroke();
    g.strokeStyle = '#a04408';
    g.beginPath(); g.moveTo(-4.8, -25.3); g.lineTo(-2.8, -25.3); g.moveTo(-3.8, -25.6); g.lineTo(-3.8, -23.4); g.stroke();
    g.lineWidth = 1;
  }

  // belt
  g.fillStyle = pal.belt;
  g.fillRect(-5.6, hipY - 2.2, 11.6, 3);
  if (o.style === 'goku' || o.ss) {
    // sash knot + hanging tail
    g.fillStyle = pal.under;
    g.beginPath(); g.ellipse(0.5, hipY - 0.4, 2.3, 1.7, 0, 0, 7); g.fill();
    g.strokeStyle = pal.under; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(1.2, hipY); g.quadraticCurveTo(2.6, hipY + 4, 1.4, hipY + 7.5); g.stroke();
    g.lineWidth = 1;
  }

  // ---- front limbs ----
  vJointLimb(g, 2, hipY, P.legF[0], P.legF[1], 6.6, 5.4, limb[0], 2.4, -1);
  g.fillStyle = pal.boots[0];
  g.strokeStyle = V_OUT; g.lineWidth = 1;
  g.beginPath(); g.ellipse(P.legF[0] + 1, P.legF[1] - 0.6, 4.4, 2.8, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.beginPath(); g.ellipse(P.legF[0], P.legF[1] - 1.6, 2.4, 1, 0, 0, 7); g.fill();

  vJointLimb(g, 3.5, shY + 1, P.armF[0], P.armF[1], 6, 4.8, limb[0], 2.8, 1);
  // wristband
  const wfx = P.armF[0], wfy = P.armF[1];
  g.strokeStyle = gloved ? '#ffffff' : pal.wrist;
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(wfx - (wfx - 3.5) * 0.16, wfy - (wfy - shY - 1) * 0.16); g.lineTo(wfx - (wfx - 3.5) * 0.05, wfy - (wfy - shY - 1) * 0.05); g.stroke();
  g.lineWidth = 1;
  // hand / fist
  g.fillStyle = gloved ? '#ffffff' : pal.skin[0];
  g.beginPath(); g.arc(wfx, wfy, 3.1, 0, 7); g.fill();
  g.strokeStyle = V_OUT; g.beginPath(); g.arc(wfx, wfy, 3.1, 0, 7); g.stroke();

  // ---- head ----
  const hx = 1.5, hy = -43;
  const headG = g.createRadialGradient(hx - 2.5, hy - 2.5, 1.5, hx, hy, 8.6);
  headG.addColorStop(0, pal.skin[0]); headG.addColorStop(1, pal.skin[1]);
  g.fillStyle = headG;
  g.strokeStyle = V_OUT; g.lineWidth = 1.3;
  g.beginPath();
  g.arc(hx, hy - 0.8, 6.9, Math.PI * 0.92, Math.PI * 0.08, false);
  g.quadraticCurveTo(hx + 6.6, hy + 5.4, hx + 2.2, hy + 6.6); // jaw
  g.quadraticCurveTo(hx - 5.8, hy + 6.6, hx - 6.9, hy + 0.5);
  g.closePath();
  g.fill(); g.stroke();
  // neck shadow
  g.fillStyle = 'rgba(20,20,60,0.18)';
  g.beginPath(); g.ellipse(hx, hy + 6.4, 3.4, 1.2, 0, 0, 7); g.fill();
  // ear
  g.fillStyle = pal.skin[1];
  g.beginPath(); g.ellipse(hx - 5.6, hy + 1, 1.6, 2.2, 0.1, 0, 7); g.fill();

  // hair / cranial features
  if (pal.hair && (o.ss || V_HAIR[o.style])) {
    vHair(g, hx, hy - 1, o.ss ? V_HAIR.gokuSS : V_HAIR[o.style], pal);
    if (o.style === 'vegeta' && !o.ss) {
      // widow's peak
      g.fillStyle = pal.hair[1];
      g.beginPath(); g.moveTo(hx - 3.5, hy - 4.5); g.lineTo(hx - 0.5, hy - 0.5); g.lineTo(hx + 2.5, hy - 4.5); g.closePath(); g.fill();
    } else if (!o.ss) {
      // goku forehead bangs
      g.fillStyle = pal.hair[1];
      g.beginPath(); g.moveTo(hx - 4.5, hy - 5); g.lineTo(hx - 2.5, hy - 0.5); g.lineTo(hx - 1, hy - 5); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(hx - 0.5, hy - 5.4); g.lineTo(hx + 1.5, hy - 1.2); g.lineTo(hx + 3, hy - 5.2); g.closePath(); g.fill();
    } else {
      // SS bangs
      g.fillStyle = pal.hair[1];
      g.beginPath(); g.moveTo(hx - 3.5, hy - 5.5); g.lineTo(hx - 1.5, hy - 1); g.lineTo(hx, hy - 5.5); g.closePath(); g.fill();
    }
  } else if (o.style === 'bulma') {
    const hg2 = vGrad(g, hx - 9, hy - 10, hx + 8, hy + 2, VPAL.bulma.hair[0], VPAL.bulma.hair[1]);
    g.fillStyle = hg2; g.strokeStyle = V_OUT; g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(hx - 0.5, hy - 3.6, 7.8, 5.2, 0, Math.PI * 0.97, Math.PI * 2.06);
    g.quadraticCurveTo(hx + 4, hy - 1, hx + 1.5, hy - 2.5);
    g.quadraticCurveTo(hx - 3, hy - 4, hx - 8.2, hy - 1.5);
    g.closePath(); g.fill(); g.stroke();
    g.beginPath();
    g.moveTo(hx - 8, hy - 2.5);
    g.quadraticCurveTo(hx - 9.5, hy + 5, hx - 6.5, hy + 7);
    g.quadraticCurveTo(hx - 5.2, hy + 2.5, hx - 6, hy - 1.5);
    g.closePath(); g.fill(); g.stroke();
    // red headband
    g.strokeStyle = '#e8285a'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(hx - 6.6, hy - 1.8); g.quadraticCurveTo(hx, hy - 4.6, hx + 6.4, hy - 2.2); g.stroke();
    g.lineWidth = 1;
  } else if (o.style === 'ginyu') {
    g.fillStyle = '#22222e';
    g.beginPath(); g.moveTo(hx - 5.5, hy - 4); g.lineTo(hx - 11, hy - 8.5); g.lineTo(hx - 4.5, hy - 6.5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(hx + 5, hy - 4.5); g.lineTo(hx + 10.5, hy - 9.5); g.lineTo(hx + 3.8, hy - 7); g.closePath(); g.fill();
  } else if (o.style === 'frieza') {
    g.fillStyle = vGrad(g, hx - 5, hy - 8, hx + 5, hy - 1, '#b06ae0', '#6a2a9a');
    g.beginPath(); g.ellipse(hx, hy - 4, 5.4, 4.2, 0, Math.PI, 0); g.fill();
    g.strokeStyle = V_OUT; g.lineWidth = 1;
    g.beginPath(); g.ellipse(hx, hy - 4, 5.4, 4.2, 0, Math.PI, 0); g.stroke();
    // side head fins
    g.fillStyle = '#e8ecf8';
    g.beginPath(); g.ellipse(hx - 6.6, hy - 1.5, 1.8, 2.6, -0.3, 0, 7); g.fill();
  }

  // ---- face: sharp anime eyes, heavy lids, serious expression ----
  const ex = hx + 2.6, ey = hy + 0.4;
  const iris = o.style === 'frieza' ? '#d01818' : (o.ss ? '#0a9a70' : '#1a1a2a');
  for (const [ox, w] of [[-0.6, 2.1], [4.4, 1.7]]) {
    // sclera
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(ex + ox - w, ey - 0.5);
    g.quadraticCurveTo(ex + ox, ey - 2.2, ex + ox + w, ey - 0.7);
    g.quadraticCurveTo(ex + ox + w * 0.5, ey + 2.0, ex + ox - w * 0.6, ey + 1.5);
    g.closePath(); g.fill();
    // iris
    g.fillStyle = iris;
    g.beginPath(); g.ellipse(ex + ox + 0.5, ey + 0.1, 1.05, 1.55, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ex + ox + 0.75, ey - 0.4, 0.3, 0, 7); g.fill();
    // heavy upper lid
    g.strokeStyle = '#10101e'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(ex + ox - w - 0.3, ey - 0.5); g.quadraticCurveTo(ex + ox, ey - 2.4, ex + ox + w + 0.3, ey - 0.8); g.stroke();
  }
  // brows: thick, angled hard toward the nose
  g.strokeStyle = o.ss ? '#c89a00' : (o.style === 'frieza' ? '#6a2a9a' : '#10101e');
  g.lineWidth = 1.3;
  const brow = o.style === 'vegeta' ? 0.9 : 0.4;
  g.beginPath(); g.moveTo(ex - 2.6, ey - 2.9); g.lineTo(ex + 1.3, ey - 2.5 - brow); g.stroke();
  g.beginPath(); g.moveTo(ex + 6.2, ey - 2.8); g.lineTo(ex + 3.3, ey - 2.5 - brow); g.stroke();
  g.lineWidth = 1;
  // nose + mouth (small, serious)
  g.strokeStyle = 'rgba(90,55,40,0.95)';
  g.beginPath(); g.moveTo(ex + 2.7, ey + 1.7); g.lineTo(ex + 3.3, ey + 2.3); g.stroke();
  g.beginPath();
  if (o.pose === 'hurt') { g.arc(ex + 2.2, ey + 4.4, 1.3, 0, 7); }
  else if (o.pose === 'kame' || o.pose === 'charge' || o.pose === 'punch') { g.moveTo(ex + 0.8, ey + 4.4); g.lineTo(ex + 4.4, ey + 4.2); }
  else { g.moveTo(ex + 1.2, ey + 4.3); g.quadraticCurveTo(ex + 2.8, ey + 4.9, ex + 4.4, ey + 4.1); }
  g.stroke();
  // cheekbone shade
  g.fillStyle = 'rgba(190,105,55,0.14)';
  g.beginPath(); g.ellipse(ex + 4.8, ey + 2.6, 1.7, 0.9, 0.3, 0, 7); g.fill();

  // frieza tail
  if (o.style === 'frieza') {
    g.strokeStyle = '#c8cde0';
    g.lineWidth = 2.8; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-4, hipY + 1);
    g.quadraticCurveTo(-13, hipY + 5 + Math.sin((o.anim || 0) * 3) * 2, -17, -1.5);
    g.stroke();
    g.lineWidth = 1;
  }
  g.restore();
}

// ---------------- enemies ----------------
function drawVRobot(g, x, y, o) {
  const sc = (o.scale || 1);
  g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * sc, sc);
  const bob = Math.sin((o.anim || 0) * 6) * 1.2;
  // treads
  g.fillStyle = vGrad(g, -9, -5, 9, 0, '#3a3f52', '#16181f');
  g.beginPath(); g.ellipse(-5, -2.5, 4.4, 3, 0, 0, 7); g.ellipse(5, -2.5, 4.4, 3, 0, 0, 7); g.fill();
  // body
  g.fillStyle = vGrad(g, -9, -22, 9, -4, '#aab2c8', '#5a6076');
  g.strokeStyle = V_OUT; g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(-9, -5); g.quadraticCurveTo(-10.5, -19 + bob, 0, -20 + bob);
  g.quadraticCurveTo(10.5, -19 + bob, 9, -5); g.closePath();
  g.fill(); g.stroke();
  // chest light (RR insignia)
  g.fillStyle = '#e03131';
  g.beginPath(); g.arc(0, -10.4 + bob * 0.5, 2.2, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.arc(-0.9, -11.9 + bob * 0.5, 0.9, 0, 7); g.fill();
  // eyes
  g.fillStyle = '#ff4040';
  g.beginPath(); g.arc(-3.9, -16.5 + bob, 1.3, 0, 7); g.fill();
  g.beginPath(); g.arc(3.9, -16.5 + bob, 1.3, 0, 7); g.fill();
  // sheen
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.ellipse(-3.5, -17 + bob, 2.6, 3.6, 0.5, 0, 7); g.fill();
  g.restore();
}

function drawVDrone(g, x, y, o) {
  const sc = (o.scale || 1);
  g.save(); g.translate(x, y); g.scale(sc, sc);
  g.fillStyle = vGrad(g, -8, -10, 8, -2, o.frieza ? '#c08ae8' : '#aab2c8', o.frieza ? '#6a3a9a' : '#565c74');
  g.strokeStyle = V_OUT; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, -6, 8.4, 4.4, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = vGrad(g, -3, -11, 3, -6, '#8af4ff', '#2aa0c8');
  g.beginPath(); g.ellipse(0, -8, 3.6, 3, 0, Math.PI, 0); g.fill();
  const ph = Math.floor((o.anim || 0) * 14) % 2;
  g.fillStyle = ph ? '#ff4040' : '#ff9040';
  g.beginPath(); g.arc(0, -5.4, 1.4, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.beginPath(); g.ellipse(-3, -7.6, 3, 1.4, 0.2, 0, 7); g.fill();
  g.restore();
}

function drawVSaiba(g, x, y, o) {
  const sc = (o.scale || 1);
  g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * sc, sc);
  const squash = o.air ? 1.12 : 1 + Math.sin((o.anim || 0) * 7) * 0.04;
  g.scale(1 / Math.sqrt(squash), squash);
  // legs
  vLimb(g, -3, -6, -5.5, 0, 3.6, '#2c7a36');
  vLimb(g, 3, -6, 5.5, 0, 3.6, '#2c7a36');
  // arms with claws
  vLimb(g, -5, -12, -9, -7, 3, '#2c7a36');
  vLimb(g, 5, -12, 9.5, -8, 3, '#3fae49');
  // body
  g.fillStyle = vGrad(g, -7, -19, 7, -3, '#5ad06a', '#2c8a3a');
  g.strokeStyle = V_OUT; g.lineWidth = 1.3;
  g.beginPath(); g.ellipse(0, -10.5, 7, 8, 0, 0, 7); g.fill(); g.stroke();
  // head bulb
  g.fillStyle = vGrad(g, -5, -24, 5, -15, '#7ae88a', '#3fae49');
  g.beginPath(); g.ellipse(0, -19, 5.6, 5, 0, 0, 7); g.fill(); g.stroke();
  // eyes
  g.fillStyle = '#ff3a3a';
  g.beginPath(); g.ellipse(-2.4, -18.5, 1.6, 2, 0.2, 0, 7); g.ellipse(2.8, -18.5, 1.6, 2, -0.2, 0, 7); g.fill();
  // grin
  g.strokeStyle = '#1c4a22'; g.lineWidth = 1.1;
  g.beginPath(); g.arc(0.4, -13.4, 2.6, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.ellipse(-2, -21, 2.4, 1.6, 0.4, 0, 7); g.fill();
  g.restore();
}

function drawVMech(g, x, y, o) {
  const sc = (o.scale || 1) * 1.15;
  g.save(); g.translate(x, y); g.scale((o.flip ? -1 : 1) * sc, sc);
  const step = Math.sin((o.anim || 0) * 5) * 2;
  // legs
  for (const [lx, ph] of [[-12, step], [12, -step]]) {
    g.strokeStyle = vGrad(g, lx, -18, lx, 0, '#8a92a8', '#4a5066');
    g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(lx * 0.7, -18); g.lineTo(lx + ph * 0.4, -2); g.stroke();
    g.fillStyle = '#30354a';
    g.beginPath(); g.ellipse(lx + ph * 0.4, -1.5, 6.5, 2.8, 0, 0, 7); g.fill();
  }
  g.lineWidth = 1;
  // hull
  g.fillStyle = vGrad(g, -18, -42, 18, -14, '#b8c0d8', '#5e6680');
  g.strokeStyle = V_OUT; g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-17, -16);
  g.quadraticCurveTo(-20, -38, 0, -40);
  g.quadraticCurveTo(20, -38, 17, -16);
  g.quadraticCurveTo(0, -11, -17, -16);
  g.closePath(); g.fill(); g.stroke();
  // cockpit dome
  g.fillStyle = vGrad(g, -8, -48, 8, -36, '#9af4ff', '#2a98c8');
  g.beginPath(); g.ellipse(0, -39, 9.5, 7.5, 0, Math.PI, 0); g.fill();
  g.strokeStyle = V_OUT; g.beginPath(); g.ellipse(0, -39, 9.5, 7.5, 0, Math.PI, 0); g.stroke();
  // RR badge
  g.fillStyle = '#e03131';
  g.beginPath(); g.arc(0, -26, 5, 0, 7); g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 6px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); if (o.flip) g.scale(-1, 1); g.fillText('RR', 0, -25.6); g.restore();
  // arm cannons
  g.strokeStyle = vGrad(g, 0, -30, 0, -20, '#8a92a8', '#4a5066');
  g.lineWidth = 5.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-16, -28); g.lineTo(-24, -22); g.stroke();
  g.beginPath(); g.moveTo(16, -28); g.lineTo(24, -22); g.stroke();
  g.lineWidth = 1;
  g.fillStyle = '#22242e';
  g.beginPath(); g.arc(-24.5, -21.5, 3, 0, 7); g.arc(24.5, -21.5, 3, 0, 7); g.fill();
  // sheen
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.ellipse(-7, -34, 6, 9, 0.5, 0, 7); g.fill();
  g.restore();
}

// ---------------- items ----------------
function drawVCoin(g, x, y, phase, sc = 1) {
  const w = Math.abs(Math.cos(phase));
  g.save(); g.translate(x, y); g.scale(sc, sc);
  // glow
  const gl = g.createRadialGradient(0, 0, 1, 0, 0, 9);
  gl.addColorStop(0, 'rgba(255,216,60,0.35)'); gl.addColorStop(1, 'rgba(255,216,60,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
  // edge
  g.fillStyle = '#a87800';
  g.beginPath(); g.ellipse(0, 0, 5.2 * Math.max(0.18, w), 5.4, 0, 0, 7); g.fill();
  // face
  const cg = g.createRadialGradient(-1.5, -1.8, 0.5, 0, 0, 5.4);
  cg.addColorStop(0, '#fff3a8'); cg.addColorStop(0.55, '#ffd02e'); cg.addColorStop(1, '#d09000');
  g.fillStyle = cg;
  g.beginPath(); g.ellipse(0, 0, 4.7 * Math.max(0.12, w), 5, 0, 0, 7); g.fill();
  if (w > 0.45) {
    g.fillStyle = 'rgba(160,110,0,0.8)';
    g.font = `bold ${7 * w}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.scale(w, 1); g.fillText('Z', 0, 0.5); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.ellipse(-1.6 * w, -2.4, 1.5 * w, 0.8, -0.5, 0, 7); g.fill();
  }
  g.restore();
}

function drawVBall(g, x, y, sc = 1, time = 0) {
  g.save(); g.translate(x, y); g.scale(sc, sc);
  const gl = g.createRadialGradient(0, 0, 2, 0, 0, 11);
  gl.addColorStop(0, `rgba(255,170,40,${0.4 + Math.sin(time * 4) * 0.12})`); gl.addColorStop(1, 'rgba(255,170,40,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
  const bg = g.createRadialGradient(-2.2, -2.6, 1, 0, 0, 6.4);
  bg.addColorStop(0, '#ffd9a0'); bg.addColorStop(0.4, '#ffa030'); bg.addColorStop(1, '#c85a00');
  g.fillStyle = bg;
  g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
  // star
  g.fillStyle = '#e03131';
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const a2 = a + Math.PI / 5;
    g.lineTo(0.6 + Math.cos(a) * 2.6, 0.4 + Math.sin(a) * 2.6);
    g.lineTo(0.6 + Math.cos(a2) * 1.1, 0.4 + Math.sin(a2) * 1.1);
  }
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.ellipse(-2.3, -2.8, 1.8, 1, -0.6, 0, 7); g.fill();
  g.restore();
}

function drawVSenzu(g, x, y, sc = 1) {
  g.save(); g.translate(x, y); g.scale(sc, sc);
  const gl = g.createRadialGradient(0, 0, 1, 0, 0, 8);
  gl.addColorStop(0, 'rgba(110,230,120,0.35)'); gl.addColorStop(1, 'rgba(110,230,120,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
  g.fillStyle = vGrad(g, -4, -3, 4, 3, '#9af0a0', '#3a9a48');
  g.strokeStyle = 'rgba(20,60,30,0.6)'; g.lineWidth = 1;
  g.save(); g.rotate(-0.5);
  g.beginPath(); g.ellipse(0, 0, 4.6, 2.5, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.ellipse(-1.4, -0.9, 1.8, 0.7, 0, 0, 7); g.fill();
  g.restore(); g.restore();
}
