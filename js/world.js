'use strict';
/* =====================================================================
   Construction du monde à partir des plans (data.js)
   x = colonne, y = ligne du plan ; monde : X = x + 0.5, Z = y + 0.5
   Chaque étage est décalé verticalement de FLOOR_SEP mètres.
   ===================================================================== */
const WORLD = (() => {
  const FLOOR_SEP = 20;
  const WALL_CH = new Set(['#', 'W', ' ']);
  const FLOOR_CH = new Set(['.', ',', ':', '_', ';']);
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // N S O E
  const ROT = [0, Math.PI, Math.PI / 2, -Math.PI / 2]; // rotation pour que le dos (-z) soit vers la direction
  const NONBLOCK = new Set(['scratches', 'fusebox', 'dumbwaiter', 'portrait', 'drawing', 'candles', 'none', 'floor', 'hatch', 'ladderhole', 'note']);
  const STATIC_TYPES = new Set(['decor', 'hide', 'note', 'spawn']);
  let floors = [];
  let objects = [];
  let lamps = [];
  let root = null;
  let mats = null;

  const W = { floors, objects, lamps, FLOOR_SEP };

  function specFor(f, ch) {
    const L = FLOORS[f].legend;
    if (ch in L) return L[ch];
    if (ch === '+') return { type: 'door' };
    if (ch in DECOR) return DECOR[ch];
    return null;
  }

  function wallMatKey(f, ft) {
    if (ft === '.') return f === 2 ? 'b' : '.';
    return ft;
  }

  function parse() {
    floors.length = 0;
    FLOORS.forEach((F, f) => {
      const H = F.map.length, Wd = F.map[0].length;
      const cells = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
        const ch = F.map[y][x];
        cells.push({ x, y, ch, wall: WALL_CH.has(ch), ft: FLOOR_CH.has(ch) ? ch : null, obj: null, win: ch === 'W' });
      }
      floors.push({ idx: f, W: Wd, H, cells, ceil: F.ceil, y0: f * FLOOR_SEP, def: F.defFloor });
    });
    // types de sol dérivés
    floors.forEach(fl => {
      for (let pass = 0; pass < 3; pass++) fl.cells.forEach(c => {
        if (c.wall || c.ft) return;
        const cnt = {};
        DIRS.forEach(([dx, dy]) => { const n = cell(fl, c.x + dx, c.y + dy); if (n && n.ft && !n.wall && FLOOR_CH.has(n.ch)) cnt[n.ft] = (cnt[n.ft] || 0) + 2; else if (n && n.ft) cnt[n.ft] = (cnt[n.ft] || 0) + 1; });
        let best = null, bv = 0; for (const k in cnt) if (cnt[k] > bv) { bv = cnt[k]; best = k; }
        if (best && pass > 0) c.ft = best; else if (best && pass === 0 && bv >= 2) c.ft = best;
      });
      fl.cells.forEach(c => { if (!c.wall && !c.ft) c.ft = fl.def; });
    });
  }

  function cell(fl, x, y) { if (x < 0 || y < 0 || x >= fl.W || y >= fl.H) return null; return fl.cells[y * fl.W + x]; }
  function isWallAt(fl, x, y) { const c = cell(fl, x, y); return !c || c.wall; }

  function wallDir(fl, x, y) {
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIRS[d];
      if (isWallAt(fl, x + dx, y + dy) && !isWallAt(fl, x - dx, y - dy)) return d;
    }
    for (let d = 0; d < 4; d++) { const [dx, dy] = DIRS[d]; if (isWallAt(fl, x + dx, y + dy)) return d; }
    return -1;
  }

  /* ---------- objets ---------- */
  function makeObjects() {
    objects.length = 0;
    floors.forEach(fl => {
      const seen = new Set();
      fl.cells.forEach(c => {
        if (c.wall || FLOOR_CH.has(c.ch)) return;
        const spec = specFor(fl.idx, c.ch);
        if (!spec) return;
        if (seen.has(c.y * fl.W + c.x)) return;
        let rect = { x0: c.x, y0: c.y, x1: c.x, y1: c.y };
        if (spec.group) {
          // composante connexe -> rectangle englobant
          const stack = [c]; const comp = [];
          seen.add(c.y * fl.W + c.x);
          while (stack.length) {
            const k = stack.pop(); comp.push(k);
            DIRS.forEach(([dx, dy]) => { const n = cell(fl, k.x + dx, k.y + dy); if (n && n.ch === c.ch && !seen.has(n.y * fl.W + n.x)) { seen.add(n.y * fl.W + n.x); stack.push(n); } });
          }
          comp.forEach(k => { rect.x0 = Math.min(rect.x0, k.x); rect.x1 = Math.max(rect.x1, k.x); rect.y0 = Math.min(rect.y0, k.y); rect.y1 = Math.max(rect.y1, k.y); });
          comp.forEach(k => { k.objRef = true; });
        }
        const o = {
          uid: `${fl.idx}_${c.x}_${c.y}`, floor: fl.idx, x: c.x, y: c.y, ch: c.ch, spec, type: spec.type || 'decor',
          rect, cells: [], floorChar: c.ft, ceil: fl.ceil,
        };
        for (let yy = rect.y0; yy <= rect.y1; yy++) for (let xx = rect.x0; xx <= rect.x1; xx++) { const k = cell(fl, xx, yy); if (k.ch === c.ch) { k.obj = o; o.cells.push(k); } }
        o.cx = (rect.x0 + rect.x1) / 2 + 0.5; o.cz = (rect.y0 + rect.y1) / 2 + 0.5;
        // orientation
        if (o.type === 'door' || (o.type === 'custom' && spec.front) || o.type === 'secret') {
          const wN = isWallAt(fl, c.x, c.y - 1), wS = isWallAt(fl, c.x, c.y + 1);
          o.axis = (wN && wS) ? 'z' : 'x'; // 'x' : panneau le long de x, passage selon z
          o.rotY = o.axis === 'x' ? 0 : Math.PI / 2;
          if (spec.front) o.rotY = isWallAt(fl, c.x, c.y + 1) ? 0 : Math.PI; // dos vers l'extérieur
          if (o.type === 'secret') o.rotY = spec.rot || 0;
        } else if (spec.group) {
          // côté mur le long du rectangle
          let best = -1;
          const sides = [
            () => { for (let xx = rect.x0; xx <= rect.x1; xx++) if (isWallAt(fl, xx, rect.y0 - 1)) return true; return false; },
            () => { for (let xx = rect.x0; xx <= rect.x1; xx++) if (isWallAt(fl, xx, rect.y1 + 1)) return true; return false; },
            () => { for (let yy = rect.y0; yy <= rect.y1; yy++) if (isWallAt(fl, rect.x0 - 1, yy)) return true; return false; },
            () => { for (let yy = rect.y0; yy <= rect.y1; yy++) if (isWallAt(fl, rect.x1 + 1, yy)) return true; return false; },
          ];
          for (let d = 0; d < 4; d++) if (sides[d]()) { best = d; break; }
          const w = rect.x1 - rect.x0 + 1, h = rect.y1 - rect.y0 + 1;
          if (best < 0) { best = 0; }
          o.rotY = ROT[best];
          const swap = best >= 2;
          o.lw = swap ? h : w; o.ld = swap ? w : h;
          if (spec.model === 'table' || spec.model === 'covered') { o.rotY = 0; o.lw = w; o.ld = h; }
        } else {
          const d = (spec.wall || o.type === 'stairs' || o.type === 'hide' || o.type === 'pushable') ? wallDir(fl, c.x, c.y) : -1;
          o.dir = d;
          o.rotY = d >= 0 ? ROT[d] : 0;
          if (o.type === 'stairs' && (spec.dir === 'hatch' || spec.dir === 'ladder')) o.rotY = d >= 0 ? ROT[d] : 0;
        }
        // état initial
        if (o.type === 'door') { o.open = false; o.locked = !!spec.locked; o.anim = 0; o.swing = 1; o.doorId = o.uid; }
        if (o.type === 'pushable') { o.pushed = false; }
        objects.push(o);
      });
    });
    // liaisons escaliers
    const links = {};
    objects.filter(o => o.type === 'stairs').forEach(o => { (links[o.spec.link] = links[o.spec.link] || []).push(o); });
    for (const k in links) { const [a, b] = links[k]; if (a && b) { a.other = b; b.other = a; } }
    objects.filter(o => o.type === 'stairs').forEach(o => {
      const fl = floors[o.floor];
      let ax = o.x, ay = o.y;
      if (o.spec.dir === 'up' || o.spec.dir === 'down') {
        const d = wallDir(fl, o.x, o.y); const [dx, dy] = DIRS[d]; ax = o.x - dx; ay = o.y - dy;
        o.face = Math.atan2(-dx, -dy); // regard opposé au mur
        o.faceYaw = yawFromDir(-dx, -dy);
      } else {
        // trappe / échelle : arrivée sur une case voisine libre
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const n = cell(fl, o.x + dx, o.y + dy); if (n && !n.wall && !n.obj) { ax = n.x; ay = n.y; o.faceYaw = yawFromDir(dx, dy); break; } }
      }
      o.arrive = { x: ax + 0.5, z: ay + 0.5, cx: ax, cy: ay };
    });
  }
  // yaw : 0 = regarde -z (nord). direction (dx,dy) en grille
  function yawFromDir(dx, dy) { return Math.atan2(-dx, -dy); }

  function blocks(o) {
    switch (o.type) {
      case 'door': return !o.open;
      case 'secret': return !G.flag('secret');
      case 'spawn': return false;
      case 'pushable': return true;
      case 'stairs': return o.spec.dir === 'up' || o.spec.dir === 'down';
      case 'item': case 'note': case 'battery': case 'lamp':
        if (o.taken && (!o.spec.furn || o.spec.furn === 'none' || o.spec.furn === 'floor')) return false;
        if (!o.spec.furn || o.spec.furn === 'none' || o.spec.furn === 'floor') return !!(o.spec.model && !NONBLOCK.has(o.spec.model));
        return true;
      default: {
        const m = o.spec.model;
        if (m && NONBLOCK.has(m)) return false;
        if (o.spec.furn === 'none') return false;
        return true;
      }
    }
  }

  function isBlocked(f, x, y) {
    const fl = floors[f]; const c = cell(fl, x, y);
    if (!c || c.wall) return true;
    if (c.pushTarget) return true;
    if (c.obj) {
      if (c.obj.type === 'pushable') return c.obj.pushed ? false : true;
      return blocks(c.obj);
    }
    return false;
  }

  /* ---------- géométrie ---------- */
  function buildGeometry(fl, group) {
    const buckets = {}; // matKey -> arrays
    const B = k => buckets[k] || (buckets[k] = { pos: [], nor: [], uv: [], idx: [] });
    function quad(k, p0, p1, p2, p3, n, uvs) {
      const b = B(k); const i = b.pos.length / 3;
      b.pos.push(...p0, ...p1, ...p2, ...p3);
      for (let j = 0; j < 4; j++) b.nor.push(...n);
      b.uv.push(...uvs);
      b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
    const H = fl.ceil;
    fl.cells.forEach(c => {
      if (c.wall) {
        DIRS.forEach(([dx, dy], d) => {
          const n = cell(fl, c.x + dx, c.y + dy);
          if (!n || n.wall) return;
          const mk = 'w' + wallMatKey(fl.idx, n.ft);
          const x0 = c.x, x1 = c.x + 1, z0 = c.y, z1 = c.y + 1;
          let a, b2, nor, u0, u1;
          if (d === 0) { a = [x1, z0]; b2 = [x0, z0]; nor = [0, 0, -1]; u0 = x1; u1 = x0; } // face nord du mur (vers -z)
          if (d === 1) { a = [x0, z1]; b2 = [x1, z1]; nor = [0, 0, 1]; u0 = x0; u1 = x1; }
          if (d === 2) { a = [x0, z0]; b2 = [x0, z1]; nor = [-1, 0, 0]; u0 = z0; u1 = z1; }
          if (d === 3) { a = [x1, z1]; b2 = [x1, z0]; nor = [1, 0, 0]; u0 = z1; u1 = z0; }
          const s = 0.5;
          quad(mk, [a[0], 0, a[1]], [b2[0], 0, b2[1]], [b2[0], H, b2[1]], [a[0], H, a[1]], nor,
            [u0 * s, 0, u1 * s, 0, u1 * s, 1, u0 * s, 1]);
          if (c.win && fl.idx !== 0) {
            const m = MODELS.build('window');
            m.position.set(c.x + 0.5 + dx, 0, c.y + 0.5 + dy);
            m.rotation.y = ROT[[1, 0, 3, 2][d]];
            if (fl.idx === 3) { m.scale.set(0.7, 0.55, 1); m.position.y = 0.4; }
            m.userData.static = true;
            group.add(m);
            c.winFace = { x: c.x + 0.5 + dx * 0.5, z: c.y + 0.5 + dy * 0.5 };
          }
        });
      } else {
        const fk = 'f' + c.ft;
        const x0 = c.x, x1 = c.x + 1, z0 = c.y, z1 = c.y + 1, s = 0.5;
        quad(fk, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], [x0 * s, z1 * s, x1 * s, z1 * s, x1 * s, z0 * s, x0 * s, z0 * s]);
        const ck = fl.idx === 0 ? 'cCave' : fl.idx === 3 ? 'cAttic' : 'c';
        quad(ck, [x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1], [0, -1, 0], [x0 * s, z0 * s, x1 * s, z0 * s, x1 * s, z1 * s, x0 * s, z1 * s]);
      }
    });
    for (const k in buckets) {
      const b = buckets[k];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setIndex(b.idx);
      let mat;
      if (k[0] === 'w') mat = mats.wall[k.slice(1)] || mats.wall['.'];
      else if (k[0] === 'f') mat = mats.floor[k.slice(1)] || mats.floor['.'];
      else mat = k === 'cCave' ? mats.ceilCave : k === 'cAttic' ? mats.ceilAttic : mats.ceil;
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true; m.castShadow = k[0] === 'w';
      group.add(m);
    }
    // poutres du grenier
    if (fl.idx === 3) {
      for (let x = 2; x < fl.W - 1; x += 3) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, fl.H - 2), mats.woodRaw);
        b.position.set(x, H - 0.13, fl.H / 2); b.castShadow = true; b.userData.static = true; group.add(b);
      }
    }
    // tuyaux du sous-sol
    if (fl.idx === 0) {
      for (const z of [6.15, 6.35]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, fl.W - 2, 8), mats.metal); p.rotation.z = Math.PI / 2; p.position.set(fl.W / 2, H - 0.15, z); p.userData.static = true; group.add(p); }
    }
  }

  function placeObjectMesh(o) {
    const fl = floors[o.floor];
    if (o.group3) { o.group3.parent && o.group3.parent.remove(o.group3); o.group3.traverse(c => { if (c.isMesh && c.geometry && !c.geometry.parameters) c.geometry.dispose(); }); }
    const g = new THREE.Group();
    const spec = o.spec;
    const opts = { spec, floorChar: o.floorChar, lw: o.lw, ld: o.ld, ceil: fl.ceil, floor: o.floor };
    let surfaceY = 0;
    const isPick = ['item', 'note', 'battery', 'lamp'].includes(o.type);
    if (isPick && spec.furn && spec.furn !== 'none' && spec.furn !== 'floor') {
      surfaceY = { table: 0.79, desk: 0.79, crate: 0.75, workbench: 0.86, counter: 0.9, shelflow: 0.82, dresser: 0.9, dresserlow: 0.9 }[spec.furn] || 0.8;
      o.surfaceY = surfaceY;
      if (!o.furnGroup) {
        const fg = new THREE.Group(); fg.add(MODELS.build(spec.furn, opts));
        fg.position.set(o.cx, 0, o.cz); fg.rotation.y = o.rotY || 0; fg.userData.static = true;
        root.children[o.floor].add(fg); o.furnGroup = fg;
      }
    }
    if (o.type === 'door') {
      const m = MODELS.build('door', opts);
      g.add(m); o.pivot = m.userData.pivot;
      // linteau
      const ft = o.floorChar;
      const dh = spec.style === 'double' ? 2.45 : 2.2;
      const lint = new THREE.Mesh(new THREE.BoxGeometry(1, fl.ceil - dh, 1), mats.wall[wallMatKey(o.floor, ft)] || mats.wall['.']);
      lint.position.set(0, dh + (fl.ceil - dh) / 2, 0); lint.castShadow = true; g.add(lint);
      // chambranle
      for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.06, dh, 1.02), mats.woodDark); j.position.set(s * 0.5, dh / 2, 0); g.add(j); }
    } else if (o.type === 'secret') {
      const m = MODELS.build('secret', opts); g.add(m); o.pivot = m.userData.pivot;
    } else if (o.type === 'spawn') {
      // rien
    } else if (isPick) {
      if (!o.taken) {
        if (spec.model) g.add(MODELS.build(spec.model, Object.assign({ surfaceY }, opts)));
        else if (o.type === 'note') g.add(MODELS.build('note', { surfaceY }));
        else g.add(MODELS.build('item', { spec, surfaceY }));
      } else if (o.type === 'note' && spec.model) g.add(MODELS.build(spec.model, opts));
    } else if (o.type === 'stairs') {
      const name = spec.model || (spec.dir === 'up' ? 'stairsup' : 'stairsdown');
      g.add(MODELS.build(name, opts));
    } else {
      if (spec.furn && spec.furn !== 'none') g.add(MODELS.build(spec.furn, opts));
      if (spec.model) g.add(MODELS.build(spec.model, opts));
    }
    if (spec.model === 'rockinghorse') o.rock = g.children[0] && g.children[0].userData.rock;
    let px = o.cx, pz = o.cz;
    if (o.type === 'pushable' && o.pushed) { px += spec.to[0]; pz += spec.to[1]; }
    g.position.set(px, 0, pz);
    g.rotation.y = o.rotY || 0;
    if ((spec.model === 'crate' || spec.model === 'barrel') && !spec.wall) g.rotation.y = (o.x * 7 + o.y * 13) % 6;
    root.children[o.floor].add(g);
    o.group3 = g;
    if (STATIC_TYPES.has(o.type) && spec.model !== 'rockinghorse') g.userData.static = true;
    if (o.type === 'door') updateDoorMesh(o, true);
    if (o.type === 'secret') o.pivot.position.x = G.flag('secret') ? 0.95 : 0;
  }

  function updateDoorMesh(o, snap) {
    if (!o.pivot) return;
    const target = o.open ? 1 : 0;
    if (snap) o.anim = target;
    o.pivot.rotation.y = -o.anim * (Math.PI / 2 - 0.15) * o.swing;
  }

  /* ---------- éclairage ---------- */
  function makeLamps() {
    lamps.length = 0;
    floors.forEach(fl => {
      const F = FLOORS[fl.idx];
      if (F.lights === 'power') {
        // régions (séparées par murs et portes)
        const reg = new Int32Array(fl.W * fl.H).fill(-1);
        let rid = 0;
        fl.cells.forEach(c => {
          if (c.wall || reg[c.y * fl.W + c.x] >= 0) return;
          if (c.obj && (c.obj.type === 'door' || c.obj.type === 'secret' || c.obj.spec.front)) return;
          const comp = []; const st = [c]; reg[c.y * fl.W + c.x] = rid;
          while (st.length) {
            const k = st.pop(); comp.push(k);
            DIRS.forEach(([dx, dy]) => {
              const n = cell(fl, k.x + dx, k.y + dy);
              if (!n || n.wall || reg[n.y * fl.W + n.x] >= 0) return;
              if (n.obj && (n.obj.type === 'door' || n.obj.type === 'secret' || n.obj.spec.front)) return;
              reg[n.y * fl.W + n.x] = rid; st.push(n);
            });
          }
          rid++;
          let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
          comp.forEach(k => { x0 = Math.min(x0, k.x); x1 = Math.max(x1, k.x); y0 = Math.min(y0, k.y); y1 = Math.max(y1, k.y); });
          const w = x1 - x0 + 1, h = y1 - y0 + 1;
          const nx = Math.max(1, Math.round(w / 9)), ny = Math.max(1, Math.round(h / 9));
          for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
            const tx = x0 + (i + 0.5) * w / nx, ty = y0 + (j + 0.5) * h / ny;
            // case de la composante la plus proche
            let best = null, bd = 1e9; comp.forEach(k => { const d = (k.x + 0.5 - tx) ** 2 + (k.y + 0.5 - ty) ** 2; if (d < bd) { bd = d; best = k; } });
            lamps.push({ floor: fl.idx, x: best.x + 0.5, z: best.y + 0.5, y: fl.y0 + fl.ceil - 0.5, kind: 'ceil', need: 'power', phase: Math.random() * 100, broken: Math.random() < 0.18 });
          }
        });
      }
    });
    objects.forEach(o => { if (o.spec.light === 'candle') lamps.push({ floor: o.floor, x: o.cx, z: o.cz, y: floors[o.floor].y0 + 0.35, kind: 'candle', need: null, phase: Math.random() * 100 }); });
    lamps.forEach(l => {
      if (l.kind === 'ceil') {
        l.mesh = MODELS.B.ceilLamp(floors[l.floor].ceil, false);
        l.mesh.position.set(l.x, 0, l.z);
        root.children[l.floor].add(l.mesh);
      }
    });
  }

  function refreshLampMeshes(power) {
    lamps.forEach(l => { if (l.mesh) l.mesh.userData.bulb.material = (power && !l.dead) ? mats.lampOn : mats.lampOff; });
  }

  function build(scene, m) {
    mats = m;
    if (root) scene.remove(root);
    root = new THREE.Group(); scene.add(root);
    parse();
    floors.forEach(fl => { const g = new THREE.Group(); g.position.y = fl.y0; root.add(g); fl.group = new THREE.Group(); });
    floors.forEach(fl => buildGeometry(fl, root.children[fl.idx]));
    makeObjects();
    W.root = root;
  }
  // placement des meshes d'objets (après application de l'état sauvegardé)
  function placeAll() {
    objects.forEach(o => {
      if (o.floor === undefined) return;
      placeObjectMesh(o);
    });
    makeLamps();
    mergeStatic();
  }

  function refresh(o) { placeObjectMesh(o); }

  /* Fusion des géométries statiques par matériau (réduit fortement les appels de rendu) */
  function mergeStatic() {
    root.children.forEach(fg => {
      fg.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(fg.matrixWorld).invert();
      const buckets = new Map();
      const statics = fg.children.filter(c => c.userData.static);
      statics.forEach(sg => {
        sg.updateMatrixWorld(true);
        sg.traverse(m => {
          if (!m.isMesh || !m.geometry.attributes.position) return;
          const mtx = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
          const k = m.material.uuid;
          if (!buckets.has(k)) buckets.set(k, { mat: m.material, list: [] });
          buckets.get(k).list.push({ geo: m.geometry, mtx, cast: m.castShadow });
        });
        fg.remove(sg);
      });
      buckets.forEach(({ mat, list }) => {
        let nv = 0, ni = 0;
        list.forEach(({ geo }) => { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
        const idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
        let vo = 0, io = 0;
        const v = new THREE.Vector3(), nm = new THREE.Matrix3();
        list.forEach(({ geo, mtx }) => {
          const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
          nm.getNormalMatrix(mtx);
          for (let i = 0; i < P.count; i++) {
            v.fromBufferAttribute(P, i).applyMatrix4(mtx); pos.set([v.x, v.y, v.z], (vo + i) * 3);
            if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
            if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
          }
          if (geo.index) for (let i = 0; i < geo.index.count; i++) idx[io++] = geo.index.getX(i) + vo;
          else for (let i = 0; i < P.count; i++) idx[io++] = i + vo;
          vo += P.count;
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, mat);
        mesh.castShadow = list.some(l => l.cast); mesh.receiveShadow = true;
        fg.add(mesh);
      });
    });
  }

  function cellAt(f, wx, wz) { return cell(floors[f], Math.floor(wx), Math.floor(wz)); }

  // ligne de vue sur la grille (murs, portes fermées, gros meubles hauts)
  function los(f, ax, az, bx, bz, ignoreObj) {
    const fl = floors[f];
    const dx = bx - ax, dz = bz - az; const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist * 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps; const x = ax + dx * t, z = az + dz * t;
      const c = cell(fl, Math.floor(x), Math.floor(z));
      if (!c || c.wall) return false;
      if (c.obj && c.obj !== ignoreObj) {
        const o = c.obj;
        if (o.type === 'door' && !o.open) return false;
        if (o.type === 'secret' && !G.flag('secret')) return false;
        if (o.type === 'hide' || o.type === 'pushable' || o.spec.model === 'shelf' || o.spec.model === 'boiler' || o.spec.front) return false;
      }
    }
    return true;
  }

  Object.assign(W, { build, placeAll, refresh, isBlocked, cell, cellAt, los, updateDoorMesh, refreshLampMeshes, DIRS, yawFromDir, blocks });
  return W;
})();
