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
  vegeta:  { skin: ['#ffe2bb', '#eaa86f'], gi: ['#ffffff', '#b8bdd4'], giD: '#9aa0bc', under: '#1d2a6e', belt: '#ffd824', boots: ['#ffffff', '#a8aec8'], wrist: '#ffffff', hair: ['#3a3a55', '#16161f'], hairLine: '#5a5a80', limb: ['#3548c8', '#1d2a6e'] },
  ginyu:   { skin: ['#c08ae8', '#7a4aaa'], gi: ['#ffffff', '#b8bdd4'], giD: '#9aa0bc', under: '#2a1d50', belt: '#ffd824', boots: ['#ffffff', '#a8aec8'], wrist: '#3a2a60', hair: null, hairLine: null, limb: ['#8a5ab8', '#5a3585'] },
  frieza:  { skin: ['#ffffff', '#c8cde0'], gi: ['#ffffff', '#c8cde0'], giD: '#aab0c8', under: '#7a3ab0', belt: '#7a3ab0', boots: ['#b06ae0', '#6a2a9a'], wrist: '#7a3ab0', hair: null, hairLine: null, limb: ['#e8ecf8', '#a8aec8'] },
  bulma:   { skin: ['#ffe2bb', '#eaa86f'], gi: ['#ffffff', '#d0d4e4'], giD: '#b8bdd4', under: '#e03131', belt: '#e03131', boots: ['#8a5a30', '#5e3a1c'], wrist: '#ffffff', hair: ['#7ae8d8', '#2aa898'], hairLine: '#b8fff4', limb: ['#e85a5a', '#b02828'] },
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
  goku:   [[-13, -4], [-11, -11], [-5, -15], [1, -17], [7, -13], [11, -7]],
  gokuSS: [[-9, -9], [-6, -16], [-1, -19], [4, -17], [8, -12], [11, -5]],
  vegeta: [[-8, -10], [-4, -18], [1, -20], [5, -15], [8, -8]],
  bulma:  null, // bob, drawn separately
};

// poses: arm/leg endpoint generators. t = anim phase
function vPose(pose, t) {
  const swing = Math.sin(t * 11);
  switch (pose) {
    case 'run': return {
      legB: [3 + swing * 5, -1 + Math.max(0, -swing) * -3], legF: [3 - swing * 5, -1 + Math.max(0, swing) * -3],
      armB: [-5 - swing * 4, -16], armF: [-5 + swing * 4, -16], lean: 0.12,
    };
    case 'jump': return { legB: [-2, -6], legF: [5, -3], armB: [-8, -22], armF: [7, -24], lean: 0.05 };
    case 'punch': return { legB: [-3, 0], legF: [5, 0], armB: [-7, -16], armF: [14, -21], lean: 0.1 };
    case 'blast': return { legB: [-3, 0], legF: [5, 0], armB: [-7, -16], armF: [13, -22], lean: 0.06 };
    case 'charge': return { legB: [-4, 0], legF: [5, 0], armB: [-8, -14], armF: [8, -14], lean: 0 };
    case 'kame': return { legB: [-4, 0], legF: [5, 0], armB: [12, -20], armF: [13, -22], lean: 0.1 };
    case 'hurt': return { legB: [-4, -4], legF: [4, -2], armB: [-10, -26], armF: [9, -27], lean: -0.12 };
    case 'fly': return { legB: [-2, 2], legF: [1, 3], armB: [2, -38], armF: [5, -40], lean: 0 };
    default: return { // idle with breathing
      legB: [-3, 0], legF: [4, 0], armB: [-6, -14 + Math.sin(t * 2.4) * 0.5], armF: [6, -14 + Math.sin(t * 2.4) * 0.5], lean: 0,
    };
  }
}

// the parametric humanoid
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

  const hipY = -13, shY = -24;
  const limb = pal.limb || pal.gi;
  // back leg + arm (darker)
  vLimb(g, -1, hipY, P.legB[0], P.legB[1], 5.4, limb[1]);
  g.strokeStyle = V_OUT; // boot back
  vLimb(g, P.legB[0], P.legB[1] - 1, P.legB[0] + 1, P.legB[1], 6.4, pal.boots[1]);
  vLimb(g, -3, shY, P.armB[0], P.armB[1], 4.6, limb[1]);
  // hand back
  g.fillStyle = pal.skin[1];
  g.beginPath(); g.arc(P.armB[0], P.armB[1], 2.6, 0, 7); g.fill();

  // torso (gi with gradient + outline)
  const torso = vGrad(g, -7, -26, 7, -12, pal.gi[0], pal.gi[1]);
  g.fillStyle = torso;
  g.strokeStyle = V_OUT;
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(-6.5, shY - 1.5);
  g.quadraticCurveTo(8.5, shY - 3, 7, -16);
  g.quadraticCurveTo(6.5, hipY + 1.5, 0, hipY + 1.5);
  g.quadraticCurveTo(-6.5, hipY + 1.5, -6, -17);
  g.closePath();
  g.fill(); g.stroke();
  // belt
  g.fillStyle = pal.belt;
  g.fillRect(-5.8, -15.4, 12, 2.6);
  // collar / undershirt V
  g.fillStyle = pal.under;
  g.beginPath(); g.moveTo(0.5, shY - 1.5); g.lineTo(4.5, shY - 1); g.lineTo(2.5, -20.5); g.closePath(); g.fill();
  // torso sheen
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.ellipse(-2, -21, 3.4, 5, 0.4, 0, 7); g.fill();

  // front leg
  vLimb(g, 1.5, hipY, P.legF[0], P.legF[1], 5.6, limb[0]);
  vLimb(g, P.legF[0], P.legF[1] - 1, P.legF[0] + 1.5, P.legF[1], 6.6, pal.boots[0]);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(P.legF[0] - 1, P.legF[1] - 3); g.lineTo(P.legF[0] + 1.5, P.legF[1] - 3); g.stroke();
  // front arm + wristband + hand
  vLimb(g, 2.5, shY, P.armF[0], P.armF[1], 4.8, limb[0]);
  const wx = 2.5 + (P.armF[0] - 2.5) * 0.72, wy = shY + (P.armF[1] - shY) * 0.72;
  vLimb(g, wx, wy, P.armF[0] - (P.armF[0] - wx) * 0.3, P.armF[1] - (P.armF[1] - wy) * 0.3, 5.2, pal.wrist);
  g.fillStyle = pal.skin[0];
  g.beginPath(); g.arc(P.armF[0], P.armF[1], 2.9, 0, 7); g.fill();
  g.strokeStyle = V_OUT; g.lineWidth = 1;
  g.beginPath(); g.arc(P.armF[0], P.armF[1], 2.9, 0, 7); g.stroke();

  // head
  const hx = 1.5, hy = -32;
  const headG = g.createRadialGradient(hx - 2.5, hy - 3, 2, hx, hy, 9.5);
  headG.addColorStop(0, pal.skin[0]); headG.addColorStop(1, pal.skin[1]);
  g.fillStyle = headG;
  g.strokeStyle = V_OUT; g.lineWidth = 1.3;
  g.beginPath(); g.arc(hx, hy, 8.4, 0, 7); g.fill(); g.stroke();
  // ear
  g.fillStyle = pal.skin[1];
  g.beginPath(); g.arc(hx - 6.4, hy + 0.8, 2, 0, 7); g.fill();

  // hair / head decoration
  const hairPts = o.ss ? V_HAIR.gokuSS : V_HAIR[o.style];
  if (pal.hair && hairPts) {
    const hg = vGrad(g, hx - 10, hy - 18, hx + 8, hy - 2, pal.hair[0], pal.hair[1]);
    g.fillStyle = hg;
    g.strokeStyle = V_OUT; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(hx - 8.2, hy + 1);
    for (let i = 0; i < hairPts.length; i++) {
      const [tx, ty] = hairPts[i];
      const a = Math.atan2(ty, tx) + 0.45;
      g.lineTo(hx + tx, hy + ty);
      g.lineTo(hx + Math.cos(a) * 7.6, hy + Math.sin(a) * 7.6);
    }
    g.lineTo(hx + 8.4, hy - 0.5);
    g.quadraticCurveTo(hx + 2, hy - 7.5, hx - 8.2, hy + 1);
    g.closePath();
    g.fill(); g.stroke();
    // hair sheen strokes
    g.strokeStyle = pal.hairLine;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(hx - 4, hy - 8); g.lineTo(hx + hairPts[2][0] * 0.55, hy + hairPts[2][1] * 0.55); g.stroke();
  } else if (o.style === 'bulma') {
    const hg = vGrad(g, hx - 9, hy - 10, hx + 8, hy + 2, VPAL.bulma.hair[0], VPAL.bulma.hair[1]);
    g.fillStyle = hg; g.strokeStyle = V_OUT; g.lineWidth = 1.2;
    // crown
    g.beginPath();
    g.ellipse(hx - 0.5, hy - 4.2, 9.2, 6, 0, Math.PI * 0.97, Math.PI * 2.06);
    g.quadraticCurveTo(hx + 5, hy - 1, hx + 2, hy - 2.5);
    g.quadraticCurveTo(hx - 3, hy - 4, hx - 9.6, hy - 2);
    g.closePath(); g.fill(); g.stroke();
    // back curtain
    g.beginPath();
    g.moveTo(hx - 9.4, hy - 3);
    g.quadraticCurveTo(hx - 11, hy + 6, hx - 7.5, hy + 8);
    g.quadraticCurveTo(hx - 6, hy + 3, hx - 7, hy - 2);
    g.closePath(); g.fill(); g.stroke();
  } else if (o.style === 'ginyu') {
    // horns
    g.fillStyle = '#22222e';
    g.beginPath(); g.moveTo(hx - 7, hy - 4); g.lineTo(hx - 13, hy - 9); g.lineTo(hx - 6, hy - 7); g.fill();
    g.beginPath(); g.moveTo(hx + 6, hy - 5); g.lineTo(hx + 12, hy - 10); g.lineTo(hx + 5, hy - 8); g.fill();
  } else if (o.style === 'frieza') {
    // purple cranial dome
    g.fillStyle = vGrad(g, hx - 6, hy - 8, hx + 6, hy, '#b06ae0', '#6a2a9a');
    g.beginPath(); g.ellipse(hx, hy - 4.5, 6.2, 4.6, 0, Math.PI, 0); g.fill();
    g.strokeStyle = V_OUT; g.lineWidth = 1;
    g.beginPath(); g.ellipse(hx, hy - 4.5, 6.2, 4.6, 0, Math.PI, 0); g.stroke();
  }

  // face (anime eyes facing forward)
  const ex = hx + 3.2, ey = hy - 0.5;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(ex, ey, 2.4, 2.9, -0.12, 0, 7); g.fill();
  g.beginPath(); g.ellipse(ex + 5.2, ey + 0.1, 1.7, 2.5, 0.1, 0, 7); g.fill();
  const pupil = o.ss ? '#0a8a6a' : '#1a1a2a';
  g.fillStyle = pupil;
  g.beginPath(); g.ellipse(ex + 0.7, ey + 0.3, 1.15, 1.7, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(ex + 5.6, ey + 0.4, 0.95, 1.5, 0, 0, 7); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(ex + 1.1, ey - 0.4, 0.5, 0, 7); g.fill();
  // brows
  g.strokeStyle = o.ss ? '#c89a00' : '#22222e';
  g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(ex - 2.2, ey - 3.4); g.lineTo(ex + 1.8, ey - 3.8); g.stroke();
  g.beginPath(); g.moveTo(ex + 4, ey - 3.7); g.lineTo(ex + 6.8, ey - 3.4); g.stroke();
  // mouth
  g.strokeStyle = '#7a4a3a';
  g.lineWidth = 1.1;
  g.beginPath();
  if (o.pose === 'hurt') { g.arc(ex + 2.6, ey + 4.6, 1.5, 0, Math.PI * 2); }
  else if (o.pose === 'kame' || o.pose === 'charge') { g.arc(ex + 2.6, ey + 4.2, 2, 0.15, Math.PI - 0.15); }
  else { g.moveTo(ex + 1, ey + 4.4); g.quadraticCurveTo(ex + 3, ey + 5.6, ex + 5, ey + 4.2); }
  g.stroke();
  g.lineWidth = 1;

  // frieza tail
  if (o.style === 'frieza') {
    g.strokeStyle = '#c8cde0';
    g.lineWidth = 2.8; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-4, -13);
    g.quadraticCurveTo(-12, -9 + Math.sin((o.anim || 0) * 3) * 2, -15, -1.5);
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
