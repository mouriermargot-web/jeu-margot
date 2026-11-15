'use strict';
/* =====================================================================
   Interface : menus, HUD des deux joueurs, écrans d'histoire
   ===================================================================== */
const UI = (() => {
  const $ = s => document.querySelector(s);
  const huds = [];
  const cache = [{}, {}];

  function el(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function setText(i, k, node, txt) { if (cache[i][k] !== txt) { cache[i][k] = txt; node.textContent = txt; } }
  function setHTML(i, k, node, html) { if (cache[i][k] !== html) { cache[i][k] = html; node.innerHTML = html; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function init() {
    const root = $('#hudroot');
    for (let i = 0; i < 2; i++) {
      const h = el('div', 'hud hud' + i, root);
      const o = {
        root: h,
        slits: el('div', 'slits', h),
        danger: el('div', 'danger', h),
        name: el('div', 'pname', h),
        obj: el('div', 'obj', h),
        prompt: el('div', 'prompt', h),
        msg: el('div', 'msg', h),
        inv: el('div', 'inv', h),
        status: el('div', 'status', h),
        hold: el('div', 'holdbar', h, '<div></div>'),
        fade: el('div', 'fade', h),
        panel: el('div', 'panel', h),
        chapter: el('div', 'chapter', h),
        hint: el('div', 'mousehint', h),
        cross: el('div', 'cross', h),
        scare: el('div', 'scare', h, '<img alt="">'),
      };
      huds.push(o);
    }
    // grain
    const gc = $('#grain'); gc.width = 192; gc.height = 108;
    const gx = gc.getContext('2d'); const img = gx.createImageData(192, 108);
    let gt = 0;
    (function grainLoop() {
      requestAnimationFrame(grainLoop);
      if (++gt % 2) return;
      const d = img.data;
      for (let k = 0; k < d.length; k += 4) { const v = Math.random() * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      gx.putImageData(img, 0, 0);
    })();
    FACES.girl = drawFace('girl'); FACES.sack = drawFace('sack');
    buildMenus();
  }


  /* ---------------- Visages des screamers (dessinés au lancement) ---------------- */
  const FACES = {};
  function drawFace(kind) {
    const W = 640, c = document.createElement('canvas'); c.width = W; c.height = W;
    const x = c.getContext('2d'); const R = (a, b) => a + Math.random() * (b - a);
    x.fillStyle = '#000'; x.fillRect(0, 0, W, W);
    const cx = W / 2, cy = W / 2 + 10;
    if (kind === 'girl') {
      // visage noyé, blafard
      const g = x.createRadialGradient(cx, cy - 30, 30, cx, cy, 300);
      g.addColorStop(0, '#dfe6e2'); g.addColorStop(0.6, '#9fb0aa'); g.addColorStop(1, '#3a4a48');
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, 190, 265, 0, 0, 7); x.fill();
      // veines
      x.strokeStyle = 'rgba(40,60,90,0.5)'; x.lineWidth = 2;
      for (let k = 0; k < 26; k++) { x.beginPath(); let px = cx + R(-170, 170), py = cy + R(-240, 240); x.moveTo(px, py); for (let n = 0; n < 7; n++) { px += R(-22, 22); py += R(-8, 30); x.lineTo(px, py); } x.stroke(); }
      // orbites
      for (const s of [-1, 1]) {
        const ex = cx + s * 78, ey = cy - 55;
        const eg = x.createRadialGradient(ex, ey, 5, ex, ey, 85); eg.addColorStop(0, '#000'); eg.addColorStop(0.7, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = eg; x.beginPath(); x.ellipse(ex, ey, 70, 85, s * 0.15, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + s * 4, ey + 6, 5, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 7; for (let k = 0; k < 4; k++) { x.beginPath(); const dx = ex + R(-40, 40); x.moveTo(dx, ey + 60); x.lineTo(dx + R(-8, 8), ey + R(140, 260)); x.stroke(); }
      }
      // bouche hurlante
      const mg = x.createRadialGradient(cx, cy + 150, 5, cx, cy + 150, 120); mg.addColorStop(0, '#000'); mg.addColorStop(0.8, '#120000'); mg.addColorStop(1, '#3a1010');
      x.fillStyle = mg; x.beginPath(); x.ellipse(cx, cy + 150, 72, 118, 0, 0, 7); x.fill();
      x.fillStyle = '#c8c4a8'; for (let k = 0; k < 9; k++) { const tx = cx - 56 + k * 14; x.beginPath(); x.moveTo(tx, cy + 58 + Math.abs(k - 4) * 5); x.lineTo(tx + 6, cy + 86 + R(0, 12)); x.lineTo(tx + 12, cy + 58 + Math.abs(k - 4) * 5); x.fill(); }
      // cheveux mouillés
      x.strokeStyle = '#050505';
      for (let k = 0; k < 160; k++) { x.lineWidth = R(2, 9); x.beginPath(); const side = k % 3; let px = side === 0 ? cx - R(120, 260) : side === 1 ? cx + R(120, 260) : cx + R(-150, 150); let py = cy - R(200, 300); x.moveTo(px, py); const len = side === 2 ? R(60, 230) : R(300, 600); x.bezierCurveTo(px + R(-30, 30), py + len * 0.3, px + R(-40, 40), py + len * 0.7, px + R(-50, 50), py + len); x.stroke(); }
    } else {
      // sac de toile
      const g = x.createRadialGradient(cx, cy - 20, 30, cx, cy, 310);
      g.addColorStop(0, '#9a8258'); g.addColorStop(0.7, '#5a4a30'); g.addColorStop(1, '#1a140a');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx - 200, cy - 240); x.bezierCurveTo(cx - 60, cy - 310, cx + 80, cy - 300, cx + 210, cy - 230); x.bezierCurveTo(cx + 260, cy, cx + 230, cy + 220, cx + 150, cy + 300); x.lineTo(cx - 160, cy + 300); x.bezierCurveTo(cx - 250, cy + 200, cx - 260, cy - 20, cx - 200, cy - 240); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 2;
      for (let k = 0; k < W; k += 9) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + R(-6, 6), W); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(W, k + R(-6, 6)); x.stroke(); }
      // taches
      for (let k = 0; k < 14; k++) { const bx = cx + R(-180, 180), by = cy + R(-200, 260), r = R(20, 70); const bg = x.createRadialGradient(bx, by, 0, bx, by, r); bg.addColorStop(0, 'rgba(70,5,5,0.75)'); bg.addColorStop(1, 'rgba(70,5,5,0)'); x.fillStyle = bg; x.fillRect(bx - r, by - r, 2 * r, 2 * r); }
      // trous des yeux déchirés
      for (const s of [-1, 1]) {
        const ex = cx + s * 85, ey = cy - 60;
        x.fillStyle = '#000'; x.beginPath(); for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2, r = (a % 2 ? 62 : 44) + R(-8, 8); x.lineTo(ex + Math.cos(an) * r, ey + Math.sin(an) * r * 0.8); } x.fill();
        x.fillStyle = '#e8e0c8'; x.beginPath(); x.arc(ex, ey, 20, 0, 7); x.fill();
        x.strokeStyle = '#a01010'; x.lineWidth = 1.5; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + R(-20, 20), ey + R(-20, 20)); x.stroke(); }
        x.fillStyle = '#000'; x.beginPath(); x.arc(ex - s * 3, ey + 2, 6, 0, 7); x.fill();
      }
      // bouche cousue qui se déchire
      x.fillStyle = '#000'; x.beginPath(); x.moveTo(cx - 150, cy + 110); x.quadraticCurveTo(cx, cy + 60, cx + 150, cy + 110); x.quadraticCurveTo(cx, cy + 290, cx - 150, cy + 110); x.fill();
      x.fillStyle = '#b8b090'; for (let k = 0; k < 11; k++) { const tx = cx - 120 + k * 22; x.fillRect(tx, cy + 96 + Math.abs(k - 5) * 3, 14, R(18, 34)); x.fillRect(tx + 4, cy + 200 - Math.abs(k - 5) * 9, 12, -R(14, 28)); }
      x.strokeStyle = '#1a1208'; x.lineWidth = 5; for (let k = 0; k < 9; k++) { const tx = cx - 130 + k * 32; x.beginPath(); x.moveTo(tx, cy + 70 + R(-6, 6)); x.lineTo(tx + R(-10, 10), cy + 250 - Math.abs(k - 4) * 14); x.stroke(); }
    }
    // grain + vignette
    const img = x.getImageData(0, 0, W, W), d = img.data;
    for (let k = 0; k < d.length; k += 4) { const n = (Math.random() - 0.5) * 50; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
    x.putImageData(img, 0, 0);
    const v = x.createRadialGradient(cx, cy, 180, cx, cy, 340); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, '#000');
    x.fillStyle = v; x.fillRect(0, 0, W, W);
    return c.toDataURL('image/jpeg', 0.85);
  }

  /* ---------------- Menus ---------------- */
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
  function buildMenus() {
    $('#btnNew').onclick = () => { AUDIO.init(); intro(); };
    $('#btnContinue').onclick = () => { AUDIO.init(); G.continueGame(); G.lockPointer(); };
    $('#btnControls').onclick = () => { refreshControls(); show('controls'); };
    $('#btnOptions').onclick = () => { fillOptions(); show('options'); };
    document.querySelectorAll('.back').forEach(b => b.onclick = () => { if (G.isRunning()) show('pause'); else showMenu(); });
    $('#btnResume').onclick = () => G.resume();
    $('#btnPauseOptions').onclick = () => { fillOptions(); show('options'); };
    $('#btnPauseControls').onclick = () => { refreshControls(); show('controls'); };
    $('#btnSave').onclick = () => { const ok = G.save(); $('#btnSave').textContent = ok ? 'Partie sauvegardée ✓' : 'Échec de la sauvegarde'; setTimeout(() => $('#btnSave').textContent = 'Sauvegarder', 1800); };
    $('#btnQuit').onclick = () => { G.save(); G.quitToMenu(); };
    $('#btnRetry').onclick = () => { G.loadCheckpoint(); G.lockPointer(); };
    $('#btnGOMenu').onclick = () => G.quitToMenu();
    $('#btnEndMenu').onclick = () => G.quitToMenu();
    // options
    const S = G.settings;
    $('#optBright').oninput = e => { S.bright = +e.target.value; G.applySettings(); drawCalib(); };
    $('#optVol').oninput = e => { S.vol = +e.target.value; G.applySettings(); };
    $('#optSens').oninput = e => { S.sens = +e.target.value; G.applySettings(); };
    $('#optShadows').onchange = e => { S.shadows = e.target.checked; G.applySettings(); };
    $('#optScares').onchange = e => { S.scares = e.target.checked; G.applySettings(); };
    $('#optC1').onchange = e => { S.ctrl[0] = e.target.value; G.applySettings(); };
    $('#optC2').onchange = e => { S.ctrl[1] = e.target.value; G.applySettings(); };
    showMenu();
  }
  function fillOptions() {
    const S = G.settings;
    $('#optBright').value = S.bright; $('#optVol').value = S.vol; $('#optSens').value = S.sens; $('#optShadows').checked = S.shadows; $('#optScares').checked = S.scares !== false;
    $('#optC1').value = S.ctrl[0]; $('#optC2').value = S.ctrl[1];
    drawCalib();
  }
  function drawCalib() {
    const c = $('#calib'); const x = c.getContext('2d');
    const b = G.settings.bright;
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    const v = Math.min(255, Math.round(9 * b * b * 3));
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.font = 'bold 34px Georgia'; x.textAlign = 'center'; x.fillText('À peine visible', c.width / 2, 52);
  }
  function showMenu() {
    $('#btnContinue').style.display = G.hasSave() ? '' : 'none';
    show('menu');
    $('#hudroot').style.display = 'none';
    $('#grain').style.display = 'block';
  }
  function showGame() { show(''); $('#hudroot').style.display = 'block'; huds.forEach(h => h.panel.className = 'panel'); cache[0] = {}; cache[1] = {}; }
  function showPause() { show('pause'); }
  function hidePause() { show(''); }
  function showGameOver() { show('gameover'); }
  function showEnding(S) {
    const t = Math.floor(S.time), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60;
    $('#endStats').textContent = `Temps de jeu : ${h ? h + ' h ' : ''}${m} min — Captures : ${S.catches}`;
    show('ending');
    const lines = document.querySelectorAll('#ending p.story');
    lines.forEach((l, i) => { l.style.animationDelay = (1 + i * 3.2) + 's'; });
  }
  function intro() {
    show('intro');
    const box = $('#introText'); box.innerHTML = '';
    let i = 0, timer = null;
    const done = () => { clearTimeout(timer); window.removeEventListener('keydown', skip); $('#intro').onclick = null; G.newGame(); G.lockPointer(); };
    const next = () => {
      if (i >= INTRO_TEXT.length) { timer = setTimeout(done, 2500); return; }
      const p = el('p', 'fadein', box, esc(INTRO_TEXT[i++]));
      timer = setTimeout(next, 3800);
    };
    const skip = e => { if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') done(); };
    window.addEventListener('keydown', skip);
    $('#intro').onclick = done;
    next();
  }

  /* ---------------- Contrôles ---------------- */
  function refreshControls() {
    const L = G.keyLabel, K = G.SCHEMES;
    const k1 = K.kbm, k2 = K.kb2;
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    $('#ctrlP1').innerHTML = '<table>' +
      row('Se déplacer', [k1.fwd, k1.left, k1.back, k1.right].map(k => L(k[0])).join(' ')) +
      row('Regarder', 'Souris') + row('Courir', L(k1.run[0])) + row('S\'accroupir', L(k1.crouch[0])) +
      row('Interagir / valider', L(k1.use[0]) + ' ou Espace') + row('Lampe torche', L(k1.lamp[0])) +
      row('Objet suivant', L(k1.next[0])) + row('Donner l\'objet', L(k1.give[0])) + row('Annuler (cadenas)', L(k1.cancel[0])) + row('Pause', 'Échap') + '</table>';
    $('#ctrlP2').innerHTML = '<table>' +
      row('Avancer / reculer', '↑ ↓') + row('Tourner', '← →') + row('Pas de côté', L(k2.left[0]) + ' / ' + L(k2.right[0])) + row('Courir', L(k2.run[1]) + ' ou Maj droite') +
      row('S\'accroupir', L(k2.crouch[1]) + ' ou Ctrl droit') + row('Interagir / valider', L(k2.use[0]) + ' ou Entrée') +
      row('Lampe torche', L(k2.lamp[0])) + row('Objet suivant', L(k2.next[0])) + row('Donner l\'objet', L(k2.give[0])) + row('Pause', 'P (ou Échap)') + '</table>';
  }

  /* ---------------- HUD ---------------- */
  function hud(P, S, M) {
    P.forEach((p, i) => {
      const h = huds[i];
      setText(i, 'name', h.name, p.name);
      // objectif
      const ob = S.obj[i] || '';
      setText(i, 'obj', h.obj, ob ? '◆ ' + ob : '');
      h.obj.style.opacity = p.objFlash > 0 ? 1 : 0.55;
      h.obj.classList.toggle('flash', p.objFlash > 4);
      // invite d'interaction
      let pr = '';
      if (p.target && !p.ui && !p.tele && !p.down) {
        const lab = G.targetLabel(p);
        if (lab) pr = `<span class="key">${esc(G.btnLabel(p, 'use'))}</span> ${esc(lab)}`;
      }
      setHTML(i, 'prompt', h.prompt, pr);
      // message
      const showMsg = p.msgT > 0 ? p.msg : '';
      setText(i, 'msg', h.msg, showMsg);
      h.msg.style.opacity = p.msgT > 0 ? Math.min(1, p.msgT) : 0;
      // inventaire
      let inv = '';
      if (p.inv.length) {
        inv = p.inv.map((id, k) => `<div class="${k === p.sel ? 'sel' : ''}">${k === p.sel ? '› ' : ''}${esc(ITEMS[id].name)}</div>`).join('');
        if (p.inv.length > 1) inv += `<div class="tip">${esc(G.btnLabel(p, 'next'))} : objet suivant · ${esc(G.btnLabel(p, 'give'))} : donner</div>`;
      }
      setHTML(i, 'inv', h.inv, inv);
      // état
      let st = '';
      if (p.hasLamp) {
        const b = Math.max(0, Math.round(p.battery));
        st += `<div class="bat ${b < 20 ? 'low' : ''}"><span>Lampe ${p.lamp ? 'allumée' : 'éteinte'}</span><i style="width:${b}%"></i></div><div class="spare">Piles de rechange : ${p.spare}</div>`;
      }
      if (p.stamina < 0.99) st += `<div class="stam"><i style="width:${Math.round(p.stamina * 100)}%"></i></div>`;
      if (p.crouch) st += '<div class="crouch">Accroupi·e</div>';
      setHTML(i, 'st', h.status, st);
      // maintien
      h.hold.style.display = p.hold ? 'block' : 'none';
      if (p.hold) h.hold.firstChild.style.width = Math.min(100, p.hold.t / p.hold.dur * 100) + '%';
      // cachette
      h.slits.style.display = p.hidden ? 'block' : 'none';
      // danger
      h.danger.style.opacity = Math.min(0.85, p.fear * 0.7 + (p.down ? 0.9 : 0));
      // fondu
      let fa = 0;
      if (p.tele) fa = p.tele.t < 0.45 ? p.tele.t / 0.45 : 1 - (p.tele.t - 0.45) / 0.45;
      if (p.down) fa = p.down.t < 2.5 ? Math.min(1, p.down.t / 2) : Math.max(0, 1 - (p.down.t - 3) / 2);
      h.fade.style.opacity = fa;
      setText(i, 'fadeTxt', h.fade, p.down && p.down.t < 3 ? 'Une main glacée se referme sur vous...' : '');
      // panneau (lecture / cadenas)
      if (p.ui) {
        h.panel.className = 'panel on ' + p.ui.type + (p.ui.shake > 0 ? ' shake' : '');
        if (p.ui.type === 'quiz') {
          const u = p.ui;
          const nav = settings().ctrl[i] === 'kbm' ? `${G.keyLabel('KeyW')} ${G.keyLabel('KeyS')} : choisir` : settings().ctrl[i] === 'kb2' ? '↑ ↓ : choisir' : 'Croix : choisir';
          setHTML(i, 'panel', h.panel, `<h2>Serrure à énigme</h2><div class="desc">Une plaque de cuivre gravée d'une question. Quatre boutons.</div><div class="question">${esc(u.q)}</div><div class="choices">${u.choices.map((c, k) => `<div class="${k === u.sel ? 'cur' : ''}">${k === u.sel ? '▶ ' : ''}${esc(c)}</div>`).join('')}</div><div class="close">${esc(nav)}<br><span class="key">${esc(G.btnLabel(p, 'use'))}</span> Valider · <span class="key">${esc(G.btnLabel(p, 'cancel'))}</span> Annuler<br>Attention : une mauvaise réponse fait du bruit.</div>`);
        } else if (p.ui.type === 'note') setHTML(i, 'panel', h.panel, `<h2>${esc(p.ui.title)}</h2><div class="text">${esc(p.ui.text)}</div><div class="close"><span class="key">${esc(G.btnLabel(p, 'use'))}</span> Fermer</div>`);
        else {
          const c = p.ui.cfg;
          const cols = c.dials.map((opts, k) => `<div class="col ${k === p.ui.col ? 'cur' : ''}">${c.labels ? `<small>${esc(c.labels[k])}</small>` : ''}<b>▲</b><span>${esc(opts[p.ui.vals[k]])}</span><b>▼</b></div>`).join('');
          const nav = settings().ctrl[i] === 'kbm' ? `${G.keyLabel('KeyA')} ${G.keyLabel('KeyD')} : choisir · ${G.keyLabel('KeyW')} ${G.keyLabel('KeyS')} : tourner` : settings().ctrl[i] === 'kb2' ? '← → : choisir · ↑ ↓ : tourner' : 'Croix : choisir / tourner';
          setHTML(i, 'panel', h.panel, `<h2>${esc(c.title)}</h2><div class="desc">${esc(c.desc || '')}</div><div class="dials">${cols}</div><div class="close">${esc(nav)}<br><span class="key">${esc(G.btnLabel(p, 'use'))}</span> Valider · <span class="key">${esc(G.btnLabel(p, 'cancel'))}</span> Annuler</div>`);
        }
      } else { h.panel.className = 'panel'; cache[i].panel = null; }
      // carte de chapitre
      if (p.chapterCard) { setHTML(i, 'chap', h.chapter, `<div>${esc(p.chapterCard.title)}</div><span>${esc(p.chapterCard.sub)}</span>`); h.chapter.style.opacity = Math.min(1, p.chapterCard.t, 5 - p.chapterCard.t); }
      else h.chapter.style.opacity = 0;
      // souris
      const needMouse = settings().ctrl[i] === 'kbm' && document.pointerLockElement === null;
      setText(i, 'hint', h.hint, needMouse ? 'Cliquez pour contrôler la vue à la souris' : '');
      h.cross.style.opacity = p.target && !p.ui ? 0.9 : 0.25;
      // screamer
      if (p.scare) {
        const img = h.scare.firstChild; const src = FACES[p.scare.kind] || FACES.girl;
        if (cache[i].scareK !== p.scare.kind) { cache[i].scareK = p.scare.kind; img.src = src; }
        const k = 1 - p.scare.t;
        h.scare.style.display = 'flex';
        h.scare.style.opacity = p.scare.t < 0.2 ? p.scare.t / 0.2 : 1;
        img.style.transform = `translate(${(Math.random() - 0.5) * 30}px, ${(Math.random() - 0.5) * 30}px) scale(${0.75 + Math.min(1, k * 5) * 0.55 + k * 0.5})`;
        h.scare.style.background = Math.random() < 0.15 ? '#400' : '#000';
      } else if (cache[i].scareK !== null) { h.scare.style.display = 'none'; cache[i].scareK = null; }
    });
  }
  function settings() { return G.settings; }

  return { init, hud, showMenu, showGame, showPause, hidePause, showGameOver, showEnding, refreshControls };
})();
