'use strict';
/* =====================================================================
   VALCOURT — logique du jeu
   ===================================================================== */
const G = (() => {
  const api = {};
  let S = null;                       // état sérialisable
  let scene, renderer, mats, clock;
  const P = [];                       // joueurs
  let M = null;                       // le Gardien
  let running = false, paused = false, ended = false;
  let hemi, lightPool = [];
  const noises = [];
  let objsByFloor = [];
  let layoutMap = null;
  let settings = loadSettings();
  const SAVE_KEY = 'valcourt_save_v1', CP_KEY = 'valcourt_checkpoint_v1';
  const SEP = WORLD.FLOOR_SEP;
  const CACHOT = { f: 0, x0: 1, y0: 1, x1: 5, y1: 4, sx: 2.5, sz: 2.5 };
  const OFFICE = { f: 1, x0: 35, y0: 21, x1: 42, y1: 28 };

  /* ===================== Réglages ===================== */
  function loadSettings() {
    const d = { shadows: true, sens: 1, vol: 0.8, bright: 1, ctrl: ['kbm', 'kb2'], quality: 1 };
    try { return Object.assign(d, JSON.parse(localStorage.getItem('valcourt_settings') || '{}')); } catch (e) { return d; }
  }
  function saveSettings() { try { localStorage.setItem('valcourt_settings', JSON.stringify(settings)); } catch (e) { } }

  /* ===================== API utilisée par data.js ===================== */
  api.flag = n => !!(S && S.flags[n]);
  api.set = (n, v = true) => { S.flags[n] = v; };
  Object.defineProperty(api, 'codes', { get: () => S.codes });
  Object.defineProperty(api, 'state', { get: () => S });
  api.has = (p, id) => p.inv.includes(id);
  api.take = (p, id) => { const i = p.inv.indexOf(id); if (i >= 0) p.inv.splice(i, 1); if (p.sel >= p.inv.length) p.sel = Math.max(0, p.inv.length - 1); };
  api.give = (p, id) => { p.inv.push(id); p.sel = p.inv.length - 1; api.sfx('pickup', p); api.say(p, 'Obtenu : ' + ITEMS[id].name, 3.5); };
  api.say = (p, txt, dur = 4.5) => { if (p === 'both') { P.forEach(q => api.say(q, txt, dur)); return; } p.msg = txt; p.msgT = dur + txt.length * 0.03; };
  api.read = (p, title, text) => { p.ui = { type: 'note', title, text }; api.sfx('paper', p); };
  api.openDial = (p, cfg) => {
    if (cfg.before && !cfg.before(p)) return;
    const vals = cfg.initial ? cfg.initial.slice() : cfg.dials.map(() => 0);
    p.ui = { type: 'dial', cfg, vals, col: 0 };
  };
  api.sfx = (name, p, gain = 1) => {
    if (p && p.idx !== undefined) sfxAt(name, p.floor, p.x, p.z, gain);
    else if (p && p.floor !== undefined) sfxAt(name, p.floor, p.x, p.z, gain);
    else AUDIO.play(name, gain, 0);
  };
  api.refreshAll = () => {
    WORLD.objects.forEach(o => { if (['custom', 'stairs', 'secret'].includes(o.type) || o.spec.model === 'bookslot') WORLD.refresh(o); });
  };
  api.obj = (who, txt) => {
    const list = who === 'both' ? [0, 1] : [who.idx !== undefined ? who.idx : who];
    list.forEach(i => { if (S.obj[i] !== txt) { S.obj[i] = txt; P[i].objFlash = 6; } });
  };

  /* ===================== Sons spatialisés ===================== */
  function earGain(p, f, x, z, range) {
    if (p.floor === f) {
      const d = Math.hypot(p.x - x, p.z - z);
      const occl = WORLD.los(f, p.x, p.z, x, z) ? 1 : 0.45;
      return Math.max(0, 1 - d / range) ** 1.6 * occl;
    }
    if (Math.abs(p.floor - f) === 1) {
      const d = Math.hypot(p.x - x, p.z - z);
      return Math.max(0, 1 - d / (range * 0.6)) * 0.18;
    }
    return 0;
  }
  function sfxAt(name, f, x, z, gain = 1, range = 18) {
    if (!P.length) { AUDIO.play(name, gain); return; }
    const g1 = earGain(P[0], f, x, z, range), g2 = earGain(P[1], f, x, z, range);
    const tot = g1 + g2;
    if (tot < 0.005) return;
    const pan = (g2 - g1) / tot * 0.85;
    AUDIO.play(name, Math.max(g1, g2) * gain, pan);
  }
  function addNoise(f, x, z, r, src) { noises.push({ f, x, z, r, src, t: 0 }); }

  /* ===================== Démarrage ===================== */
  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * settings.quality);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = settings.bright;
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    document.getElementById('game').appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.085);
    mats = TEX.build();
    MODELS.init(mats);
    hemi = new THREE.HemisphereLight(0x5a6a8a, 0x100c08, 0.22);
    scene.add(hemi);
    for (let i = 0; i < 7; i++) { const l = new THREE.PointLight(0xffd8a0, 0, 9, 2); scene.add(l); lightPool.push(l); }
    clock = new THREE.Clock();
    window.addEventListener('resize', onResize);
    setupInput();
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { layoutMap = m; UI.refreshControls(); }).catch(() => { });
    requestAnimationFrame(frame);
  }
  function onResize() { renderer.setSize(window.innerWidth, window.innerHeight); }

  /* ===================== Nouvelle partie / chargement ===================== */
  function newState() {
    return {
      v: 1, codes: makeCodes(), flags: {}, chapter: 1, doors: {}, taken: {}, pushed: {},
      inv: [[], []], dumb: [[], []], leverPos: [0, 0, 0, 0], time: 0, catches: 0,
      obj: ['Sortir de cette cellule.', 'Trouver une source de lumière.'],
      players: null, monster: null, twin: {},
    };
  }
  function startGame(state) {
    S = state;
    WORLD.build(scene, mats);
    // appliquer l'état aux objets
    WORLD.objects.forEach(o => {
      if (o.type === 'door') {
        if (o.spec.twin) o.locked = true;
        const d = S.doors[o.uid]; if (d) { o.open = d.open; o.locked = d.locked; o.swing = d.swing || 1; }
      }
      if (S.taken[o.uid]) o.taken = true;
      if (o.type === 'pushable' && S.pushed[o.uid]) { o.pushed = true; const c = WORLD.cell(WORLD.floors[o.floor], o.x + o.spec.to[0], o.y + o.spec.to[1]); c.pushTarget = true; }
    });
    WORLD.placeAll();
    WORLD.refreshLampMeshes(api.flag('power'));
    objsByFloor = WORLD.floors.map(() => []);
    WORLD.objects.forEach(o => objsByFloor[o.floor].push(o));
    // joueurs
    P.length = 0;
    for (let i = 0; i < 2; i++) P.push(makePlayer(i));
    if (S.players) S.players.forEach((sp, i) => Object.assign(P[i], sp));
    else {
      WORLD.objects.filter(o => o.type === 'spawn').forEach(o => { const p = P[o.spec.player]; p.floor = o.floor; p.x = o.x + 0.5; p.z = o.y + 0.5; });
      P[0].yaw = Math.PI; P[1].yaw = -Math.PI / 2;
      P[0].hasLamp = true; P[0].lamp = true; P[0].battery = 80; P[0].inCachot = true;
      P[1].hasLamp = false; P[1].battery = 100;
    }
    P.forEach(p => { p.inv = S.inv[p.idx]; });
    // gardien
    if (M) scene.remove(M.mesh);
    M = makeMonster();
    if (S.monster) Object.assign(M, S.monster);
    M.path = []; M.wait = 1; M.grace = 8;
    if (S.chapter >= 2 && M.state === 'off') M.state = 'patrol';
    running = true; paused = false; ended = false;
    UI.showGame();
    AUDIO.setAmbience(1);
  }
  function snapshot() {
    WORLD.objects.forEach(o => { if (o.type === 'door') S.doors[o.uid] = { open: o.open, locked: o.locked, swing: o.swing }; });
    S.players = P.map(p => ({ floor: p.floor, x: p.x, z: p.z, yaw: p.yaw, hasLamp: p.hasLamp, battery: p.battery, spare: p.spare, inCachot: p.inCachot, sel: p.sel }));
    S.monster = { floor: M.floor, x: M.x, z: M.z, state: M.state === 'off' || M.state === 'script' ? 'off' : 'patrol', yaw: M.yaw };
    S.inv = P.map(p => p.inv);
    return JSON.parse(JSON.stringify(S));
  }
  function save(key = SAVE_KEY) { try { localStorage.setItem(key, JSON.stringify(snapshot())); return true; } catch (e) { return false; } }
  function loadKey(key) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  api.hasSave = () => !!loadKey(SAVE_KEY);
  api.newGame = () => startGame(newState());
  api.continueGame = () => { const s = loadKey(SAVE_KEY); if (s) startGame(s); };
  api.loadCheckpoint = () => { const s = loadKey(CP_KEY) || loadKey(SAVE_KEY); if (s) startGame(s); };
  api.save = () => save(SAVE_KEY);
  api.settings = settings;
  api.applySettings = () => {
    renderer.toneMappingExposure = settings.bright;
    renderer.shadowMap.enabled = settings.shadows;
    P.forEach(p => { p.spot.castShadow = settings.shadows; });
    scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
    AUDIO.setVolume(settings.vol);
    saveSettings();
  };

  /* ===================== Joueurs ===================== */
  function makePlayer(i) {
    const cam = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
    cam.rotation.order = 'YXZ';
    const spot = new THREE.SpotLight(0xfff0d8, 0, 24, 0.46, 0.75, 1.5);
    spot.castShadow = settings.shadows;
    spot.shadow.mapSize.set(512, 512);
    spot.shadow.camera.near = 0.2; spot.shadow.camera.far = 24;
    spot.shadow.bias = -0.0015;
    scene.add(spot); scene.add(spot.target);
    return {
      idx: i, name: PLAYER_NAMES[i], floor: 0, x: 2.5, z: 2.5, yaw: 0, pitch: 0, cam, spot,
      crouch: false, stamina: 1, hasLamp: false, lamp: false, battery: 100, spare: 0,
      inv: [], sel: 0, hidden: null, ui: null, msg: '', msgT: 0, objFlash: 4,
      tele: null, down: null, hold: null, inCachot: false, bobT: 0, stepT: 0,
      target: null, speed: 0, fear: 0, hideSeen: false, lastStairs: -9, wasIn: {},
    };
  }

  /* ===================== Entrées ===================== */
  const keys = {}, pressed = {};
  let mouseDX = 0, mouseDY = 0;
  const padPrev = [{}, {}];
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Enter'].includes(e.code) && running) e.preventDefault();
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      if (e.code === 'Escape' && running && !ended) togglePause();
      if (e.code === 'KeyP' && running && !ended && settings.ctrl[0] !== 'kbm') togglePause();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement === renderer.domElement) { mouseDX += e.movementX; mouseDY += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && running && !paused && !ended && usesMouse()) togglePause(true);
    });
    document.getElementById('game').addEventListener('click', () => {
      AUDIO.init();
      if (running && !paused && usesMouse() && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
    });
  }
  function usesMouse() { return settings.ctrl.includes('kbm'); }
  api.lockPointer = () => { if (usesMouse()) try { renderer.domElement.requestPointerLock(); } catch (e) { } };

  const SCHEMES = {
    kbm: { fwd: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'], run: ['ShiftLeft'], crouch: ['KeyC'], use: ['KeyE', 'Space'], lamp: ['KeyF'], next: ['KeyR', 'Tab'], give: ['KeyG'], cancel: ['KeyC', 'Backspace'] },
    kb2: { fwd: ['ArrowUp'], back: ['ArrowDown'], tl: ['ArrowLeft'], tr: ['ArrowRight'], run: ['ShiftRight', 'KeyU'], crouch: ['ControlRight', 'KeyN'], use: ['KeyK', 'Enter', 'NumpadEnter', 'Numpad0'], lamp: ['KeyJ'], next: ['KeyL'], give: ['KeyO'], cancel: ['KeyN', 'ControlRight'], left: ['KeyH'], right: ['Semicolon', 'KeyM'] },
  };
  function kd(list) { return list && list.some(k => keys[k]); }
  function kp(list) { return list && list.some(k => pressed[k]); }
  function readInput(p) {
    const sch = settings.ctrl[p.idx];
    const I = { mx: 0, my: 0, lookX: 0, lookY: 0, run: false, crouchP: false, useP: false, useH: false, lampP: false, nextP: false, giveP: false, cancelP: false, nav: { u: 0, d: 0, l: 0, r: 0 } };
    if (sch === 'kbm' || sch === 'kb2') {
      const K = SCHEMES[sch];
      I.my = (kd(K.fwd) ? 1 : 0) - (kd(K.back) ? 1 : 0);
      I.mx = (kd(K.right) ? 1 : 0) - (kd(K.left) ? 1 : 0);
      I.run = kd(K.run); I.crouchP = kp(K.crouch); I.useP = kp(K.use); I.useH = kd(K.use);
      I.lampP = kp(K.lamp); I.nextP = kp(K.next); I.giveP = kp(K.give); I.cancelP = kp(K.cancel);
      if (sch === 'kbm') {
        I.lookX = mouseDX * 0.0022 * settings.sens; I.lookY = mouseDY * 0.0022 * settings.sens;
        I.nav = { u: kp(K.fwd), d: kp(K.back), l: kp(K.left), r: kp(K.right) };
      } else {
        I.turn = (kd(K.tr) ? 1 : 0) - (kd(K.tl) ? 1 : 0);
        I.nav = { u: kp(K.fwd), d: kp(K.back), l: kp(K.tl), r: kp(K.tr) };
      }
    } else {
      const gi = sch === 'pad1' ? 1 : 0;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const list = Array.from(pads).filter(Boolean);
      const gp = list[gi];
      if (gp) {
        const dz = v => Math.abs(v) < 0.18 ? 0 : v;
        const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
        const prev = padPrev[gi];
        const bp = i => b(i) && !prev[i];
        I.mx = dz(gp.axes[0]); I.my = -dz(gp.axes[1]);
        I.lookX = dz(gp.axes[2] || 0) * 0.045 * settings.sens; I.lookY = dz(gp.axes[3] || 0) * 0.035 * settings.sens;
        I.run = b(5) || b(10) || b(7); I.crouchP = bp(1); I.cancelP = bp(1); I.useP = bp(0); I.useH = b(0);
        I.lampP = bp(2); I.nextP = bp(3); I.giveP = bp(4);
        const ax = gp.axes[0], ay = gp.axes[1];
        const st = padPrev[gi].stick || { x: 0, y: 0 };
        I.nav = { u: bp(12) || (ay < -0.6 && st.y >= -0.6), d: bp(13) || (ay > 0.6 && st.y <= 0.6), l: bp(14) || (ax < -0.6 && st.x >= -0.6), r: bp(15) || (ax > 0.6 && st.x <= 0.6) };
        if (bp(9)) togglePause();
        const np = {}; gp.buttons.forEach((bb, k) => np[k] = bb.pressed); np.stick = { x: ax, y: ay }; padPrev[gi] = np;
      }
    }
    return I;
  }
  function keyLabel(code) {
    if (code.startsWith('Arrow')) return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code];
    const special = { Space: 'Espace', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', ControlRight: 'Ctrl droit', Enter: 'Entrée', Tab: 'Tab', Backspace: 'Retour', NumpadEnter: 'Entrée', Numpad0: '0 pavé', Escape: 'Échap' };
    if (special[code]) return special[code];
    if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
    const azerty = { KeyW: 'Z', KeyA: 'Q', KeyQ: 'A', KeyZ: 'W', KeyM: ',', Semicolon: 'M' };
    if (azerty[code]) return azerty[code];
    return code.replace('Key', '').replace('Digit', '');
  }
  function btnLabel(p, action) {
    const sch = settings.ctrl[p.idx];
    if (sch === 'kbm' || sch === 'kb2') return keyLabel(SCHEMES[sch][action][0]);
    return { use: 'A', lamp: 'X', next: 'Y', give: 'LB', crouch: 'B', cancel: 'B', run: 'RB' }[action] || '?';
  }
  api.keyLabel = keyLabel; api.btnLabel = btnLabel; api.SCHEMES = SCHEMES;

  /* ===================== Pause ===================== */
  function togglePause(force) {
    if (!running || ended) return;
    paused = force === true ? true : !paused;
    if (paused) { if (document.pointerLockElement) document.exitPointerLock(); UI.showPause(); }
    else { UI.hidePause(); api.lockPointer(); }
  }
  api.resume = () => { if (paused) togglePause(); };
  api.quitToMenu = () => { running = false; paused = false; AUDIO.setAmbience(0); AUDIO.setChase(0); if (document.pointerLockElement) document.exitPointerLock(); UI.showMenu(); };

  /* ===================== Collisions & déplacement ===================== */
  const RAD = 0.24;
  function freeAt(f, x, z, r = RAD) {
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      if (WORLD.isBlocked(f, Math.floor(x + ox), Math.floor(z + oz))) return false;
    }
    return true;
  }
  function moveEntity(e, dx, dz) {
    if (dx && freeAt(e.floor, e.x + dx, e.z)) e.x += dx;
    if (dz && freeAt(e.floor, e.x, e.z + dz)) e.z += dz;
  }
  function inRect(p, R) { return p.floor === R.f && p.x >= R.x0 && p.x < R.x1 + 1 && p.z >= R.y0 && p.z < R.y1 + 1; }

  /* ===================== Interaction ===================== */
  function interactPoint(o) {
    if (o.type === 'pushable' && o.pushed) return { x: o.cx + o.spec.to[0], z: o.cz + o.spec.to[1] };
    return { x: o.cx, z: o.cz };
  }
  function labelFor(o, p) {
    const sp = o.spec;
    switch (o.type) {
      case 'door': {
        if (sp.cachot) { if (!o.locked) return o.open ? 'Fermer la porte' : 'Ouvrir la porte'; return inRect(p, CACHOT) ? 'Forcer la porte (maintenir)' : 'Ouvrir la cellule'; }
        if (sp.twin && o.locked) return 'Pousser les lourdes portes (à deux)';
        if (sp.twin) return null;
        if (o.locked) { if (sp.key && api.has(p, sp.key)) return 'Déverrouiller : ' + ITEMS[sp.key].name; if (sp.codeLock) return 'Examiner le cadenas'; return 'Ouvrir (verrouillée)'; }
        return o.open ? 'Fermer la porte' : 'Ouvrir la porte';
      }
      case 'item': return o.taken ? null : 'Prendre : ' + ITEMS[sp.item].name;
      case 'battery': return o.taken ? null : 'Prendre des piles';
      case 'lamp': return o.taken ? null : 'Prendre la lampe torche';
      case 'note': return sp.label || ('Lire : ' + sp.title);
      case 'hide': return p.hidden ? 'Sortir de l\'armoire' : 'Se cacher dans l\'armoire';
      case 'stairs': return sp.label;
      case 'custom': return sp.label(p, o);
      case 'pushable': return o.pushed ? null : 'Pousser l\'armoire (à deux)';
      case 'decor': return sp.examine ? 'Examiner' : null;
    }
    return null;
  }
  function findTarget(p) {
    if (p.ui || p.tele || p.down) return null;
    if (p.hidden) return p.hidden;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let best = null, bs = 1e9;
    for (const o of objsByFloor[p.floor]) {
      if (o.type === 'spawn' || o.type === 'secret') continue;
      if (o.type === 'decor' && !o.spec.examine) continue;
      const pt = interactPoint(o);
      const rx0 = o.rect.x0 + 0.15, rx1 = o.rect.x1 + 0.85, rz0 = o.rect.y0 + 0.15, rz1 = o.rect.y1 + 0.85;
      const nx = Math.max(rx0, Math.min(rx1, p.x)), nz = Math.max(rz0, Math.min(rz1, p.z));
      const tx = o.type === 'pushable' ? pt.x : nx, tz = o.type === 'pushable' ? pt.z : nz;
      const dx = tx - p.x, dz = tz - p.z; const d = Math.hypot(dx, dz);
      if (d > 1.45) continue;
      const dx2 = pt.x - p.x, dz2 = pt.z - p.z; const d2 = Math.hypot(dx2, dz2) || 1;
      const dot = (dx2 * fx + dz2 * fz) / d2;
      if (dot < 0.5 && d2 > 0.55) continue;
      if (d2 > 0.6 && !WORLD.los(p.floor, p.x, p.z, pt.x, pt.z, o)) continue;
      const lab = labelFor(o, p);
      if (!lab) continue;
      const sc = d + (1 - dot) * 1.5;
      if (sc < bs) { bs = sc; best = o; }
    }
    return best;
  }

  function interact(p, o) {
    const sp = o.spec;
    switch (o.type) {
      case 'door': return useDoor(p, o);
      case 'item': o.taken = true; S.taken[o.uid] = true; WORLD.refresh(o); api.give(p, sp.item); return;
      case 'battery': o.taken = true; S.taken[o.uid] = true; WORLD.refresh(o); p.spare++; api.sfx('pickup', p); api.say(p, 'Des piles pour la lampe. (' + p.spare + ' en réserve)'); return;
      case 'lamp':
        o.taken = true; S.taken[o.uid] = true; WORLD.refresh(o);
        if (p.hasLamp) { p.spare++; api.say(p, 'Une autre lampe... je garde les piles.'); }
        else { p.hasLamp = true; p.lamp = true; p.battery = 70; api.sfx('lamp', p); api.say(p, 'Une lampe torche. Elle marche encore. [' + btnLabel(p, 'lamp') + '] pour l\'allumer ou l\'éteindre.', 6); }
        if (p.idx === 1 && !api.flag('j2lamp')) { api.set('j2lamp'); api.obj(p, 'Trouver un moyen de sortir de cette pièce.'); }
        return;
      case 'note': api.read(p, sp.title, sp.text()); return;
      case 'hide': return enterHide(p, o);
      case 'stairs': return useStairs(p, o);
      case 'custom': return sp.use(p, o);
      case 'pushable': return api.twin(p, 'push' + o.uid, () => {
        o.pushed = true; S.pushed[o.uid] = true;
        const c = WORLD.cell(WORLD.floors[o.floor], o.x + sp.to[0], o.y + sp.to[1]); c.pushTarget = true;
        WORLD.refresh(o); sfxAt('push', o.floor, o.cx, o.cz, 1); addNoise(o.floor, o.cx, o.cz, 10);
        api.say('both', 'L\'armoire racle le plancher et finit par céder. Un passage !');
      }, 'Trop lourde pour une seule personne. Il faut pousser à deux, en même temps.');
      case 'decor': api.say(p, sp.examine); return;
    }
  }
  api.twin = (p, key, done, failMsg) => {
    const now = S.time;
    S.twin[key] = S.twin[key] || [-99, -99];
    S.twin[key][p.idx] = now;
    const other = S.twin[key][1 - p.idx];
    if (now - other < 1.6) { S.twin[key] = [-99, -99]; done(); }
    else { api.say(p, failMsg || 'Trop lourd. Il faudrait le faire à deux, en même temps.'); api.sfx('push', p, 0.25); }
  };

  function useDoor(p, o) {
    const sp = o.spec;
    if (sp.cachot && o.locked) {
      if (inRect(p, CACHOT)) { p.hold = { o, t: 0, dur: 9, label: 'Forcer la porte', done: () => { o.locked = false; openDoor(o, p); api.say(p, 'Le loquet rouillé cède enfin !'); } }; return; }
      o.locked = false; openDoor(o, p); return;
    }
    if (sp.twin && o.locked) {
      return api.twin(p, 'door' + o.uid, () => { o.locked = false; openDoor(o, p); sfxAt('secret', o.floor, o.cx, o.cz, 0.8); api.say('both', 'Les portes coulissent lourdement dans un grondement.'); },
        'Ces portes coulissantes sont bien trop lourdes. Il faudrait pousser à deux, en même temps.');
    }
    if (o.locked) {
      if (sp.key && api.has(p, sp.key)) { api.take(p, sp.key); o.locked = false; sfxAt('unlock', o.floor, o.cx, o.cz); openDoor(o, p); api.say(p, 'Déverrouillé.'); return; }
      if (sp.codeLock) {
        const cl = sp.codeLock;
        api.openDial(p, { title: cl.title, desc: cl.desc, dials: Array.from({ length: cl.len }, () => DIGITS), answer: () => cl.answer().split(''),
          success: (pp) => { o.locked = false; sfxAt('unlock', o.floor, o.cx, o.cz); openDoor(o, pp); api.say(pp, 'Le cadenas s\'ouvre.'); } });
        return;
      }
      sfxAt('locked', o.floor, o.cx, o.cz, 0.8); addNoise(o.floor, o.cx, o.cz, 4);
      api.say(p, sp.lockMsg || 'C\'est fermé à clé.');
      return;
    }
    if (o.open) closeDoor(o, p); else openDoor(o, p);
  }
  function openDoor(o, by) {
    if (by) {
      if (o.axis === 'x') o.swing = by.z < o.cz ? 1 : -1;
      else o.swing = by.x < o.cx ? 1 : -1;
    }
    o.open = true;
    sfxAt('door', o.floor, o.cx, o.cz, 0.7);
    addNoise(o.floor, o.cx, o.cz, 6);
  }
  function closeDoor(o) {
    // ne pas fermer sur quelqu'un
    const occ = [...P.map(p => [p.floor, p.x, p.z]), [M.floor, M.x, M.z]].some(([f, x, z]) => f === o.floor && Math.abs(x - o.cx) < 0.75 && Math.abs(z - o.cz) < 0.75);
    if (occ) return;
    o.open = false;
    sfxAt('doorClose', o.floor, o.cx, o.cz, 0.6);
    addNoise(o.floor, o.cx, o.cz, 6);
  }

  function enterHide(p, o) {
    if (p.hidden) { exitHide(p); return; }
    p.hidden = o; p.lamp = false;
    p.hideSeen = M.state === 'chase' && M.chase === p.idx && M.canSee[p.idx];
    p.preHide = { x: p.x, z: p.z };
    const [dx, dy] = WORLD.DIRS[o.dir >= 0 ? o.dir : 0];
    p.x = o.cx + dx * 0.05; p.z = o.cz + dy * 0.05;
    p.yaw = WORLD.yawFromDir(-dx, -dy); p.pitch = 0; p.hideYaw = p.yaw;
    sfxAt('door', p.floor, p.x, p.z, 0.3);
    if (!api.flag('hidTip')) { api.set('hidTip'); api.say(p, 'Caché·e. Retenez votre souffle... [' + btnLabel(p, 'use') + '] pour sortir.'); }
  }
  function exitHide(p) {
    const o = p.hidden; p.hidden = null;
    const [dx, dy] = WORLD.DIRS[o.dir >= 0 ? o.dir : 0];
    p.x = o.cx - dx * 1.0; p.z = o.cz - dy * 1.0;
    if (!freeAt(p.floor, p.x, p.z) && p.preHide) { p.x = p.preHide.x; p.z = p.preHide.z; }
    sfxAt('door', p.floor, p.x, p.z, 0.3);
    addNoise(p.floor, p.x, p.z, 3);
  }

  function useStairs(p, o) {
    const sp = o.spec;
    if (sp.req) {
      const r = sp.req(p, o);
      if (r === false) return;
      if (typeof r === 'string') { api.say(p, r); return; }
    }
    if (!o.other) return;
    const dest = o.other;
    p.tele = { t: 0, dest: { floor: dest.floor, x: dest.arrive.x, z: dest.arrive.z, yaw: dest.faceYaw || 0 }, from: o };
    sfxAt('stairs', p.floor, p.x, p.z, 0.8);
  }
  function afterTeleport(p, from) {
    // chapitres
    if (from.spec.link === 'grille' && p.floor === 2 && S.chapter < 3) setChapter(3);
    if (from.spec.link === 'hatch' && p.floor === 3 && S.chapter < 4) setChapter(4);
    // le Gardien a vu le joueur prendre l'escalier
    if (M.state === 'chase' && M.chase === p.idx && S.time - M.lastSeenT < 1.5) { M.lastSeen = { f: p.floor, x: p.x, z: p.z }; }
  }

  /* ===================== Énigmes spéciales ===================== */
  api.useFuseBox = (p) => {
    let inserted = 0;
    ['fusible1', 'fusible2', 'fusible3'].forEach((id, i) => {
      if (api.has(p, id)) { api.take(p, id); api.set('fuse' + (i + 1)); inserted++; }
    });
    const n = ['fuse1', 'fuse2', 'fuse3'].filter(api.flag).length;
    if (inserted) { api.sfx('unlock', p); }
    if (inserted) api.refreshAll();
    if (n < 3) {
      api.say(p, inserted ? `Fusible en place. Il en manque encore ${3 - n}.` : `Un vieux tableau électrique. Trois emplacements de fusibles... ${n ? 'il en manque ' + (3 - n) : 'tous vides'}. Et quatre leviers.`);
      if (!api.flag('fuseSeen')) { api.set('fuseSeen'); api.obj(p, 'Trouver trois fusibles pour le tableau électrique.'); }
      return;
    }
    api.openDial(p, {
      title: 'Tableau électrique', desc: 'Les trois fusibles sont en place. Positionner les quatre leviers.',
      dials: [['BAS', 'HAUT'], ['BAS', 'HAUT'], ['BAS', 'HAUT'], ['BAS', 'HAUT']], labels: ['Levier 1', 'Levier 2', 'Levier 3', 'Levier 4'],
      initial: S.leverPos.slice(),
      answer: () => S.codes.fuses.map(v => v ? 'HAUT' : 'BAS'),
      onChange: (vals) => { S.leverPos = vals.slice(); },
      fail: (pp) => { api.sfx('spark', pp); api.say(pp, 'Des étincelles... puis plus rien. Mauvaise combinaison. Il doit bien y avoir un schéma quelque part.'); },
      success: (pp) => powerOn(pp),
    });
  };
  function powerOn(p) {
    api.set('power'); WORLD.refreshLampMeshes(true); api.refreshAll();
    sfxAt('power', p.floor, p.x, p.z, 1);
    if (S.chapter >= 2) { api.say('both', 'Le courant revient dans la maison.'); return; }
    AUDIO.play('power', 0.5, P[1].floor === 1 ? 0.8 : 0);
    api.say(P[0], 'Le courant revient ! Les ampoules grésillent et s\'allument une à une.');
    api.say(P[1], 'Les lumières se rallument en grésillant. Un moteur se met en marche quelque part sous le plancher.');
    api.obj(P[0], 'Le monte-charge fonctionne. Aider Sam à sortir de l\'office.');
    if (!inRect(P[1], OFFICE)) api.obj(P[1], 'Rejoindre Léa au sous-sol.');
    else api.obj(P[1], 'Le monte-charge fonctionne. Attendre ce que Léa enverra.');
  }

  api.dumbLabel = (p, end) => {
    if (!api.flag('power')) return 'Utiliser le monte-charge';
    const c = S.dumb[end];
    if (c.length) return 'Récupérer ce qu\'il y a dans le monte-charge (' + c.length + ')';
    if (p.inv.length) return 'Envoyer par le monte-charge : ' + ITEMS[p.inv[p.sel]].name;
    return 'Monte-charge (vide)';
  };
  api.useDumbwaiter = (p, end) => {
    if (!api.flag('power')) {
      api.sfx('locked', p, 0.6);
      api.say(p, end === 1 ? 'Un monte-charge, comme dans les vieilles maisons. Il descend au sous-sol... Le bouton ne répond pas : pas de courant.' : 'Un monte-charge qui remonte vers la cuisine. Le bouton ne répond pas : pas de courant.');
      if (!api.flag('dumbSeen' + end)) { api.set('dumbSeen' + end); if (end === 1) api.obj(p, 'Le monte-charge descend au sous-sol. Il faudrait du courant.'); }
      return;
    }
    const c = S.dumb[end];
    if (c.length) { c.splice(0).forEach(id => { p.inv.push(id); }); p.sel = p.inv.length - 1; api.sfx('pickup', p); api.say(p, 'Récupéré : ' + p.inv.slice(-3).map(i => ITEMS[i].name).join(', ')); return; }
    if (!p.inv.length) { api.say(p, 'Le monte-charge est vide. Je pourrais y mettre un objet pour l\'envoyer de l\'autre côté.'); return; }
    const id = p.inv[p.sel]; api.take(p, id);
    S.dumb[1 - end].push(id);
    api.sfx('power', p, 0.4);
    api.say(p, (end === 0 ? 'Le monte-charge remonte' : 'Le monte-charge descend') + ' dans un grondement de câbles. (' + ITEMS[id].name + ')');
    const q = P[1 - p.idx];
    api.say(q, 'Le monte-charge s\'est mis en marche... ' + (end === 0 ? 'il arrive en haut, dans l\'office.' : 'il descend au sous-sol.'));
  };

  api.frontLabel = (p) => {
    if (api.flag('lockMain') && api.flag('lockChain')) return 'Soulever la barre de fer (à deux)';
    if (!api.flag('lockMain') && api.has(p, 'grande_cle')) return 'Ouvrir la serrure avec la grande clé';
    if (!api.flag('lockChain') && api.has(p, 'coupe_boulon')) return 'Couper la chaîne';
    return 'Examiner la porte d\'entrée';
  };
  api.useFrontDoor = (p) => {
    if (!api.flag('lockMain') && api.has(p, 'grande_cle')) { api.take(p, 'grande_cle'); api.set('lockMain'); api.sfx('unlock', p); api.refreshAll(); api.say(p, 'La grande clé tourne dans la serrure avec un claquement sec.'); return; }
    if (!api.flag('lockChain') && api.has(p, 'coupe_boulon')) { api.take(p, 'coupe_boulon'); api.set('lockChain'); api.sfx('unlock', p); addNoise(p.floor, p.x, p.z, 8); api.refreshAll(); api.say(p, 'Clac ! La chaîne tombe sur le carrelage.'); return; }
    if (api.flag('lockMain') && api.flag('lockChain')) {
      return api.twin(p, 'frontbar', () => { api.set('lockBar'); api.refreshAll(); api.sfx('push', p, 1); finishGame(); }, 'La barre de fer est bien trop lourde. Il faut la soulever à deux, en même temps.');
    }
    const ok = v => v ? '✓' : '✗';
    api.read(p, 'La porte d\'entrée', `Une lourde porte en chêne. Les fenêtres sont toutes barricadées de l'extérieur : c'est la seule sortie.\n\n${ok(api.flag('lockMain'))}  La serrure principale — il faut une grande clé en fer.\n${ok(api.flag('lockChain'))}  Une chaîne cadenassée entre les poignées — il faudrait de quoi la couper.\n✗  Une barre de fer en travers — bien trop lourde pour une seule personne.`);
    if (!api.flag('frontSeen')) { api.set('frontSeen'); api.obj('both', 'Ouvrir la porte d\'entrée : la serrure (grande clé), la chaîne (de quoi couper), la barre (à deux).'); }
  };

  api.onCaveOpened = () => { setChapter(2); };
  api.onGrandeCle = (p) => { setChapter(5); };

  /* ===================== Chapitres ===================== */
  function setChapter(n) {
    if (S.chapter >= n) return;
    S.chapter = n;
    const C = CHAPTERS[n];
    P.forEach(p => { p.chapterCard = { t: 5, title: C.title, sub: C.sub }; });
    if (n === 2) {
      api.obj('both', 'Se retrouver, puis trouver un moyen de sortir du manoir.');
      spawnMonster(1, 5, 25);
      api.say(P[0], 'J\'entends la porte s\'ouvrir en haut des marches... Sam ?');
    }
    if (n === 3) { api.obj('both', 'Explorer l\'étage. Trouver de quoi ouvrir la serrure de la porte d\'entrée.'); if (M.floor !== 2) spawnMonster(2, 35, 25); }
    if (n === 4) { api.obj('both', 'Fouiller le grenier.'); }
    if (n === 5) {
      api.obj('both', 'FUIR ! Retourner à la porte d\'entrée, au rez-de-chaussée.');
      spawnMonster(2, 10, 20); M.hunt = true; M.huntT = 6;
      api.set('power', false); S.leverPos = [0, 0, 0, 0]; WORLD.refreshLampMeshes(false); api.refreshAll();
      P.forEach(p => api.say(p, 'Toutes les lumières de la maison s\'éteignent d\'un coup. En bas, une porte claque. Puis des pas lourds dans l\'escalier... Il sait.', 7));
      AUDIO.play('sting', 0.6, 0);
    }
    save(CP_KEY); save(SAVE_KEY);
  }
  function spawnMonster(f, x, y) { M.floor = f; M.x = x + 0.5; M.z = y + 0.5; M.state = 'patrol'; M.path = []; M.wait = 4; M.grace = 6; }

  function finishGame() {
    ended = true; running = false;
    AUDIO.setChase(0); AUDIO.setAmbience(0.3);
    if (document.pointerLockElement) document.exitPointerLock();
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(CP_KEY); } catch (e) { }
    UI.showEnding(S);
  }
  function gameOver() {
    ended = true; running = false;
    AUDIO.setChase(0);
    if (document.pointerLockElement) document.exitPointerLock();
    UI.showGameOver();
  }

  /* ===================== Le Gardien (IA) ===================== */
  function makeMonster() {
    const mesh = MODELS.build('monster');
    scene.add(mesh);
    const light = new THREE.PointLight(0xff9a40, 0, 9, 2);
    scene.add(light);
    return {
      mesh, light, floor: 1, x: 20.5, z: 20.5, yaw: 0, state: 'off', path: [], wait: 0, repath: 0,
      chase: -1, susp: [0, 0], canSee: [false, false], lastSeen: null, lastSeenT: -99, stepT: 0, walkT: 0,
      doorWait: 0, grace: 0, stuckT: 0, lastPos: { x: 0, z: 0 }, directorT: 60, hunt: false, huntT: 0, speed: 0, searchT: 0,
      script: null,
    };
  }
  function monsterPassable(f, x, y) {
    const fl = WORLD.floors[f]; const c = WORLD.cell(fl, x, y);
    if (!c || c.wall || c.pushTarget) return false;
    const o = c.obj;
    if (!o) return true;
    if (o.type === 'door') return !o.locked;
    if (o.type === 'pushable') return o.pushed;
    if (o.type === 'secret') return api.flag('secret');
    return !WORLD.blocks(o) || o.type === 'spawn';
  }
  function stairLinks() {
    const L = [];
    const ok = { cave: api.flag('caveDoor'), grille: api.flag('grille'), hatch: api.flag('hatch') };
    WORLD.objects.forEach(o => { if (o.type === 'stairs' && o.other && ok[o.spec.link]) L.push([o, o.other]); });
    return L;
  }
  const key = (f, x, y) => f * 10000 + y * 100 + x;
  function astar(sf, sx, sy, tf, tx, ty) {
    if (!monsterPassable(tf, tx, ty)) return null;
    const links = stairLinks();
    const linkFrom = {};
    links.forEach(([a, b]) => { linkFrom[key(a.floor, a.arrive.cx, a.arrive.cy)] = b; });
    // heuristique multi-étages : distance vers l'escalier le plus proche si étage différent
    const h = (f, x, y) => f === tf ? Math.hypot(x - tx, y - ty) : 8 + Math.abs(f - tf) * 10;
    const open = [[h(sf, sx, sy), 0, sf, sx, sy]];
    const g = new Map(), came = new Map();
    const sk = key(sf, sx, sy); g.set(sk, 0);
    let it = 0;
    while (open.length && it++ < 9000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, gc, f, x, y] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      const k = key(f, x, y);
      if (gc > g.get(k)) continue;
      if (f === tf && x === tx && y === ty) {
        const path = []; let kk = k;
        while (kk !== sk) { const f2 = Math.floor(kk / 10000), r = kk % 10000; path.push({ f: f2, x: r % 100, y: Math.floor(r / 100) }); kk = came.get(kk); }
        return path.reverse();
      }
      const nb = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!monsterPassable(f, nx, ny)) continue;
        if (dx && dy && (!monsterPassable(f, x + dx, y) || !monsterPassable(f, x, y + dy))) continue;
        nb.push([f, nx, ny, dx && dy ? 1.414 : 1]);
      }
      const lk = linkFrom[k]; if (lk) nb.push([lk.floor, lk.arrive.cx, lk.arrive.cy, 4]);
      for (const [nf, nx, ny, cost] of nb) {
        const nk = key(nf, nx, ny), ng = gc + cost;
        if (g.has(nk) && g.get(nk) <= ng) continue;
        g.set(nk, ng); came.set(nk, k);
        open.push([ng + h(nf, nx, ny), ng, nf, nx, ny]);
      }
    }
    return null;
  }
  function randomCell(f, near, rad) {
    const fl = WORLD.floors[f];
    for (let i = 0; i < 80; i++) {
      let x, y;
      if (near) { x = Math.floor(near.x + (Math.random() - 0.5) * rad * 2); y = Math.floor(near.z + (Math.random() - 0.5) * rad * 2); }
      else { x = 1 + Math.floor(Math.random() * (fl.W - 2)); y = 1 + Math.floor(Math.random() * (fl.H - 2)); }
      if (monsterPassable(f, x, y)) { const c = WORLD.cell(fl, x, y); if (!c.obj) return { x, y }; }
    }
    return null;
  }
  function goTo(f, x, y) {
    const p = astar(M.floor, Math.floor(M.x), Math.floor(M.z), f, x, y);
    M.path = p || [];
    return !!p;
  }
  const CH_SPEED = { 2: 3.55, 3: 3.7, 4: 3.8, 5: 4.0 };
  function updateMonster(dt) {
    const m = M, U = m.mesh.userData;
    if (m.state === 'off') { m.mesh.visible = false; m.light.intensity = 0; AUDIO.updateHum(dt, false, 0, 0); return; }
    m.mesh.visible = true;
    m.grace = Math.max(0, m.grace - dt);
    // --- perception ---
    const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
    let anySee = false;
    P.forEach((p, i) => {
      m.canSee[i] = false;
      if (m.state === 'script' || m.grace > 0) { m.susp[i] = 0; return; }
      if (p.floor !== m.floor || p.inCachot || p.down || p.tele) { m.susp[i] = Math.max(0, m.susp[i] - dt * 0.4); return; }
      if (p.hidden && !p.hideSeen) { m.susp[i] = Math.max(0, m.susp[i] - dt * 0.4); return; }
      const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz) || 0.01;
      const ang = (dx * fx + dz * fz) / d;
      const lit = p.lamp ? 1 : 0;
      let range = 9 + lit * 8 + (api.flag('power') && m.floor <= 1 ? 2 : 0);
      if (p.crouch && !lit) range = 4.5;
      if (p.hidden) range = 30;
      const inFov = ang > 0.4 || d < 1.6;
      if (d < range + 2 && (inFov || (lit && d < 6) || d < 1.4) && WORLD.los(m.floor, m.x, m.z, p.x, p.z)) {
        if (d < range) {
          m.canSee[i] = true; anySee = true;
          const rate = (m.state === 'chase' ? 6 : 1.6) * (1.25 - d / range) + (lit ? 0.4 : 0);
          m.susp[i] = Math.min(1.2, m.susp[i] + dt * rate);
        }
      } else m.susp[i] = Math.max(0, m.susp[i] - dt * 0.25);
      if (m.susp[i] >= 1 && m.state !== 'chase') {
        m.state = 'chase'; m.chase = i; m.repath = 0;
        AUDIO.play('sting', 0.8, i === 0 ? -0.7 : 0.7);
        api.say(p, 'Il m\'a vu·e ! COURS !', 2.5);
      } else if (m.susp[i] > 0.35 && (m.state === 'patrol' || m.state === 'search')) {
        m.state = 'investigate'; m.target = { f: p.floor, x: Math.floor(p.x), y: Math.floor(p.z) }; goTo(p.floor, m.target.x, m.target.y); m.wait = 0;
      }
      if (m.canSee[i] && m.state === 'chase' && m.chase === i) { m.lastSeen = { f: p.floor, x: p.x, z: p.z }; m.lastSeenT = S.time; }
    });
    // --- ouïe ---
    for (const n of noises) {
      if (n.f !== m.floor || m.state === 'chase' || m.state === 'script' || m.grace > 0) continue;
      const d = Math.hypot(n.x - m.x, n.z - m.z);
      const r = WORLD.los(m.floor, m.x, m.z, n.x, n.z) ? n.r : n.r * 0.6;
      if (d < r) { m.state = 'investigate'; m.target = { f: n.f, x: Math.floor(n.x), y: Math.floor(n.z) }; goTo(n.f, m.target.x, m.target.y); m.wait = 0; }
    }
    // --- comportement ---
    let speed = 1.35;
    const chaseSpeed = CH_SPEED[S.chapter] || 3.6;
    if (m.state === 'patrol') {
      if (!m.path.length) {
        m.wait -= dt;
        if (m.wait <= 0) {
          m.directorT -= 1;
          let f = m.floor, near = null;
          const onFloor = P.some(p => p.floor === m.floor && !p.inCachot);
          const chasers = P.filter(p => !p.inCachot);
          if ((!onFloor || m.hunt) && chasers.length && Math.random() < (m.hunt ? 0.85 : 0.45)) {
            const tp = chasers[Math.floor(Math.random() * chasers.length)];
            f = tp.floor; near = m.hunt ? { x: tp.x, z: tp.z } : null;
          }
          const c = randomCell(f, near, near ? 7 : 0) || randomCell(m.floor);
          if (c) goTo(f, c.x, c.y);
          m.wait = 2 + Math.random() * 4;
        }
      }
    } else if (m.state === 'investigate' || m.state === 'search') {
      speed = m.state === 'investigate' ? 2.0 : 1.5;
      if (!m.path.length) {
        m.searchT = (m.searchT || 0) + dt;
        m.yaw += Math.sin(S.time * 1.7) * dt * 1.5;
        if (m.searchT > (m.state === 'search' ? 7 : 4)) { m.state = 'patrol'; m.searchT = 0; m.wait = 1; }
      } else m.searchT = 0;
    } else if (m.state === 'chase') {
      speed = chaseSpeed;
      const p = P[m.chase];
      if (p.inCachot || p.down) { m.state = 'patrol'; m.path = []; }
      else {
        m.repath -= dt;
        const seenRecently = S.time - m.lastSeenT < 0.3;
        if (p.hidden && p.hideSeen) {
          // il fonce vers l'armoire
          if (Math.hypot(p.hidden.cx - m.x, p.hidden.cz - m.z) < 1.4 && p.floor === m.floor) { catchPlayer(p); return; }
          if (m.repath <= 0) { const o = p.hidden; const [dx, dy] = WORLD.DIRS[o.dir >= 0 ? o.dir : 0]; goTo(o.floor, o.x - dx, o.y - dy); m.repath = 0.6; }
        } else if (m.repath <= 0 && m.lastSeen) {
          goTo(m.lastSeen.f, Math.floor(m.lastSeen.x), Math.floor(m.lastSeen.z)); m.repath = seenRecently ? 0.35 : 1.2;
        }
        if (S.time - m.lastSeenT > 4.5 && !(p.hidden && p.hideSeen)) {
          if (!m.path.length || S.time - m.lastSeenT > 9) { m.state = 'search'; m.searchT = 0; m.chase = -1; p.hideSeen = false; if (m.lastSeen) goTo(m.lastSeen.f, Math.floor(m.lastSeen.x), Math.floor(m.lastSeen.z)); }
        }
        // attrapé ?
        if (p.floor === m.floor && !p.hidden && Math.hypot(p.x - m.x, p.z - m.z) < 0.85) { catchPlayer(p); return; }
      }
    } else if (m.state === 'script') {
      speed = 1.6;
      if (!m.path.length) { m.state = 'off'; return; }
    }
    // capture opportuniste (joueur collé au Gardien même hors poursuite)
    if (m.state !== 'script' && m.grace <= 0) P.forEach(p => { if (p.floor === m.floor && !p.hidden && !p.inCachot && !p.down && !p.tele && Math.hypot(p.x - m.x, p.z - m.z) < 0.7) catchPlayer(p); });
    if (m.hunt && m.state === 'patrol') { m.huntT -= dt; if (m.huntT <= 0) { m.huntT = 22; m.path = []; m.wait = 0; } }

    // --- déplacement le long du chemin ---
    let moving = false;
    if (m.doorWait > 0) { m.doorWait -= dt; }
    else if (m.path.length) {
      const n = m.path[0];
      if (n.f !== m.floor) {
        // escalier
        sfxAt('stairs', m.floor, m.x, m.z, 1);
        m.floor = n.f; m.x = n.x + 0.5; m.z = n.y + 0.5; m.path.shift(); m.doorWait = 1.0;
        sfxAt('stairs', m.floor, m.x, m.z, 1);
      } else {
        const c = WORLD.cell(WORLD.floors[m.floor], n.x, n.y);
        if (c.obj && c.obj.type === 'door' && !c.obj.open) { openDoor(c.obj, m); m.doorWait = 0.7; }
        else {
          const tx = n.x + 0.5, tz = n.y + 0.5;
          const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
          const step = speed * dt;
          if (d <= step) { m.x = tx; m.z = tz; m.path.shift(); }
          else { m.x += dx / d * step; m.z += dz / d * step; }
          const ty = Math.atan2(-dx, -dz);
          let dy = ty - m.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          m.yaw += dy * Math.min(1, dt * 7);
          moving = true;
        }
      }
    }
    // blocage
    m.stuckT += dt;
    if (m.stuckT > 3) { if (Math.hypot(m.x - m.lastPos.x, m.z - m.lastPos.z) < 0.3 && m.path.length) { m.path = []; m.wait = 0.5; } m.stuckT = 0; m.lastPos = { x: m.x, z: m.z }; }
    m.speed = moving ? speed : 0;

    // --- animation ---
    const y0 = m.floor * SEP;
    m.mesh.position.set(m.x, y0, m.z);
    m.mesh.rotation.y = m.yaw;
    m.walkT += dt * (moving ? speed * 2.6 : 0);
    const sw = moving ? Math.sin(m.walkT) * Math.min(0.9, 0.35 + speed * 0.12) : 0;
    U.legL.l.rotation.x = sw; U.legR.l.rotation.x = -sw;
    U.legL.shin.rotation.x = Math.max(0, -sw) * 0.8; U.legR.shin.rotation.x = Math.max(0, sw) * 0.8;
    U.armL.a.rotation.x = -sw * 0.7 + (m.state === 'chase' ? -0.9 : 0); U.armL.fore.rotation.x = m.state === 'chase' ? -0.6 : -0.2;
    U.armR.a.rotation.x = -0.25 + sw * 0.15; U.armR.fore.rotation.x = -0.15;
    U.body.position.y = moving ? Math.abs(Math.cos(m.walkT)) * 0.04 : Math.sin(S.time * 1.3) * 0.01;
    U.body.rotation.x = m.state === 'chase' ? 0.18 : 0.06;
    U.head.rotation.z = Math.sin(S.time * 0.7) * 0.12 + 0.15;
    U.head.rotation.y = (m.state === 'search' || m.state === 'investigate') && !moving ? Math.sin(S.time * 1.4) * 0.8 : 0;
    // lanterne
    const lp = new THREE.Vector3(); U.lantern.getWorldPosition(lp);
    m.light.position.copy(lp);
    m.light.intensity = (9 + Math.sin(S.time * 13) * 1.2 + Math.sin(S.time * 31) * 0.8);
    // pas
    if (moving) {
      m.stepT -= dt;
      if (m.stepT <= 0) { m.stepT = 2.6 / Math.max(1, speed * 2.6) * 1.6; sfxAt('stepHeavy', m.floor, m.x, m.z, 1, 16); }
    }
    // fredonnement
    const g1 = earGain(P[0], m.floor, m.x, m.z, 20), g2 = earGain(P[1], m.floor, m.x, m.z, 20);
    AUDIO.updateHum(dt, m.state !== 'chase', Math.max(g1, g2) * 0.6, (g2 - g1) / (g1 + g2 + 0.001));
  }

  function catchPlayer(p) {
    if (p.down) return;
    if (p.hidden) { p.hidden = null; }
    p.ui = null; p.hold = null; p.lamp = false;
    p.down = { t: 0 };
    S.catches++;
    AUDIO.play('caught', 1, p.idx === 0 ? -0.6 : 0.6);
    const other = P[1 - p.idx];
    M.state = 'patrol'; M.path = []; M.chase = -1; M.susp = [0, 0]; p.hideSeen = false;
    if (other.inCachot || other.down) { setTimeout(gameOver, 2600); return; }
    api.say(other, p.name + ' a crié... puis plus rien. Il l\'a emmené·e. Sûrement en bas, dans la cellule du sous-sol.', 8);
  }
  function updateDown(p, dt) {
    p.down.t += dt;
    if (p.down.t > 3 && !p.down.moved) {
      p.down.moved = true;
      // emmené dans la cellule du sous-sol
      p.floor = CACHOT.f; p.x = CACHOT.sx; p.z = CACHOT.sz; p.yaw = Math.PI; p.inCachot = true;
      const door = WORLD.objects.find(o => o.spec.cachot);
      door.open = false; door.locked = true;
      M.floor = 0; M.x = 10.5; M.z = 7.5; M.state = 'patrol'; M.path = []; M.wait = 5; M.grace = 18;
      api.say(p, 'Je me réveille... de nouveau dans la cellule. La tête me tourne. Il faut forcer la porte, encore.', 7);
      api.obj(p, 'Forcer la porte de la cellule et rejoindre ' + P[1 - p.idx].name + '.');
    }
    if (p.down.t > 5) p.down = null;
  }

  /* ===================== Mise à jour des joueurs ===================== */
  function updatePlayer(p, dt) {
    const I = readInput(p);
    if (p.down) { updateDown(p, dt); return; }
    if (p.tele) {
      p.tele.t += dt;
      if (p.tele.t > 0.45 && !p.tele.done) {
        const d = p.tele.dest; p.tele.done = true;
        p.floor = d.floor; p.x = d.x; p.z = d.z; p.yaw = d.yaw; p.pitch = 0;
        afterTeleport(p, p.tele.from);
      }
      if (p.tele.t > 0.9) p.tele = null;
      return;
    }
    if (p.ui) { handleUI(p, I); return; }
    // regard
    p.yaw -= I.lookX; p.pitch -= I.lookY;
    if (I.turn) p.yaw -= I.turn * 2.3 * dt;
    if (settings.ctrl[p.idx] === 'kb2') p.pitch *= 1 - dt * 3;
    p.pitch = Math.max(-1.25, Math.min(1.25, p.pitch));
    if (p.hidden) {
      let dy = p.yaw - p.hideYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      p.yaw = p.hideYaw + Math.max(-0.5, Math.min(0.5, dy));
      p.pitch = Math.max(-0.3, Math.min(0.3, p.pitch));
      p.target = p.hidden;
      if (I.useP) exitHide(p);
      p.fear = Math.max(0, p.fear - dt * 0.1);
      return;
    }
    if (I.crouchP) p.crouch = !p.crouch;
    // déplacement
    let mx = I.mx, my = I.my; const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
    const moving = len > 0.1;
    let running = I.run && moving && p.stamina > 0.05 && !p.crouch && my > -0.2;
    if (running) p.stamina = Math.max(0, p.stamina - dt / 6.5); else p.stamina = Math.min(1, p.stamina + dt / (moving ? 9 : 5));
    if (p.stamina <= 0.02) p.exhausted = true; if (p.stamina > 0.35) p.exhausted = false;
    if (p.exhausted) running = false;
    const sp = p.crouch ? 1.05 : running ? 4.3 : 2.0;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const vx = (fx * my + rx * mx) * sp * dt, vz = (fz * my + rz * mx) * sp * dt;
    const bx = p.x, bz = p.z;
    moveEntity(p, vx, vz);
    const moved = Math.hypot(p.x - bx, p.z - bz) / dt;
    p.speed = moved;
    // pas & bruit
    if (moved > 0.3) {
      p.bobT += dt * moved * 2.4;
      p.stepT -= dt * moved;
      if (p.stepT <= 0) {
        p.stepT = 1.25;
        sfxAt(p.crouch ? 'stepSoft' : 'step', p.floor, p.x, p.z, running ? 0.9 : p.crouch ? 0.35 : 0.55, 12);
        addNoise(p.floor, p.x, p.z, running ? 11 : p.crouch ? 1.2 : 4.0, p.idx);
      }
    }
    // cellule
    if (p.inCachot && !inRect(p, CACHOT)) {
      p.inCachot = false;
      if (!api.flag('outCachot')) { api.set('outCachot'); api.obj(p, 'Explorer le sous-sol et trouver un moyen de remonter.'); }
      else api.obj(p, S.obj[1 - p.idx]);
    }
    // sortie de l'office (chapitre 1)
    if (p.idx === 1 && !api.flag('j2out') && p.floor === 1 && !inRect(p, OFFICE)) {
      api.set('j2out'); api.obj(p, 'Rejoindre Léa : trouver la porte de la cave.');
      if (S.chapter === 1 && api.flag('power')) { // apparition scriptée
        M.floor = 1; M.x = 21.5; M.z = 26.5; M.state = 'script'; M.grace = 99; goTo(1, 21, 13);
        api.sfx('creak', p, 0.8);
      }
    }
    // lampe
    if (I.lampP && p.hasLamp) { if (p.battery > 0 || p.spare > 0) { p.lamp = !p.lamp; api.sfx('lamp', p, 0.6); } else api.say(p, 'Plus de piles...'); }
    if (p.lamp) {
      p.battery -= dt * (100 / 480);
      if (p.battery <= 0) { if (p.spare > 0) { p.spare--; p.battery = 100; api.say(p, 'Je change les piles.'); api.sfx('lamp', p); } else { p.battery = 0; p.lamp = false; api.say(p, 'La lampe s\'éteint. Plus de piles !'); } }
    }
    // inventaire
    if (I.nextP && p.inv.length) { p.sel = (p.sel + 1) % p.inv.length; }
    if (I.giveP) {
      const q = P[1 - p.idx];
      if (!p.inv.length) api.say(p, 'Je n\'ai rien à donner.');
      else if (q.floor === p.floor && Math.hypot(q.x - p.x, q.z - p.z) < 2.2 && !q.hidden && !q.down) {
        const id = p.inv[p.sel]; api.take(p, id); q.inv.push(id); q.sel = q.inv.length - 1;
        api.sfx('pickup', p); api.say(p, 'Donné à ' + q.name + ' : ' + ITEMS[id].name); api.say(q, p.name + ' me donne : ' + ITEMS[id].name);
      } else api.say(p, q.name + ' est trop loin pour lui donner quelque chose.');
    }
    // interaction
    p.target = findTarget(p);
    if (p.hold) {
      if (!I.useH || p.target !== p.hold.o) p.hold = null;
      else {
        p.hold.t += dt;
        if (Math.floor(p.hold.t * 1.3) !== Math.floor((p.hold.t - dt) * 1.3)) { sfxAt('force', p.floor, p.x, p.z, 0.7); addNoise(p.floor, p.x, p.z, 7); }
        if (p.hold.t >= p.hold.dur) { const h = p.hold; p.hold = null; h.done(); }
      }
    } else if (I.useP && p.target) interact(p, p.target);
    // peur
    let fear = 0;
    if (M.state !== 'off' && M.floor === p.floor) { const d = Math.hypot(M.x - p.x, M.z - p.z); fear = Math.max(0, 1 - d / 14); if (M.state === 'chase' && M.chase === p.idx) fear = Math.max(fear, 0.8); }
    p.fear += (fear - p.fear) * Math.min(1, dt * 2);
  }

  function handleUI(p, I) {
    const ui = p.ui;
    if (ui.type === 'note') { if (I.useP || I.cancelP) { p.ui = null; } return; }
    if (ui.type === 'dial') {
      const n = ui.cfg.dials.length;
      if (I.nav.l) ui.col = (ui.col + n - 1) % n;
      if (I.nav.r) ui.col = (ui.col + 1) % n;
      const opts = ui.cfg.dials[ui.col];
      if (I.nav.u) { ui.vals[ui.col] = (ui.vals[ui.col] + 1) % opts.length; api.sfx('force', p, 0.25); }
      if (I.nav.d) { ui.vals[ui.col] = (ui.vals[ui.col] + opts.length - 1) % opts.length; api.sfx('force', p, 0.25); }
      if ((I.nav.u || I.nav.d) && ui.cfg.onChange) ui.cfg.onChange(ui.vals);
      if (I.cancelP) { p.ui = null; return; }
      if (I.useP) {
        const val = ui.vals.map((v, i) => ui.cfg.dials[i][v]);
        const ans = ui.cfg.answer();
        if (val.every((v, i) => v === ans[i])) { p.ui = null; ui.cfg.success(p); }
        else { if (ui.cfg.fail) ui.cfg.fail(p); else { api.sfx('locked', p, 0.7); api.say(p, 'Ça ne s\'ouvre pas.', 2); } ui.shake = 0.4; }
      }
    }
  }

  /* ===================== Lumières ===================== */
  let lightT = 0;
  function updateLights(dt) {
    const power = api.flag('power');
    lightT -= dt;
    if (lightT <= 0) {
      lightT = 0.2;
      const cands = WORLD.lamps.filter(l => (l.need ? power : true) && !l.dead && P.some(p => p.floor === l.floor));
      const chosen = new Set();
      P.forEach(p => {
        cands.filter(l => l.floor === p.floor).map(l => [l, Math.hypot(l.x - p.x, l.z - p.z)]).filter(a => a[1] < 16).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(a => chosen.add(a[0]));
      });
      const arr = [...chosen].slice(0, lightPool.length);
      lightPool.forEach((L, i) => { L.userData.lamp = arr[i] || null; });
    }
    lightPool.forEach(L => {
      const l = L.userData.lamp;
      if (!l) { L.intensity = 0; return; }
      L.position.set(l.x, l.y, l.z);
      const t = S.time + l.phase;
      let f = 0.92 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 23.1) * 0.03;
      if (l.broken) { const s = Math.sin(t * 1.3) + Math.sin(t * 3.7); f = s > 1.1 ? (Math.random() < 0.5 ? 0.05 : 0.8) : 0.85; }
      if (l.kind === 'candle') { L.color.setHex(0xff9a40); L.distance = 6; L.intensity = (2.2 + Math.sin(t * 11) * 0.3 + Math.random() * 0.25); }
      else { L.color.setHex(0xffd49a); L.distance = 9; L.intensity = 7.5 * f; }
      if (l.mesh) l.mesh.userData.bulb.material = (f > 0.3 && (!l.need || power)) ? mats.lampOn : mats.lampOff;
    });
    // lampes torches
    P.forEach(p => {
      const s = p.spot;
      const on = p.lamp && !p.hidden && !p.down && p.battery > 0;
      let k = p.battery < 15 ? (Math.random() < 0.08 ? 0.1 : 0.6) : p.battery < 35 ? 0.85 : 1;
      s.intensity = on ? 20 * k : 0;
      const cam = p.cam;
      s.position.copy(cam.position);
      const dir = new THREE.Vector3(0, -0.04, -1).applyQuaternion(cam.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      s.position.addScaledVector(right, 0.18).addScaledVector(dir, 0.1);
      s.position.y -= 0.12;
      s.target.position.copy(cam.position).addScaledVector(dir, 6);
    });
  }

  /* ===================== Caméras ===================== */
  function updateCameras(dt) {
    P.forEach(p => {
      const eye = p.hidden ? 1.55 : p.crouch ? 1.0 : 1.62;
      p.eyeY = p.eyeY === undefined ? eye : p.eyeY + (eye - p.eyeY) * Math.min(1, dt * 8);
      const bob = Math.sin(p.bobT * 2) * 0.035 * Math.min(1, p.speed / 2);
      const sway = Math.cos(p.bobT) * 0.02 * Math.min(1, p.speed / 2);
      let shake = 0;
      if (p.down) shake = Math.max(0, 1 - p.down.t) * 0.08;
      p.cam.position.set(p.x + sway * Math.cos(p.yaw), p.floor * SEP + p.eyeY + bob + (Math.random() - 0.5) * shake, p.z - sway * Math.sin(p.yaw));
      p.cam.rotation.y = p.yaw;
      p.cam.rotation.x = p.pitch + (p.down ? -Math.min(1.2, p.down.t * 0.8) : 0);
      p.cam.rotation.z = p.down ? Math.min(0.8, p.down.t * 0.5) : 0;
    });
  }

  /* ===================== Boucle principale ===================== */
  let lastSave = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (running && !paused) {
      S.time += dt;
      P.forEach(p => updatePlayer(p, dt));
      updateMonster(dt);
      noises.length = 0;
      WORLD.objects.forEach(o => {
        if (o.type === 'door') {
          const tgt = o.open ? 1 : 0;
          if (o.anim !== tgt) { o.anim += Math.sign(tgt - o.anim) * dt * 2.5; o.anim = Math.max(0, Math.min(1, o.anim)); WORLD.updateDoorMesh(o); }
        }
        if (o.rock) o.rock.rotation.x = Math.sin(S.time * 1.2 + o.x) * 0.05 * (P.some(p => p.floor === o.floor && Math.hypot(p.x - o.cx, p.z - o.cz) < 5) ? 2 : 0.3);
      });
      updateCameras(dt);
      updateLights(dt);
      // audio
      AUDIO.updateRandom(dt);
      const chasing = M.state === 'chase';
      AUDIO.setChase(chasing ? 1 : 0);
      P.forEach(p => AUDIO.updateHeart(dt, p.fear, p.idx === 0 ? -0.8 : 0.8));
      P.forEach(p => { p.msgT -= dt; if (p.objFlash > 0) p.objFlash -= dt; if (p.chapterCard) { p.chapterCard.t -= dt; if (p.chapterCard.t <= 0) p.chapterCard = null; } if (p.ui && p.ui.shake) p.ui.shake = Math.max(0, p.ui.shake - dt); });
      // sauvegarde auto toutes les 60 s
      if (S.time - lastSave > 60) { lastSave = S.time; save(SAVE_KEY); }
    }
    mouseDX = 0; mouseDY = 0;
    for (const k in pressed) delete pressed[k];
    if (running || paused) render();
    if (running || paused) UI.hud(P, S, M);
  }
  function render() {
    const w = window.innerWidth, h = window.innerHeight;
    const floorsUsed = new Set(P.map(p => p.floor));
    WORLD.root.children.forEach((g, i) => { g.visible = floorsUsed.has(i); });
    M.mesh.visible = M.state !== 'off' && floorsUsed.has(M.floor);
    renderer.setScissorTest(true);
    renderer.shadowMap.needsUpdate = true;
    const hw = Math.floor(w / 2);
    P.forEach((p, i) => {
      const x = i * (w - hw), vw = i ? w - hw : hw;
      renderer.setViewport(x, 0, vw, h); renderer.setScissor(x, 0, vw, h);
      p.cam.aspect = vw / h; p.cam.updateProjectionMatrix();
      renderer.render(scene, p.cam);
    });
    renderer.setScissorTest(false);
  }

  /* ===================== Débogage / tests ===================== */
  api.debug = {
    get S() { return S; }, get P() { return P; }, get M() { return M; }, WORLD,
    tp(i, f, x, y) { const p = P[i]; p.floor = f; p.x = x + 0.5; p.z = y + 0.5; p.inCachot = inRect(p, CACHOT); },
    find(f, ch) { return WORLD.objects.find(o => o.floor === f && o.ch === ch); },
    findAll(f, ch) { return WORLD.objects.filter(o => o.floor === f && o.ch === ch); },
    use(i, o) { interact(P[i], o); },
    label(i, o) { return labelFor(o, P[i]); },
    dial(i, values) { const p = P[i]; if (!p.ui || p.ui.type !== 'dial') return 'nodial'; const ui = p.ui; ui.vals = values.map((v, k) => ui.cfg.dials[k].indexOf(String(v))); const ans = ui.cfg.answer(); const val = ui.vals.map((v, k) => ui.cfg.dials[k][v]); if (val.every((v, k) => v === ans[k])) { p.ui = null; ui.cfg.success(p); return true; } return false; },
    closeUI(i) { P[i].ui = null; },
    setChapter, catchPlayer: (i) => catchPlayer(P[i]), finishGame, astar, monsterPassable,
    get running() { return running; }, get ended() { return ended; },
  };
  api.targetLabel = p => p.target ? labelFor(p.target, p) : null;
  api.init = init;
  api.isRunning = () => running;
  return api;
})();
