'use strict';
/* =====================================================================
   Textures procédurales (générées au lancement, aucune image externe)
   ===================================================================== */
const TEX = (() => {
  let seed = 1234567;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => a + rand() * (b - a);

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function grain(ctx, w, h, amount) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }
  function blotches(ctx, w, h, n, rgba, rmin, rmax) {
    for (let i = 0; i < n; i++) {
      const x = R(0, w), y = R(0, h), r = R(rmin, rmax);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function drips(ctx, w, h, n, color) {
    ctx.strokeStyle = color;
    for (let i = 0; i < n; i++) {
      const x = R(0, w); let y = R(0, h * 0.3);
      ctx.lineWidth = R(1, 5); ctx.globalAlpha = R(0.05, 0.25);
      ctx.beginPath(); ctx.moveTo(x, y);
      const len = R(h * 0.2, h * 0.8);
      ctx.lineTo(x + R(-6, 6), y + len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function toTex(c, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  /* ---- Papier peint (2 m de large × hauteur du mur) avec lambris ---- */
  function wallpaper(base, motif, wains) {
    const w = 512, h = 768, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    // rayures
    for (let i = 0; i < w; i += 64) { x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(i, 0, 22, h); }
    // motif damassé
    x.fillStyle = motif;
    for (let yy = 30; yy < h * 0.66; yy += 90) {
      for (let xx = 0; xx <= w; xx += 128) {
        const ox = ((yy / 90) | 0) % 2 ? 64 : 0;
        x.save(); x.translate(xx + ox, yy);
        x.beginPath(); x.ellipse(0, 0, 14, 26, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(-16, 10, 8, 14, -0.6, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(16, 10, 8, 14, 0.6, 0, Math.PI * 2); x.fill();
        x.fillRect(-2, 20, 4, 22);
        x.restore();
      }
    }
    // lambris bas (30 %)
    const wy = h * 0.68;
    x.fillStyle = wains; x.fillRect(0, wy, w, h - wy);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, wy, w, 8);
    x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, wy + 8, w, 3);
    for (let i = 0; i < w; i += 128) {
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 4;
      x.strokeRect(i + 14, wy + 30, 100, h - wy - 60);
      x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 2;
      x.strokeRect(i + 18, wy + 34, 92, h - wy - 68);
    }
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, h - 22, w, 22);
    // dégâts
    blotches(x, w, h, 14, 'rgba(60,45,20,0.35)', 30, 120);
    drips(x, w, h, 30, '#2a2010');
    // décollements
    for (let i = 0; i < 4; i++) {
      x.fillStyle = 'rgba(150,140,115,0.12)';
      const px = R(0, w), py = R(0, wy - 80);
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + R(20, 60), py + R(-10, 10)); x.lineTo(px + R(10, 40), py + R(40, 120)); x.closePath(); x.fill();
    }
    grain(x, w, h, 26);
    return c;
  }

  function stone() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#3a352f'; x.fillRect(0, 0, w, h);
    let yy = 0;
    while (yy < h) {
      const bh = R(40, 80); let xx = -R(0, 60);
      while (xx < w) {
        const bw = R(60, 140);
        const v = R(55, 95) | 0;
        x.fillStyle = `rgb(${v + 8},${v + 2},${v - 6})`;
        x.fillRect(xx + 3, yy + 3, bw - 6, bh - 6);
        blotches(x, 0, 0, 0);
        xx += bw;
      }
      yy += bh;
    }
    blotches(x, w, h, 30, 'rgba(20,30,10,0.35)', 20, 90);
    blotches(x, w, h, 20, 'rgba(0,0,0,0.4)', 10, 60);
    drips(x, w, h, 20, '#101008');
    grain(x, w, h, 40);
    return c;
  }

  function tileWall() {
    const w = 512, h = 768, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#9c968a'; x.fillRect(0, 0, w, h);
    const ty = h * 0.45;
    for (let yy = ty; yy < h; yy += 32) for (let xx = 0; xx < w; xx += 32) {
      const v = R(170, 200) | 0;
      x.fillStyle = `rgb(${v},${v - 4},${v - 14})`; x.fillRect(xx + 1, yy + 1, 30, 30);
    }
    x.fillStyle = '#3c5a50'; x.fillRect(0, ty - 10, w, 10);
    blotches(x, w, h, 30, 'rgba(70,55,25,0.35)', 20, 100);
    drips(x, w, h, 40, '#3a2a10');
    grain(x, w, h, 24);
    return c;
  }

  function plankWall() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    for (let i = 0; i < w; i += 64) {
      const v = R(50, 75) | 0;
      x.fillStyle = `rgb(${v + 20},${v + 8},${v - 6})`; x.fillRect(i, 0, 64, h);
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(i, 0, 3, h);
      for (let k = 0; k < 18; k++) {
        x.strokeStyle = `rgba(0,0,0,${R(0.05, 0.2)})`; x.lineWidth = R(0.5, 2);
        x.beginPath(); const gx = i + R(4, 60); x.moveTo(gx, 0); x.bezierCurveTo(gx + R(-6, 6), h / 3, gx + R(-6, 6), h * 2 / 3, gx + R(-4, 4), h); x.stroke();
      }
    }
    blotches(x, w, h, 16, 'rgba(0,0,0,0.35)', 20, 80);
    grain(x, w, h, 30);
    return c;
  }

  function parquet(dark) {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    const pw = 64;
    for (let i = 0; i < w; i += pw) {
      let yy = -R(0, 200);
      while (yy < h) {
        const len = R(160, 320);
        const v = R(dark ? 40 : 70, dark ? 60 : 100) | 0;
        x.fillStyle = `rgb(${v + 30},${v + 12},${v - 8})`;
        x.fillRect(i, yy, pw, len);
        for (let k = 0; k < 10; k++) {
          x.strokeStyle = `rgba(0,0,0,${R(0.05, 0.2)})`; x.lineWidth = R(0.5, 2);
          x.beginPath(); const gx = i + R(3, pw - 3); x.moveTo(gx, yy); x.lineTo(gx + R(-3, 3), yy + len); x.stroke();
        }
        x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(i, yy, pw, 2);
        yy += len;
      }
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(i, 0, 2, h);
    }
    blotches(x, w, h, 18, 'rgba(0,0,0,0.3)', 30, 120);
    blotches(x, w, h, 8, 'rgba(200,190,160,0.08)', 30, 120);
    grain(x, w, h, 22);
    return c;
  }

  function checker() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    const s = 64;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const black = (i + j) % 2;
      const v = black ? R(28, 40) : R(150, 175);
      x.fillStyle = `rgb(${v | 0},${(v - 4) | 0},${(v - 10) | 0})`;
      x.fillRect(i * s, j * s, s, s);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(i * s, j * s, s, 2); x.fillRect(i * s, j * s, 2, s);
    }
    blotches(x, w, h, 30, 'rgba(60,45,20,0.3)', 20, 100);
    // fissures
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) { x.beginPath(); let px = R(0, w), py = R(0, h); x.moveTo(px, py); for (let n = 0; n < 6; n++) { px += R(-30, 30); py += R(-30, 30); x.lineTo(px, py); } x.stroke(); }
    grain(x, w, h, 20);
    return c;
  }

  function flagstone() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#1e1c19'; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < h; yy += 128) for (let xx = 0; xx < w; xx += 128) {
      const v = R(50, 80) | 0;
      x.fillStyle = `rgb(${v + 4},${v},${v - 6})`;
      x.beginPath(); x.moveTo(xx + R(3, 8), yy + R(3, 8)); x.lineTo(xx + 128 - R(3, 8), yy + R(3, 8)); x.lineTo(xx + 128 - R(3, 8), yy + 128 - R(3, 8)); x.lineTo(xx + R(3, 8), yy + 128 - R(3, 8)); x.fill();
    }
    blotches(x, w, h, 40, 'rgba(0,0,0,0.35)', 20, 90);
    blotches(x, w, h, 10, 'rgba(40,50,20,0.3)', 20, 60);
    grain(x, w, h, 36);
    return c;
  }

  function carpet() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#4a1414'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(150,110,50,0.35)'; x.lineWidth = 6;
    for (let i = 0; i < w; i += 128) for (let j = 0; j < h; j += 128) {
      x.beginPath(); x.moveTo(i + 64, j + 14); x.lineTo(i + 114, j + 64); x.lineTo(i + 64, j + 114); x.lineTo(i + 14, j + 64); x.closePath(); x.stroke();
      x.fillStyle = 'rgba(20,30,50,0.4)'; x.beginPath(); x.arc(i + 64, j + 64, 12, 0, 7); x.fill();
    }
    blotches(x, w, h, 25, 'rgba(0,0,0,0.4)', 20, 110);
    grain(x, w, h, 30);
    return c;
  }

  function atticFloor() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j += 42) {
      const v = R(45, 70) | 0;
      x.fillStyle = `rgb(${v + 24},${v + 12},${v})`; x.fillRect(0, j, w, 42);
      x.fillStyle = 'rgba(0,0,0,0.7)'; x.fillRect(0, j, w, 3);
      for (let k = 0; k < 8; k++) { x.strokeStyle = `rgba(0,0,0,${R(0.1, 0.25)})`; x.beginPath(); const gy = j + R(4, 40); x.moveTo(0, gy); x.lineTo(w, gy + R(-3, 3)); x.stroke(); }
      for (let k = 0; k < 3; k++) { x.fillStyle = '#111'; x.beginPath(); x.arc(R(0, w), j + 8, 2, 0, 7); x.fill(); }
    }
    blotches(x, w, h, 30, 'rgba(160,150,130,0.12)', 30, 100); // poussière
    grain(x, w, h, 30);
    return c;
  }

  function plaster() {
    const w = 512, h = 512, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#8a857a'; x.fillRect(0, 0, w, h);
    blotches(x, w, h, 30, 'rgba(80,60,30,0.3)', 30, 150);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1;
    for (let k = 0; k < 8; k++) { x.beginPath(); let px = R(0, w), py = R(0, h); x.moveTo(px, py); for (let n = 0; n < 8; n++) { px += R(-25, 25); py += R(-25, 25); x.lineTo(px, py); } x.stroke(); }
    grain(x, w, h, 18);
    return c;
  }

  function woodDark() {
    const w = 256, h = 256, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#2e1d12'; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) {
      x.strokeStyle = `rgba(${R(0, 1) > 0.5 ? '90,60,35' : '0,0,0'},${R(0.1, 0.35)})`; x.lineWidth = R(0.5, 3);
      x.beginPath(); const gy = R(0, h); x.moveTo(0, gy); x.bezierCurveTo(w / 3, gy + R(-8, 8), w * 2 / 3, gy + R(-8, 8), w, gy + R(-5, 5)); x.stroke();
    }
    grain(x, w, h, 20);
    return c;
  }
  function woodRaw() {
    const w = 256, h = 256, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#6b5236'; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 50; k++) {
      x.strokeStyle = `rgba(30,20,10,${R(0.1, 0.35)})`; x.lineWidth = R(0.5, 2.5);
      x.beginPath(); const gy = R(0, h); x.moveTo(0, gy); x.lineTo(w, gy + R(-6, 6)); x.stroke();
    }
    blotches(x, w, h, 10, 'rgba(0,0,0,0.3)', 10, 50);
    grain(x, w, h, 26);
    return c;
  }
  function fabric(col) {
    const w = 256, h = 256, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = col; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(i, 0, 1, h); x.fillRect(0, i, w, 1); }
    blotches(x, w, h, 12, 'rgba(70,50,20,0.25)', 10, 60);
    grain(x, w, h, 18);
    return c;
  }
  function metal() {
    const w = 256, h = 256, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#4a4744'; x.fillRect(0, 0, w, h);
    blotches(x, w, h, 30, 'rgba(110,50,20,0.45)', 8, 50);
    blotches(x, w, h, 10, 'rgba(0,0,0,0.4)', 8, 40);
    grain(x, w, h, 30);
    return c;
  }
  function burlap() {
    const w = 256, h = 256, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#6e5a3c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(i, 0, 2, h); x.fillRect(0, i, w, 2); }
    blotches(x, w, h, 10, 'rgba(60,10,5,0.45)', 6, 30);
    grain(x, w, h, 30);
    return c;
  }
  function paper() {
    const w = 128, h = 160, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#cfc4a6'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(30,30,60,0.6)'; x.lineWidth = 1;
    for (let j = 20; j < h - 10; j += 9) { x.beginPath(); x.moveTo(12, j); for (let i = 12; i < w - 12; i += 6) x.lineTo(i, j + R(-1.5, 1.5)); x.stroke(); }
    blotches(x, w, h, 6, 'rgba(100,70,20,0.3)', 6, 30);
    grain(x, w, h, 20);
    return c;
  }
  function portrait(i) {
    const w = 192, h = 256, c = cv(w, h), x = c.getContext('2d');
    const bg = ['#2a2418', '#1f2422', '#241a1a', '#2a2a30'][i];
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    blotches(x, w, h, 6, 'rgba(120,90,50,0.25)', 20, 80);
    const skin = '#a88e72';
    x.fillStyle = ['#1a1410', '#2a1a20', '#151515', '#ddd8cc'][i];
    x.beginPath(); x.ellipse(w / 2, h * 0.95, 80, 90, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = skin; x.beginPath(); x.ellipse(w / 2, h * 0.42, 34, 44, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = ['#555', '#3a2a1a', '#20160f', '#6a4a2a'][i];
    x.beginPath(); x.ellipse(w / 2, h * 0.32, 38, 26, 0, Math.PI, 0); x.fill();
    if (i === 3) { x.fillRect(w / 2 - 40, h * 0.32, 12, 70); x.fillRect(w / 2 + 28, h * 0.32, 12, 70); }
    x.fillStyle = '#111';
    if (i === 2) { x.fillStyle = '#000'; x.fillRect(w / 2 - 26, h * 0.38, 52, 12); }
    else { x.fillRect(w / 2 - 16, h * 0.4, 8, 4); x.fillRect(w / 2 + 8, h * 0.4, 8, 4); }
    if (i === 0) { x.fillStyle = '#777'; x.fillRect(w / 2 - 14, h * 0.5, 28, 5); }
    x.fillStyle = '#3a1a1a'; x.fillRect(w / 2 - 8, h * 0.53, 16, 2);
    blotches(x, w, h, 10, 'rgba(0,0,0,0.35)', 10, 60);
    grain(x, w, h, 28);
    return c;
  }
  function drawing() {
    const w = 256, h = 192, c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#e8e0cc'; x.fillRect(0, 0, w, h);
    x.lineWidth = 4;
    x.strokeStyle = '#c02020'; x.beginPath(); x.arc(60, 90, 30, 0, 7); x.stroke();
    x.strokeStyle = '#2040b0'; x.beginPath(); x.moveTo(110, 60); x.lineTo(150, 120); x.lineTo(110, 120); x.closePath(); x.stroke();
    x.strokeStyle = '#d0a020'; x.beginPath(); x.arc(200, 90, 26, 0, 7); x.stroke();
    x.strokeStyle = '#333'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(20, 170); x.lineTo(240, 170); x.stroke();
    grain(x, w, h, 16);
    return c;
  }
  function moonWindow() {
    const w = 128, h = 192, c = cv(w, h), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2c3a52'); g.addColorStop(1, '#0c121c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // silhouettes d'arbres
    x.fillStyle = '#05070a';
    for (let i = 0; i < 6; i++) { const tx = R(0, w); x.beginPath(); x.moveTo(tx, h); x.lineTo(tx + R(-8, 8), h * R(0.2, 0.5)); x.lineTo(tx + 10, h); x.fill(); }
    grain(x, w, h, 18);
    return c;
  }

  const mats = {};
  function std(map, opts = {}) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.9, metalness: 0 }, opts));
    if (opts.bump !== false && map) { m.bumpMap = map; m.bumpScale = opts.bumpScale || 0.015; }
    delete m.bump;
    return m;
  }

  function build() {
    const t = {
      wallGreen: toTex(wallpaper('#4f5a44', 'rgba(30,38,25,0.55)', '#2b1c12')),
      wallRed: toTex(wallpaper('#5a2e2a', 'rgba(35,15,15,0.5)', '#24160e')),
      wallBlue: toTex(wallpaper('#3d4a58', 'rgba(20,25,35,0.5)', '#2a1d14')),
      stone: toTex(stone(), 1, 1),
      tileWall: toTex(tileWall()),
      plank: toTex(plankWall()),
      parquet: toTex(parquet(false)),
      parquetDark: toTex(parquet(true)),
      checker: toTex(checker()),
      flag: toTex(flagstone()),
      carpet: toTex(carpet()),
      attic: toTex(atticFloor()),
      plaster: toTex(plaster()),
      woodDark: toTex(woodDark()),
      woodRaw: toTex(woodRaw()),
      fabricW: toTex(fabric('#a39a86')),
      fabricR: toTex(fabric('#5a2020')),
      fabricG: toTex(fabric('#3b4232')),
      metal: toTex(metal()),
      burlap: toTex(burlap()),
      paper: toTex(paper()),
      drawing: toTex(drawing()),
      moon: toTex(moonWindow()),
      portraits: [0, 1, 2, 3].map(i => toTex(portrait(i))),
    };
    mats.wall = {
      '.': std(t.wallGreen, { bumpScale: 0.02 }),
      '_': std(t.wallRed, { bumpScale: 0.02 }),
      ',': std(t.tileWall, { roughness: 0.6 }),
      ':': std(t.stone, { bumpScale: 0.06 }),
      ';': std(t.plank, { bumpScale: 0.04 }),
      'b': std(t.wallBlue, { bumpScale: 0.02 }),
    };
    mats.floor = {
      '.': std(t.parquet, { roughness: 0.7 }),
      '_': std(t.carpet, { roughness: 1 }),
      ',': std(t.checker, { roughness: 0.5 }),
      ':': std(t.flag, { bumpScale: 0.05 }),
      ';': std(t.attic, { bumpScale: 0.03 }),
    };
    mats.ceil = std(t.plaster, { bumpScale: 0.02 });
    mats.ceilCave = std(t.stone, { bumpScale: 0.05 });
    mats.ceilAttic = std(t.plank, { bumpScale: 0.03 });
    mats.woodDark = std(t.woodDark, { roughness: 0.75 });
    mats.woodRaw = std(t.woodRaw);
    mats.fabricW = std(t.fabricW, { roughness: 1 });
    mats.fabricR = std(t.fabricR, { roughness: 1 });
    mats.fabricG = std(t.fabricG, { roughness: 1 });
    mats.metal = std(t.metal, { roughness: 0.6, metalness: 0.5 });
    mats.iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.8 });
    mats.brass = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.35, metalness: 0.9 });
    mats.burlap = std(t.burlap, { roughness: 1, bumpScale: 0.03 });
    mats.paper = new THREE.MeshStandardMaterial({ map: t.paper, roughness: 1, emissive: 0x111008 });
    mats.drawing = new THREE.MeshStandardMaterial({ map: t.drawing, roughness: 1 });
    mats.porcelain = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.3 });
    mats.black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    mats.coat = new THREE.MeshStandardMaterial({ color: 0x16130f, roughness: 0.95 });
    mats.skin = new THREE.MeshStandardMaterial({ color: 0x8c7660, roughness: 0.8 });
    mats.water = new THREE.MeshStandardMaterial({ color: 0x0a0d06, roughness: 0.05, metalness: 0.3 });
    mats.glassMoon = new THREE.MeshBasicMaterial({ map: t.moon, color: 0x7788aa });
    mats.flame = new THREE.MeshBasicMaterial({ color: 0xffb050 });
    mats.wax = new THREE.MeshStandardMaterial({ color: 0xd8ceb0, roughness: 0.6, emissive: 0x201505 });
    mats.lampOn = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 2 });
    mats.lampOff = new THREE.MeshStandardMaterial({ color: 0x555044, roughness: 0.4 });
    mats.books = [0x4a1a14, 0x1e2a3a, 0x2a3a20, 0x5a4a2a, 0x2a1a2a, 0x3a3020].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    mats.portraits = t.portraits.map(m => new THREE.MeshStandardMaterial({ map: m, roughness: 0.8 }));
    mats.tex = t;
    return mats;
  }

  return { build, mats };
})();
