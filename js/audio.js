// ============================================================
// Dragon Dash — chiptune audio engine (WebAudio, no assets)
// ============================================================
const AudioSys = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let muted = false;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.42;
      musicGain.connect(masterGain);
    } catch (e) { ctx = null; }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // --- one-shot tone helper ---
  function tone(type, freq, dur, vol, when = 0, slide = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, when = 0, freq = 1000) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(t);
  }

  // --- sound effects ---
  const SFX = {
    jump()      { tone('square', 240, 0.18, 0.18, 0, 320); },
    spring()    { tone('square', 200, 0.25, 0.2, 0, 700); },
    coin()      { tone('square', 988, 0.06, 0.16); tone('square', 1319, 0.18, 0.16, 0.06); },
    hurt()      { tone('sawtooth', 300, 0.25, 0.22, 0, -200); noise(0.15, 0.12, 0, 600); },
    scatter()   { tone('square', 700, 0.3, 0.14, 0, -400); },
    blast()     { tone('square', 880, 0.12, 0.14, 0, -500); noise(0.08, 0.08, 0, 2400); },
    hit()       { noise(0.1, 0.18, 0, 900); tone('square', 160, 0.1, 0.14); },
    explode()   { noise(0.5, 0.3, 0, 350); tone('sawtooth', 120, 0.4, 0.2, 0, -80); },
    charge()    { tone('sawtooth', 80, 0.5, 0.1, 0, 240); },
    kame()      { noise(1.2, 0.3, 0, 700); tone('sawtooth', 100, 1.1, 0.25, 0, 500); tone('square', 200, 1.0, 0.12, 0, 800); },
    transform() {
      for (let i = 0; i < 8; i++) tone('square', 300 + i * 120, 0.3, 0.12, i * 0.07);
      noise(0.9, 0.2, 0, 1800);
    },
    dragonball(){
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone('square', midi(n), 0.22, 0.15, i * 0.09));
    },
    radar()     { tone('sine', 1200, 0.08, 0.15); tone('sine', 1200, 0.08, 0.12, 0.18); },
    select()    { tone('square', 660, 0.08, 0.15); tone('square', 880, 0.1, 0.15, 0.07); },
    text()      { tone('square', 520, 0.03, 0.06); },
    land()      { noise(0.06, 0.08, 0, 400); },
    stomp()     { tone('square', 500, 0.1, 0.16, 0, 300); },
    bossHit()   { noise(0.15, 0.22, 0, 700); tone('sawtooth', 220, 0.18, 0.2, 0, -120); },
    powerup()   { [67, 71, 74, 79].forEach((n, i) => tone('square', midi(n), 0.12, 0.15, i * 0.06)); },
    checkpoint(){ tone('square', 784, 0.1, 0.14); tone('square', 1047, 0.2, 0.14, 0.1); },
    death()     { [400, 350, 300, 250, 180, 120].forEach((f, i) => tone('square', f, 0.12, 0.16, i * 0.09)); },
  };

  // --- music sequencer ---
  // songs: lead/bass arrays of midi numbers (0 = rest), 8 steps per bar
  const SONGS = {
    title: {
      bpm: 112, // heroic
      lead: [64,0,67,69, 71,0,69,67, 64,0,60,0, 62,64,62,0,
             64,0,67,69, 71,0,74,71, 76,0,74,71, 69,0,67,0],
      bass: [40,0,40,0, 45,0,45,0, 36,0,36,0, 43,0,43,0,
             40,0,40,0, 45,0,45,0, 47,0,47,0, 43,0,43,0],
      hat: 2,
    },
    city: {
      bpm: 132, // upbeat funky
      lead: [69,0,69,71, 72,0,71,69, 67,0,64,67, 69,0,0,0,
             69,0,69,71, 72,0,74,72, 71,0,67,71, 69,0,0,0,
             76,0,74,72, 71,0,72,71, 69,0,67,64, 67,0,69,0,
             64,67,69,72, 71,0,67,0, 69,0,0,0, 0,0,0,0],
      bass: [45,0,45,45, 0,45,0,43, 41,0,41,41, 0,41,0,43,
             45,0,45,45, 0,45,0,43, 47,0,47,47, 0,47,0,45,
             45,0,45,45, 0,45,0,43, 41,0,41,41, 0,41,0,43,
             40,0,40,40, 43,0,43,0, 45,0,45,0, 45,0,47,48],
      hat: 1,
    },
    wasteland: {
      bpm: 124, // tense adventurous
      lead: [62,0,0,65, 67,0,65,62, 60,0,62,65, 62,0,0,0,
             62,0,0,65, 67,0,69,70, 69,0,67,65, 67,0,0,0,
             70,0,69,67, 65,0,67,65, 62,0,60,58, 60,0,62,0,
             58,60,62,65, 67,0,65,0, 62,0,0,0, 0,0,0,0],
      bass: [38,0,38,0, 38,0,36,0, 36,0,36,0, 36,0,38,0,
             38,0,38,0, 38,0,36,0, 41,0,41,0, 43,0,43,0,
             46,0,46,0, 45,0,45,0, 38,0,38,0, 36,0,36,0,
             34,0,34,0, 36,0,36,0, 38,0,38,0, 38,0,38,0],
      hat: 2,
    },
    space: {
      bpm: 140, // soaring
      lead: [69,0,72,0, 76,0,74,72, 74,0,71,0, 72,0,69,0,
             69,0,72,0, 76,0,79,76, 81,0,79,76, 74,0,72,0,
             71,0,74,0, 77,0,76,74, 76,0,72,0, 69,0,71,72,
             74,0,71,0, 67,0,69,71, 72,0,0,0, 0,0,64,67],
      bass: [33,0,0,33, 0,0,33,0, 38,0,0,38, 0,0,38,0,
             33,0,0,33, 0,0,33,0, 41,0,0,41, 0,0,40,0,
             38,0,0,38, 0,0,38,0, 41,0,0,41, 0,0,41,0,
             43,0,0,43, 0,0,43,0, 45,0,0,45, 0,0,43,40],
      hat: 1,
    },
    namek: {
      bpm: 128, // alien, mysterious but driving
      lead: [63,0,66,68, 70,0,68,66, 63,0,61,63, 66,0,63,0,
             63,0,66,68, 70,0,73,70, 75,0,73,70, 68,0,66,0,
             68,0,70,0, 71,0,70,68, 66,0,68,66, 63,0,61,0,
             61,63,66,68, 70,0,68,66, 63,0,0,0, 0,0,0,0],
      bass: [39,0,39,0, 39,46,0,39, 37,0,37,0, 37,44,0,37,
             39,0,39,0, 39,46,0,39, 42,0,42,0, 44,0,44,0,
             37,0,37,0, 37,0,37,0, 39,0,39,0, 39,0,39,0,
             34,0,34,0, 37,0,37,0, 39,0,39,0, 39,0,42,44],
      hat: 1,
    },
    boss: {
      bpm: 150, // menacing fast
      lead: [57,0,57,60, 57,0,56,57, 0,57,60,57, 63,0,62,60,
             57,0,57,60, 57,0,56,57, 0,64,63,60, 62,0,57,0,
             65,0,63,62, 63,0,62,60, 62,0,60,57, 60,0,56,57,
             0,0,57,60, 63,0,62,63, 69,0,0,0, 68,0,69,0],
      bass: [33,33,0,33, 33,0,32,33, 33,33,0,33, 36,0,35,33,
             33,33,0,33, 33,0,32,33, 38,38,0,38, 36,0,35,33,
             41,41,0,41, 39,39,0,39, 38,38,0,38, 36,36,0,36,
             33,33,0,33, 33,0,32,33, 33,0,33,0, 32,0,33,0],
      hat: 0,
    },
    travel: {
      bpm: 96, // dreamy starfield
      lead: [76,0,0,0, 72,0,0,0, 74,0,0,0, 69,0,0,0,
             71,0,0,0, 74,0,72,0, 69,0,0,0, 0,0,0,0,
             76,0,0,0, 79,0,0,0, 78,0,0,0, 74,0,0,0,
             76,0,74,0, 71,0,72,0, 69,0,0,0, 0,0,0,0],
      bass: [45,0,52,0, 45,0,52,0, 43,0,50,0, 43,0,50,0,
             40,0,47,0, 40,0,47,0, 45,0,52,0, 45,0,52,0,
             45,0,52,0, 45,0,52,0, 43,0,50,0, 43,0,50,0,
             40,0,47,0, 40,0,47,0, 45,0,52,0, 45,0,52,0],
      hat: 3,
    },
    victory: {
      bpm: 120,
      lead: [72,0,72,72, 72,0,69,71, 72,0,71,72, 74,0,0,0,
             76,0,76,76, 76,0,74,76, 79,0,76,74, 72,0,0,0],
      bass: [48,0,48,0, 41,0,41,0, 43,0,43,0, 48,0,48,0,
             48,0,48,0, 41,0,41,0, 43,0,43,0, 48,0,43,36],
      hat: 2,
    },
    ending: {
      bpm: 100,
      lead: [67,0,0,64, 65,0,67,0, 72,0,0,0, 0,0,71,72,
             74,0,0,71, 72,0,74,0, 79,0,0,0, 0,0,0,0,
             76,0,0,72, 74,0,76,0, 77,0,76,74, 72,0,74,0,
             71,0,72,74, 67,0,69,71, 72,0,0,0, 0,0,0,0],
      bass: [36,0,43,0, 48,0,43,0, 41,0,48,0, 53,0,48,0,
             38,0,45,0, 50,0,45,0, 43,0,50,0, 55,0,50,0,
             36,0,43,0, 48,0,43,0, 41,0,48,0, 45,0,41,0,
             43,0,50,0, 43,0,48,0, 36,0,43,0, 48,0,43,0],
      hat: 3,
    },
  };

  let curSong = null;
  let step = 0;
  let nextStepTime = 0;
  let timerId = null;

  function scheduleStep(song, when) {
    const stepDur = 60 / song.bpm / 2; // 8th notes
    const i = step % song.lead.length;
    const lead = song.lead[i];
    const bass = song.bass[i % song.bass.length];
    if (lead && !muted) {
      const t = when - ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = midi(lead);
      g.gain.setValueAtTime(0.085, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 0.95);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + stepDur);
    }
    if (bass && !muted) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = midi(bass);
      g.gain.setValueAtTime(0.22, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 1.7);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + stepDur * 1.8);
    }
    // hi-hat
    if (song.hat !== 3 && !muted && (i % 2 === song.hat % 2 || song.hat === 0)) {
      const len = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.value = i % 4 === 0 ? 0.1 : 0.05;
      src.connect(f); f.connect(g); g.connect(musicGain);
      src.start(when);
    }
    step++;
  }

  function loop() {
    if (!curSong || !ctx) return;
    const song = SONGS[curSong];
    const stepDur = 60 / song.bpm / 2;
    while (nextStepTime < ctx.currentTime + 0.15) {
      scheduleStep(song, nextStepTime);
      nextStepTime += stepDur;
    }
  }

  function playMusic(name) {
    if (curSong === name) return;
    curSong = name;
    step = 0;
    if (!ctx) return;
    nextStepTime = ctx.currentTime + 0.05;
    if (!timerId) timerId = setInterval(loop, 60);
  }

  function stopMusic() {
    curSong = null;
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return {
    init, resume, playMusic, stopMusic, toggleMute,
    get muted() { return muted; },
    get current() { return curSong; },
    sfx(name) { init(); if (SFX[name]) SFX[name](); },
  };
})();
