'use strict';
/* =====================================================================
   Audio procédural (Web Audio). Aucun fichier son.
   Spatialisation "écran partagé" : J1 entend à gauche, J2 à droite.
   ===================================================================== */
const AUDIO = (() => {
  let ctx = null, master = null, noiseBuf = null, ambGain = null, musicGain = null;
  let volume = 0.8;
  let hum = null, heart = { t: 0 }, chase = null;
  let ready = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    startAmbience();
    startChaseMusic();
    ready = true;
  }
  function setVolume(v) { volume = v; if (master) master.gain.value = v; }

  function out(gain, pan) {
    const g = ctx.createGain(); g.gain.value = gain;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(master); }
    else g.connect(master);
    return g;
  }
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); return s; }
  function env(g, t, a, peak, dcy) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  /* ---------- Ambiance ---------- */
  function startAmbience() {
    // vent
    const n = noiseSrc();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.12;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 250;
    lfo.connect(lg); lg.connect(f.frequency);
    n.connect(f); f.connect(g); g.connect(ambGain);
    n.start(); lfo.start();
    // drone grave
    [43.6, 44.1, 65.4].forEach((fr, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = fr;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
      const og = ctx.createGain(); og.gain.value = i === 2 ? 0.02 : 0.035;
      o.connect(lp); lp.connect(og); og.connect(ambGain); o.start();
    });
  }
  function setAmbience(v) { if (!ctx) return; ambGain.gain.setTargetAtTime(v, ctx.currentTime, 1.5); }

  function startChaseMusic() {
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 58.3;
    const o3 = ctx.createOscillator(); o3.type = 'square'; o3.frequency.value = 233;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 2.2; const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(trem.gain);
    const g3 = ctx.createGain(); g3.gain.value = 0.04;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(trem); trem.connect(musicGain);
    [o1, o2, o3, lfo].forEach(o => o.start());
    chase = { lp };
  }
  function setChase(v) { if (!ctx) return; musicGain.gain.setTargetAtTime(v * 0.22, ctx.currentTime, v > 0 ? 0.3 : 2.5); }

  /* ---------- Sons ponctuels ---------- */
  function play(name, gain = 1, pan = 0) {
    if (!ready || gain < 0.01) return;
    const t = ctx.currentTime;
    const o = out(gain, pan);
    switch (name) {
      case 'step': case 'stepHeavy': case 'stepSoft': {
        const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.value = name === 'stepHeavy' ? 180 : 420 + Math.random() * 200; f.Q.value = 1.2;
        const g = ctx.createGain(); env(g, t, 0.005, name === 'stepHeavy' ? 0.9 : name === 'stepSoft' ? 0.15 : 0.35, 0.12);
        n.connect(f); f.connect(g); g.connect(o); n.start(t); n.stop(t + 0.25);
        if (name === 'stepHeavy') { const s = ctx.createOscillator(); s.frequency.setValueAtTime(70, t); s.frequency.exponentialRampToValueAtTime(35, t + 0.15); const sg = ctx.createGain(); env(sg, t, 0.005, 0.6, 0.2); s.connect(sg); sg.connect(o); s.start(t); s.stop(t + 0.3); }
        // craquement aléatoire de plancher
        if (Math.random() < 0.08) creak(o, t + 0.05, 0.3);
        break;
      }
      case 'door': creak(o, t, 1.0); break;
      case 'doorClose': { creak(o, t, 0.5); thump(o, t + 0.45, 0.5); break; }
      case 'locked': for (let i = 0; i < 3; i++) click(o, t + i * 0.09, 0.5); break;
      case 'unlock': click(o, t, 0.7); click(o, t + 0.15, 0.9); thump(o, t + 0.25, 0.2); break;
      case 'pickup': click(o, t, 0.4); { const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = 1200; const g = ctx.createGain(); env(g, t, 0.005, 0.05, 0.3); s.connect(g); g.connect(o); s.start(t); s.stop(t + 0.4); } break;
      case 'paper': { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000; const g = ctx.createGain(); env(g, t, 0.02, 0.2, 0.35); n.connect(f); f.connect(g); g.connect(o); n.start(t); n.stop(t + 0.5); break; }
      case 'lamp': click(o, t, 0.35); break;
      case 'chime': for (let i = 0; i < 4; i++) bell(o, t + i * 0.9, [392, 330, 349, 262][i], 0.4); break;
      case 'musicbox': lullaby(o, t, 'box'); break;
      case 'secret': thump(o, t, 0.8); creak(o, t + 0.2, 1.4); thump(o, t + 1.5, 0.6); break;
      case 'power': { thump(o, t, 1); const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 50; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 3); s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + 3.1); break; }
      case 'spark': for (let i = 0; i < 6; i++) { const n = noiseSrc(); const g = ctx.createGain(); env(g, t + i * 0.05, 0.002, 0.4, 0.04); n.connect(g); g.connect(o); n.start(t + i * 0.05); n.stop(t + i * 0.05 + 0.08); } break;
      case 'drain': { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 4; const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 150; lfo.connect(lg); lg.connect(f.frequency); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 4); n.connect(f); f.connect(g); g.connect(o); n.start(t); lfo.start(t); n.stop(t + 4.2); lfo.stop(t + 4.2); break; }
      case 'sting': { // apparition
        [110, 116.5, 155.6, 233].forEach((fr, i) => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = fr; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(200, t + 2); const g = ctx.createGain(); env(g, t, 0.01, 0.12, 2.2); s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + 2.5); });
        const n = noiseSrc(); const g = ctx.createGain(); env(g, t, 0.005, 0.6, 0.6); n.connect(g); g.connect(o); n.start(t); n.stop(t + 0.8);
        break;
      }
      case 'caught': {
        const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(150, t + 1.5); f.Q.value = 2;
        const g = ctx.createGain(); env(g, t, 0.01, 1, 1.6); n.connect(f); f.connect(g); g.connect(o); n.start(t); n.stop(t + 2);
        [65, 69, 98].forEach(fr => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = fr; const sg = ctx.createGain(); env(sg, t, 0.02, 0.25, 2.5); s.connect(sg); sg.connect(o); s.start(t); s.stop(t + 3); });
        thump(o, t + 0.1, 1);
        break;
      }
      case 'stairs': for (let i = 0; i < 5; i++) { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; const g = ctx.createGain(); env(g, t + i * 0.18, 0.005, 0.3, 0.1); n.connect(f); f.connect(g); g.connect(o); n.start(t + i * 0.18); n.stop(t + i * 0.18 + 0.2); } break;
      case 'creak': creak(o, t, 0.6 + Math.random()); break;
      case 'knock': thump(o, t, 0.7); thump(o, t + 0.35, 0.6); thump(o, t + 0.7, 0.8); break;
      case 'push': { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 250; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.8, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); n.connect(f); f.connect(g); g.connect(o); n.start(t); n.stop(t + 2); creak(o, t + 0.3, 1.2); break; }
      case 'force': { click(o, t, 0.6); thump(o, t + 0.05, 0.4); break; }
      case 'whisper': { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 3; const lfo = ctx.createOscillator(); lfo.frequency.value = 5; const lg = ctx.createGain(); lg.gain.value = 1200; lfo.connect(lg); lg.connect(f.frequency); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5); n.connect(f); f.connect(g); g.connect(o); n.start(t); lfo.start(t); n.stop(t + 2.6); lfo.stop(t + 2.6); break; }
    }
  }
  function creak(o, t, dur) {
    const s = ctx.createOscillator(); s.type = 'sawtooth';
    const f0 = 90 + Math.random() * 120;
    s.frequency.setValueAtTime(f0, t);
    s.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.9), t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 600; f.Q.value = 6;
    const am = ctx.createOscillator(); am.frequency.value = 25 + Math.random() * 30; const ag = ctx.createGain(); ag.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.08); g.gain.setValueAtTime(0.25, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    am.connect(ag); ag.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(o); s.start(t); am.start(t); s.stop(t + dur + 0.05); am.stop(t + dur + 0.05);
  }
  function thump(o, t, v) {
    const s = ctx.createOscillator(); s.frequency.setValueAtTime(90, t); s.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    const g = ctx.createGain(); env(g, t, 0.004, v, 0.25); s.connect(g); g.connect(o); s.start(t); s.stop(t + 0.35);
    const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const ng = ctx.createGain(); env(ng, t, 0.003, v * 0.5, 0.1); n.connect(f); f.connect(ng); ng.connect(o); n.start(t); n.stop(t + 0.2);
  }
  function click(o, t, v) {
    const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = ctx.createGain(); env(g, t, 0.001, v, 0.03); n.connect(f); f.connect(g); g.connect(o); n.start(t); n.stop(t + 0.06);
  }
  function bell(o, t, fr, v) {
    [1, 2.76, 5.4].forEach((m, i) => { const s = ctx.createOscillator(); s.frequency.value = fr * m; const g = ctx.createGain(); env(g, t, 0.003, v / (i + 1), 2.5 / (i + 1)); s.connect(g); g.connect(o); s.start(t); s.stop(t + 3); });
  }
  // berceuse originale (mineur)
  const MELODY = [[67, 1], [70, 1], [69, 2], [67, 1], [65, 1], [63, 2], [62, 1], [63, 1], [65, 1], [67, 1], [62, 3], [0, 1],
    [67, 1], [70, 1], [72, 2], [70, 1], [69, 1], [67, 2], [65, 1], [63, 1], [62, 1], [60, 1], [62, 3], [0, 2]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function lullaby(o, t0, kind) {
    let t = t0; const beat = kind === 'box' ? 0.32 : 0.55;
    for (const [m, d] of MELODY) {
      if (m) {
        if (kind === 'box') bell(o, t, mtof(m + 12), 0.12);
        else humNote(o, t, mtof(m - 12), d * beat);
      }
      t += d * beat;
    }
    return t - t0;
  }
  function humNote(o, t, fr, dur) {
    const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = fr;
    const vib = ctx.createOscillator(); vib.frequency.value = 5; const vg = ctx.createGain(); vg.gain.value = 2; vib.connect(vg); vg.connect(s.frequency);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 300; f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 900;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.setValueAtTime(0.5, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(o); s.start(t); vib.start(t); s.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }

  /* ---------- Fredonnement du Gardien (continu, spatialisé) ---------- */
  function updateHum(dt, active, gain, pan) {
    if (!ready) return;
    if (!hum) {
      hum = { g: ctx.createGain(), p: ctx.createStereoPanner ? ctx.createStereoPanner() : null, next: 0 };
      hum.g.gain.value = 0;
      if (hum.p) { hum.g.connect(hum.p); hum.p.connect(master); } else hum.g.connect(master);
    }
    hum.g.gain.setTargetAtTime(active ? gain : 0, ctx.currentTime, 0.3);
    if (hum.p) hum.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.2);
    if (active && ctx.currentTime > hum.next) {
      const len = lullaby(hum.g, ctx.currentTime + 0.1, 'hum');
      hum.next = ctx.currentTime + len + 3 + Math.random() * 6;
    }
  }

  /* ---------- Cœur ---------- */
  function updateHeart(dt, intensity, pan) {
    if (!ready || intensity <= 0.02) return;
    heart.t -= dt;
    if (heart.t <= 0) {
      const bpm = 60 + intensity * 90;
      heart.t = 60 / bpm;
      const t = ctx.currentTime;
      const o = out(0.25 + intensity * 0.6, pan);
      [0, 0.16].forEach((d, i) => { const s = ctx.createOscillator(); s.frequency.setValueAtTime(60, t + d); s.frequency.exponentialRampToValueAtTime(35, t + d + 0.12); const g = ctx.createGain(); env(g, t + d, 0.01, i ? 0.6 : 1, 0.15); s.connect(g); g.connect(o); s.start(t + d); s.stop(t + d + 0.25); });
    }
  }

  // ambiance aléatoire (craquements lointains, coups)
  let ambT = 8;
  function updateRandom(dt) {
    if (!ready) return;
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 12 + Math.random() * 25;
      const r = Math.random(); const pan = Math.random() * 2 - 1;
      if (r < 0.5) play('creak', 0.15 + Math.random() * 0.2, pan);
      else if (r < 0.75) play('knock', 0.1 + Math.random() * 0.15, pan);
      else if (r < 0.9) play('whisper', 0.12, pan);
      else play('stepHeavy', 0.08, pan);
    }
  }

  return { init, play, setVolume, setAmbience, setChase, updateHum, updateHeart, updateRandom, get ready() { return ready; }, get volume() { return volume; } };
})();
