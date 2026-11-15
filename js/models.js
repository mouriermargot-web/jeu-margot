'use strict';
/* =====================================================================
   Modèles 3D procéduraux. Origine = centre de la case au sol.
   L'avant regarde +z ; le dos (côté mur) est à -z (z = -0.5 = mur).
   ===================================================================== */
const MODELS = (() => {
  let M; // matériaux
  const geoCache = {};
  function boxGeo(w, h, d) {
    const k = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
    return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d));
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0, g) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    if (g) g.add(m);
    return m;
  }
  // box posé : y = bas de la boîte
  function box(g, w, h, d, mat, x, y, z) { return mesh(boxGeo(w, h, d), mat, x, y + h / 2, z, g); }
  function cyl(g, rt, rb, h, mat, x, y, z, seg = 14) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z, g); }

  const B = {};

  B.shelf = (o) => {
    const g = new THREE.Group();
    const cave = o.floorChar === ':';
    const mat = cave ? M.metal : M.woodDark;
    const H = 2.1, W = 0.95, D = 0.38, z = -0.5 + D / 2 + 0.01;
    box(g, 0.04, H, D, mat, -W / 2, 0, z); box(g, 0.04, H, D, mat, W / 2, 0, z);
    box(g, W, H, 0.02, mat, 0, 0, -0.5 + 0.02);
    for (let i = 0; i < 5; i++) {
      const y = 0.08 + i * 0.48;
      box(g, W, 0.03, D, mat, 0, y, z);
      if (i < 4) {
        let x = -W / 2 + 0.05;
        while (x < W / 2 - 0.08) {
          if (cave) {
            if (Math.random() < 0.5) { cyl(g, 0.035, 0.035, 0.3, M.black, x + 0.04, y + 0.03, z, 8); x += 0.1; }
            else { box(g, 0.2, 0.18, 0.25, M.woodRaw, x + 0.1, y + 0.03, z); x += 0.24; }
          } else {
            const bw = 0.03 + Math.random() * 0.05, bh = 0.26 + Math.random() * 0.14;
            if (Math.random() < 0.88) box(g, bw, bh, 0.24 + Math.random() * 0.06, M.books[(Math.random() * 6) | 0], x + bw / 2, y + 0.03, z + 0.02);
            x += bw + 0.004;
          }
        }
      }
    }
    return g;
  };
  B.shelflow = (o) => {
    const g = new THREE.Group();
    const z = -0.5 + 0.22;
    box(g, 0.9, 0.04, 0.42, M.woodRaw, 0, 0.78, z);
    box(g, 0.9, 0.04, 0.42, M.woodRaw, 0, 0.3, z);
    [-0.42, 0.42].forEach(x => box(g, 0.04, 0.82, 0.42, M.woodRaw, x, 0, z));
    return g;
  };
  B.crate = () => {
    const g = new THREE.Group();
    const s = 0.7 + Math.random() * 0.15;
    const c = box(g, s, s, s, M.woodRaw, 0, 0, 0);
    c.rotation.y = (Math.random() - 0.5) * 0.4;
    if (Math.random() < 0.5) { const c2 = box(g, s * 0.7, s * 0.6, s * 0.7, M.woodRaw, 0.05, s, 0); c2.rotation.y = Math.random(); }
    return g;
  };
  B.barrel = () => {
    const g = new THREE.Group();
    cyl(g, 0.3, 0.3, 0.9, M.woodRaw, 0, 0, 0, 16);
    cyl(g, 0.33, 0.33, 0.05, M.iron, 0, 0.12, 0, 16);
    cyl(g, 0.33, 0.33, 0.05, M.iron, 0, 0.73, 0, 16);
    return g;
  };
  B.bed = (o) => {
    const g = new THREE.Group();
    const W = o.lw - 0.15, D = o.ld - 0.1;
    box(g, W, 0.35, D, M.woodDark, 0, 0, 0);
    box(g, W - 0.06, 0.22, D - 0.1, M.fabricW, 0, 0.35, 0.03);
    box(g, W - 0.04, 0.06, D * 0.6, M.fabricR, 0, 0.56, D * 0.18);
    box(g, W * 0.7, 0.1, 0.32, M.fabricW, 0, 0.57, -D / 2 + 0.3);
    box(g, W, 1.15, 0.07, M.woodDark, 0, 0, -D / 2);
    box(g, W, 0.6, 0.06, M.woodDark, 0, 0, D / 2);
    return g;
  };
  B.mattress = (o) => {
    const g = new THREE.Group();
    box(g, o.lw - 0.2, 0.18, o.ld - 0.2, M.fabricW, 0, 0, 0);
    box(g, (o.lw - 0.2) * 0.8, 0.05, (o.ld - 0.2) * 0.5, M.fabricG, 0.1, 0.18, 0.2);
    return g;
  };
  B.table = (o) => {
    const g = new THREE.Group();
    const W = (o.lw || 1) - 0.1, D = (o.ld || 1) - 0.1;
    box(g, W, 0.05, D, M.woodDark, 0, 0.74, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.06, 0.74, 0.06, M.woodDark, a * (W / 2 - 0.06), 0, b * (D / 2 - 0.06)));
    if (W > 2) { // table de salle à manger : chaises
      for (let x = -W / 2 + 0.6; x < W / 2 - 0.3; x += 0.9) for (const s of [-1, 1]) B.chairOn(g, x, s * (D / 2 + 0.3), s > 0 ? Math.PI : 0);
      // chandelier, vaisselle
      cyl(g, 0.06, 0.1, 0.35, M.brass, 0, 0.79, 0);
      for (let x = -W / 2 + 0.6; x < W / 2 - 0.3; x += 0.9) for (const s of [-1, 1]) cyl(g, 0.12, 0.1, 0.02, M.porcelain, x, 0.79, s * (D / 2 - 0.25));
    }
    return g;
  };
  B.chairOn = (g, x, z, ry) => {
    const c = new THREE.Group();
    box(c, 0.42, 0.04, 0.42, M.woodDark, 0, 0.45, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(c, 0.04, 0.45, 0.04, M.woodDark, a * 0.18, 0, b * 0.18));
    box(c, 0.42, 0.5, 0.04, M.woodDark, 0, 0.49, -0.19);
    c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  };
  B.desk = () => {
    const g = new THREE.Group();
    box(g, 0.95, 0.05, 0.8, M.woodDark, 0, 0.74, 0);
    box(g, 0.3, 0.74, 0.75, M.woodDark, -0.32, 0, 0);
    box(g, 0.3, 0.74, 0.75, M.woodDark, 0.32, 0, 0);
    return g;
  };
  B.dresser = () => {
    const g = new THREE.Group();
    const z = -0.5 + 0.25;
    box(g, 0.95, 0.9, 0.48, M.woodDark, 0, 0, z);
    for (let i = 0; i < 3; i++) { box(g, 0.85, 0.02, 0.02, M.black, 0, 0.25 + i * 0.25, z + 0.25); box(g, 0.08, 0.03, 0.03, M.brass, 0, 0.17 + i * 0.25, z + 0.26); }
    if (Math.random() < 0.6) { cyl(g, 0.04, 0.07, 0.3, M.porcelain, 0.3, 0.9, z); }
    return g;
  };
  B.dresserlow = B.dresser;
  B.wardrobe = (o) => {
    const g = new THREE.Group();
    const z = -0.5 + 0.3;
    box(g, 0.95, 2.1, 0.58, M.woodDark, 0, 0, z);
    box(g, 1.0, 0.08, 0.62, M.woodDark, 0, 2.1, z);
    box(g, 0.01, 1.8, 0.01, M.black, 0, 0.15, z + 0.3);
    box(g, 0.03, 0.12, 0.03, M.brass, -0.06, 1.0, z + 0.3);
    box(g, 0.03, 0.12, 0.03, M.brass, 0.06, 1.0, z + 0.3);
    for (let i = 0; i < 6; i++) box(g, 0.36, 0.015, 0.02, M.black, -0.24, 1.25 + i * 0.07, z + 0.3); // fentes
    for (let i = 0; i < 6; i++) box(g, 0.36, 0.015, 0.02, M.black, 0.24, 1.25 + i * 0.07, z + 0.3);
    return g;
  };
  B.sofa = (o) => {
    const g = new THREE.Group();
    const W = o.lw - 0.1, D = Math.min(o.ld, 1) - 0.15;
    box(g, W, 0.42, D, M.fabricG, 0, 0, 0);
    box(g, W, 0.5, 0.2, M.fabricG, 0, 0.42, -D / 2 + 0.1);
    box(g, 0.15, 0.25, D, M.fabricG, -W / 2 + 0.07, 0.42, 0);
    box(g, 0.15, 0.25, D, M.fabricG, W / 2 - 0.07, 0.42, 0);
    return g;
  };
  B.armchair = () => {
    const g = new THREE.Group(), z = -0.08;
    const m = Math.random() < 0.5 ? M.fabricR : M.fabricG;
    box(g, 0.78, 0.4, 0.7, m, 0, 0.05, z);
    box(g, 0.78, 0.62, 0.16, m, 0, 0.45, z - 0.28);
    for (const sx of [-1, 1]) { box(g, 0.14, 0.26, 0.66, m, sx * 0.34, 0.45, z + 0.02); box(g, 0.05, 0.08, 0.05, M.woodDark, sx * 0.32, 0, z + 0.28); box(g, 0.05, 0.08, 0.05, M.woodDark, sx * 0.32, 0, z - 0.28); }
    box(g, 0.5, 0.08, 0.5, M.fabricW, 0, 0.45, z + 0.04);
    g.rotation.y = (Math.random() - 0.5) * 0.3;
    const w = new THREE.Group(); w.add(g); return w;
  };
  B.gueridon = () => {
    const g = new THREE.Group(), z = -0.12;
    cyl(g, 0.3, 0.3, 0.035, M.woodDark, 0, 0.7, z, 20);
    cyl(g, 0.035, 0.05, 0.7, M.woodDark, 0, 0, z, 8);
    cyl(g, 0.2, 0.22, 0.03, M.woodDark, 0, 0, z, 12);
    const r = Math.random();
    if (r < 0.35) { cyl(g, 0.05, 0.08, 0.22, M.porcelain, 0, 0.735, z, 12); for (let i = 0; i < 4; i++) { const st = mesh(new THREE.ConeGeometry(0.012, 0.4, 4), M.black, (Math.random() - 0.5) * 0.08, 1.1, z + (Math.random() - 0.5) * 0.08, g); st.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); } }
    else if (r < 0.65) { cyl(g, 0.06, 0.08, 0.03, M.brass, 0, 0.735, z, 10); cyl(g, 0.015, 0.015, 0.2, M.brass, 0, 0.76, z, 6); cyl(g, 0.02, 0.02, 0.12, M.wax, 0, 0.96, z, 6); }
    else { for (let i = 0; i < 3; i++) box(g, 0.2, 0.035, 0.27, M.books[(Math.random() * 6) | 0], (Math.random() - 0.5) * 0.04, 0.735 + i * 0.036, z).rotation.y = (Math.random() - 0.5) * 0.5; }
    return g;
  };
  B.sidetable = () => {
    const g = new THREE.Group(), z = -0.5 + 0.22;
    box(g, 0.9, 0.04, 0.4, M.woodDark, 0, 0.78, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.045, 0.78, 0.045, M.woodDark, sx * 0.4, 0, z + sz * 0.15);
    box(g, 0.82, 0.12, 0.34, M.woodDark, 0, 0.64, z);
    // miroir ou cadre au-dessus
    if (Math.random() < 0.5) { box(g, 0.6, 0.8, 0.04, M.brass, 0, 1.15, -0.47); const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a2224, roughness: 0.08, metalness: 0.9 })); mir.position.set(0, 1.55, -0.445); g.add(mir); }
    else { cyl(g, 0.07, 0.05, 0.25, M.porcelain, -0.2, 0.82, z, 10); box(g, 0.16, 0.2, 0.02, M.brass, 0.2, 0.82, z).rotation.x = -0.15; }
    return g;
  };
  B.rug = (o) => {
    const g = new THREE.Group();
    const m = mesh(boxGeo(o.w || 2.6, 0.012, o.d || 1.8), M.floor['_'], 0, 0.008, 0, g); m.castShadow = false;
    return g;
  };
  B.painting = () => {
    const g = new THREE.Group();
    const w = 0.5 + Math.random() * 0.5, h = 0.45 + Math.random() * 0.4, y = 1.35 + Math.random() * 0.3;
    box(g, w + 0.1, h + 0.1, 0.04, Math.random() < 0.5 ? M.brass : M.woodDark, 0, y, -0.475);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.portraits[(Math.random() * 4) | 0]);
    c.position.set(0, y + h / 2 + 0.05, -0.45); g.add(c);
    g.rotation.z = (Math.random() - 0.5) * 0.06;
    return g;
  };
  B.counter = () => {
    const g = new THREE.Group(), z = -0.5 + 0.3;
    box(g, 1, 0.86, 0.6, M.woodDark, 0, 0, z);
    box(g, 1, 0.04, 0.64, M.porcelain, 0, 0.86, z);
    if (Math.random() < 0.5) cyl(g, 0.08, 0.08, 0.2, M.metal, (Math.random() - 0.5) * 0.6, 0.9, z);
    return g;
  };
  B.stove = () => {
    const g = new THREE.Group(), z = -0.5 + 0.32;
    box(g, 1, 0.9, 0.64, M.iron, 0, 0, z);
    for (const x of [-0.25, 0.25]) cyl(g, 0.14, 0.14, 0.02, M.black, x, 0.9, z);
    cyl(g, 0.08, 0.08, 2.0, M.iron, 0.35, 0.9, -0.45);
    return g;
  };
  B.sink = () => {
    const g = new THREE.Group(), z = -0.5 + 0.3;
    box(g, 1, 0.8, 0.6, M.woodDark, 0, 0, z);
    box(g, 0.7, 0.1, 0.5, M.porcelain, 0, 0.8, z);
    box(g, 0.04, 0.3, 0.04, M.metal, 0, 0.9, -0.45);
    return g;
  };
  B.plant = () => {
    const g = new THREE.Group();
    cyl(g, 0.22, 0.16, 0.4, M.metal, 0, 0, 0);
    const dead = new THREE.MeshStandardMaterial({ color: 0x2a2416, roughness: 1 });
    for (let i = 0; i < 7; i++) { const s = mesh(new THREE.ConeGeometry(0.03, 0.9, 4), dead, (Math.random() - 0.5) * 0.2, 0.8, (Math.random() - 0.5) * 0.2, g); s.rotation.set((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9); }
    return g;
  };
  B.covered = (o) => {
    const g = new THREE.Group();
    const W = o.lw - 0.2, D = o.ld - 0.2;
    const geo = new THREE.BoxGeometry(W, 1.0, D, 6, 3, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.94); p.setZ(i, p.getZ(i) * 0.94); } p.setY(i, p.getY(i) + (Math.random() - 0.5) * 0.06); }
    geo.computeVertexNormals();
    mesh(geo, M.fabricW, 0, 0.5, 0, g);
    return g;
  };
  B.rockinghorse = () => {
    const g = new THREE.Group();
    const h = new THREE.Group();
    box(h, 0.18, 0.25, 0.7, M.woodRaw, 0, 0.45, 0);
    box(h, 0.14, 0.32, 0.16, M.woodRaw, 0, 0.62, 0.36).rotation.x = -0.4;
    for (const x of [-0.07, 0.07]) for (const z of [-0.25, 0.25]) box(h, 0.04, 0.4, 0.04, M.woodRaw, x, 0.1, z);
    const arc = mesh(new THREE.TorusGeometry(0.6, 0.02, 4, 16, 1.4), M.woodDark, 0, 0.62, 0, h);
    arc.rotation.set(0, Math.PI / 2, Math.PI + (Math.PI - 1.4) / 2 - Math.PI / 2 - 0.7 + Math.PI / 2);
    g.add(h); g.userData.rock = h;
    return g;
  };
  B.piano = () => {
    const g = new THREE.Group(), z = -0.5 + 0.3;
    box(g, 1.0, 1.3, 0.55, M.woodDark, 0, 0, z);
    box(g, 1.0, 0.05, 0.25, M.porcelain, 0, 0.72, z + 0.38);
    box(g, 1.0, 0.65, 0.04, M.woodDark, 0, 0.05, z + 0.2);
    return g;
  };
  B.fireplace = () => {
    const g = new THREE.Group(), z = -0.5 + 0.2;
    const stoneM = M.wall[':'];
    box(g, 1.0, 1.1, 0.4, stoneM, 0, 0, z);
    box(g, 0.6, 0.7, 0.05, M.black, 0, 0.05, z + 0.19);
    box(g, 1.15, 0.08, 0.5, stoneM, 0, 1.1, z + 0.05);
    for (let i = 0; i < 3; i++) box(g, 0.4, 0.06, 0.06, M.black, (i - 1) * 0.08, 0.06, z + 0.1).rotation.y = i - 1;
    return g;
  };
  B.workbench = () => {
    const g = new THREE.Group(), z = -0.5 + 0.35;
    box(g, 1, 0.08, 0.68, M.woodRaw, 0, 0.82, z);
    [[-0.44, -0.28], [0.44, -0.28], [-0.44, 0.28], [0.44, 0.28]].forEach(([x, dz]) => box(g, 0.07, 0.82, 0.07, M.woodRaw, x, 0, z + dz));
    box(g, 1, 0.7, 0.03, M.woodRaw, 0, 1.0, -0.48);
    for (let i = 0; i < 4; i++) box(g, 0.03, 0.25, 0.02, M.metal, -0.3 + i * 0.2, 1.3, -0.45);
    return g;
  };
  B.mannequin = () => {
    const g = new THREE.Group();
    cyl(g, 0.2, 0.25, 0.04, M.woodDark, 0, 0, 0);
    cyl(g, 0.02, 0.02, 1.0, M.woodDark, 0, 0, 0);
    const t = cyl(g, 0.16, 0.13, 0.6, M.fabricW, 0, 1.0, 0); t.scale.z = 0.7;
    const head = mesh(new THREE.SphereGeometry(0.11, 12, 10), M.porcelain, 0, 1.75, 0, g);
    g.rotation.y = Math.random() * 6;
    return g;
  };
  B.toilet = () => {
    const g = new THREE.Group(), z = -0.5 + 0.3;
    cyl(g, 0.18, 0.15, 0.4, M.porcelain, 0, 0, z + 0.05);
    box(g, 0.4, 0.4, 0.15, M.porcelain, 0, 0.4, -0.42);
    return g;
  };
  B.tub = (o) => {
    const g = new THREE.Group();
    // baignoire sur deux cases, vers +x
    const L = 1.7;
    box(g, L, 0.55, 0.75, M.porcelain, L / 2 - 0.45, 0, -0.1);
    const water = box(g, L - 0.12, 0.02, 0.62, M.water, L / 2 - 0.45, G.flag('tub') ? 0.12 : 0.48, -0.1);
    for (const x of [-0.35, L - 0.55]) for (const zz of [-0.4, 0.2]) cyl(g, 0.04, 0.03, 0.1, M.brass, x, -0.05, zz);
    return g;
  };
  B.tubend = () => new THREE.Group();
  B.boiler = () => {
    const g = new THREE.Group();
    cyl(g, 0.48, 0.48, 1.8, M.metal, 0, 0, 0, 20);
    cyl(g, 0.1, 0.1, 0.9, M.metal, 0, 1.8, 0);
    box(g, 0.3, 0.3, 0.05, M.iron, 0, 0.5, 0.47);
    return g;
  };
  B.scratches = () => {
    const g = new THREE.Group();
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d'); x.strokeStyle = 'rgba(200,190,170,0.75)'; x.lineWidth = 2;
    for (let k = 0; k < 40; k++) { const bx = 10 + (k % 10) * 24, by = 10 + ((k / 10) | 0) * 28; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(bx + i * 4, by); x.lineTo(bx + i * 4 + 1, by + 20); x.stroke(); } x.beginPath(); x.moveTo(bx - 2, by + 16); x.lineTo(bx + 16, by + 4); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 1 }));
    m.position.set(0, 1.2, -0.49); g.add(m);
    return g;
  };
  B.fusebox = () => {
    const g = new THREE.Group();
    box(g, 0.55, 0.7, 0.14, M.metal, 0, 1.2, -0.43);
    for (let i = 0; i < 3; i++) {
      const on = G.flag('fuse' + (i + 1));
      cyl(g, 0.035, 0.035, 0.08, on ? M.porcelain : M.black, -0.15 + i * 0.15, 1.6, -0.35, 8).rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 4; i++) {
      const up = G.flag('power') ? G.codes.fuses[i] : (G.state.leverPos ? G.state.leverPos[i] : 0);
      const lv = box(g, 0.03, 0.12, 0.03, M.iron, -0.18 + i * 0.12, 1.3, -0.34);
      lv.rotation.x = up ? -0.5 : 0.5;
    }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: G.flag('power') ? 0x30ff40 : 0x401010 }));
    led.position.set(0.2, 1.48, -0.35); g.add(led);
    return g;
  };
  B.dumbwaiter = () => {
    const g = new THREE.Group();
    box(g, 0.8, 0.8, 0.08, M.woodDark, 0, 0.8, -0.46);
    box(g, 0.62, 0.62, 0.02, M.black, 0, 0.89, -0.41);
    box(g, 0.66, 0.05, 0.12, M.metal, 0, 0.88, -0.4);
    box(g, 0.08, 0.14, 0.04, M.brass, 0.5, 1.2, -0.46);
    return g;
  };
  B.bookslot = (o) => {
    const g = B.shelf(o);
    if (G.flag('secret')) box(g, 0.05, 0.32, 0.25, M.fabricR, 0, 0.59, -0.29);
    return g;
  };
  B.safe = () => {
    const g = new THREE.Group();
    const open = G.flag('safe');
    box(g, 0.7, 0.75, 0.6, M.iron, 0, 0, -0.18);
    const door = box(g, 0.6, 0.65, 0.05, M.metal, 0, 0.05, 0.14);
    if (open) { door.position.x = 0.32; door.position.z = 0.4; door.rotation.y = -1.4; }
    const d = cyl(g, 0.07, 0.07, 0.04, M.brass, open ? 0.5 : 0, 0.38, open ? 0.65 : 0.17); d.rotation.x = Math.PI / 2;
    return g;
  };
  B.clock = () => {
    const g = new THREE.Group(), z = -0.5 + 0.22;
    box(g, 0.5, 2.1, 0.38, M.woodDark, 0, 0, z);
    box(g, 0.58, 0.12, 0.42, M.woodDark, 0, 2.1, z);
    const face = mesh(new THREE.CircleGeometry(0.18, 24), M.porcelain, 0, 1.8, z + 0.2, g);
    const h = box(g, 0.015, 0.1, 0.01, M.black, 0, 1.8, z + 0.21);
    const mn = box(g, 0.01, 0.15, 0.01, M.black, 0, 1.8, z + 0.215);
    if (G.flag('clock')) { h.rotation.z = -(G.codes.clockH / 12) * Math.PI * 2; mn.rotation.z = -(G.codes.clockM / 60) * Math.PI * 2; }
    else { h.rotation.z = 0.8; mn.rotation.z = -2.2; }
    box(g, 0.3, 0.8, 0.02, M.black, 0, 0.6, z + 0.19);
    cyl(g, 0.08, 0.08, 0.02, M.brass, 0, 0.75, z + 0.15).rotation.x = Math.PI / 2;
    return g;
  };
  B.secretaire = () => {
    const g = new THREE.Group(), z = -0.5 + 0.25;
    box(g, 0.9, 1.0, 0.48, M.woodDark, 0, 0, z);
    const lid = box(g, 0.88, 0.5, 0.04, M.woodDark, 0, 1.0, z + 0.05);
    if (G.flag('secretaire')) { lid.rotation.x = -1.4; lid.position.set(0, 1.0, z + 0.3); box(g, 0.25, 0.01, 0.3, M.paper, 0.1, 1.04, z + 0.35); }
    box(g, 0.9, 0.6, 0.4, M.woodDark, 0, 1.0, z - 0.04);
    return g;
  };
  B.portrait = (o) => {
    const g = new THREE.Group();
    box(g, 0.66, 0.86, 0.05, M.brass, 0, 1.25, -0.47);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.76), M.portraits[o.spec.pi || 0]);
    c.position.set(0, 1.68, -0.44); g.add(c);
    return g;
  };
  B.drawing = () => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), M.drawing);
    c.position.set(0, 1.3, -0.49); g.add(c);
    return g;
  };
  B.jewelbox = () => {
    const g = new THREE.Group();
    box(g, 0.25, 0.12, 0.16, M.brass, 0, 0.9, -0.25);
    return g;
  };
  B.musicbox = () => {
    const g = new THREE.Group();
    box(g, 0.22, 0.1, 0.16, M.woodDark, 0, 0.9, -0.25);
    cyl(g, 0.02, 0.03, 0.1, M.porcelain, 0, 1.0, -0.25);
    return g;
  };
  B.trunk = () => {
    const g = new THREE.Group(), z = -0.5 + 0.3;
    box(g, 0.95, 0.5, 0.55, M.woodDark, 0, 0, z);
    const lid = box(g, 0.95, 0.12, 0.55, M.woodDark, 0, 0.5, z);
    if (G.flag('trunk')) { lid.rotation.x = -1.2; lid.position.z = z - 0.3; lid.position.y = 0.75; }
    for (const x of [-0.35, 0.35]) box(g, 0.05, 0.63, 0.57, M.iron, x, 0, z);
    box(g, 0.08, 0.1, 0.03, M.brass, 0, 0.45, z + 0.29);
    return g;
  };
  B.chest = () => {
    const g = new THREE.Group();
    box(g, 0.8, 0.45, 0.5, M.woodRaw, 0, 0, 0).rotation.y = Math.random();
    return g;
  };
  B.shrine = () => {
    const g = new THREE.Group();
    box(g, 0.8, 0.6, 0.5, M.woodDark, 0, 0, 0);
    box(g, 0.2, 0.26, 0.02, M.portraits[3], 0, 0.6, -0.1).rotation.x = -0.15;
    for (let i = 0; i < 6; i++) { cyl(g, 0.02, 0.02, 0.08 + Math.random() * 0.1, M.wax, -0.32 + i * 0.13, 0.6, 0.15, 6); }
    const doll = mesh(new THREE.SphereGeometry(0.06, 10, 8), M.porcelain, 0.22, 0.72, 0, g);
    return g;
  };
  B.candles = () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * 0.4, z = (Math.random() - 0.5) * 0.4, h = 0.08 + Math.random() * 0.15;
      cyl(g, 0.025, 0.025, h, M.wax, x, 0, z, 6);
      const f = mesh(new THREE.SphereGeometry(0.012, 5, 4), M.flame, x, h + 0.02, z, g); f.scale.y = 2; f.castShadow = false;
    }
    return g;
  };
  /* ---- Escaliers ---- */
  B.stairsup = (o) => {
    const g = new THREE.Group();
    const H = o.ceil;
    for (let i = 0; i < 6; i++) box(g, 0.95, 0.18 * (i + 1), 0.16, M.woodDark, 0, 0, 0.4 - i * 0.16);
    // ouverture sombre dans le mur
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.98, H), M.black);
    hole.position.set(0, H / 2, -0.499); g.add(hole);
    box(g, 0.05, 1.0, 1.0, M.woodDark, -0.48, 0.7, 0);
    if (o.spec.link === 'grille' && !G.flag('grille')) {
      for (let i = 0; i < 9; i++) box(g, 0.02, 2.2, 0.02, M.iron, -0.45 + i * 0.11, 0, 0.48);
      box(g, 0.98, 0.04, 0.04, M.iron, 0, 2.0, 0.48);
      box(g, 0.98, 0.04, 0.04, M.iron, 0, 0.3, 0.48);
      box(g, 0.08, 0.1, 0.05, M.brass, 0.1, 1.0, 0.52);
    }
    return g;
  };
  B.stairsdown = (o) => {
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.98, o.ceil), M.black);
    hole.position.set(0, o.ceil / 2, -0.499); g.add(hole);
    // porte de cave (cuisine) : planches + cadenas
    if (o.spec.link === 'cave' && o.floor === 1) {
      const open = G.flag('caveDoor');
      const d = new THREE.Group();
      box(d, 0.9, 2.1, 0.05, M.woodRaw, 0.45, 0, 0);
      if (!open) { box(d, 0.08, 0.12, 0.06, M.brass, 0.82, 1.0, 0.05); }
      d.position.set(-0.45, 0, -0.4); if (open) d.rotation.y = -1.6;
      g.add(d);
    }
    for (let i = 0; i < 4; i++) box(g, 0.95, 0.04, 0.2, M.woodDark, 0, -0.04 - i * 0.18, -0.4 - i * 0.2);
    return g;
  };
  B.hatch = (o) => {
    const g = new THREE.Group();
    const H = o.ceil;
    box(g, 0.9, 0.04, 0.9, M.woodDark, 0, H - 0.04, 0);
    if (G.flag('hatchDown') || G.flag('hatch')) {
      const l = new THREE.Group();
      const len = H * 1.1;
      for (const x of [-0.22, 0.22]) box(l, 0.05, len, 0.05, M.woodRaw, x, 0, 0);
      for (let i = 1; i < 9; i++) box(l, 0.44, 0.04, 0.04, M.woodRaw, 0, i * len / 9, 0);
      l.position.set(0, 0, 0.6); l.rotation.x = -0.35;
      if (!G.flag('hatch')) { l.scale.y = 0.35; l.position.y = H * 0.62; }
      g.add(l);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), M.black);
      hole.rotation.x = Math.PI / 2; hole.position.y = H - 0.05; g.add(hole);
    } else {
      cyl(g, 0.05, 0.05, 0.01, M.iron, 0, H - 0.07, 0.3);
    }
    return g;
  };
  B.ladderhole = () => {
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), M.black);
    hole.rotation.x = -Math.PI / 2; hole.position.y = 0.012; g.add(hole);
    for (const x of [-0.22, 0.22]) box(g, 0.05, 0.9, 0.05, M.woodRaw, x, 0, 0.35);
    return g;
  };
  /* ---- Portes ---- */
  B.door = (o) => {
    const g = new THREE.Group();
    const style = o.spec.style || 'plain';
    const pivot = new THREE.Group();
    if (style === 'bars') {
      box(pivot, 0.06, 2.1, 0.06, M.iron, 0.03, 0, 0);
      box(pivot, 0.06, 2.1, 0.06, M.iron, 0.93, 0, 0);
      for (let i = 1; i < 8; i++) box(pivot, 0.025, 2.1, 0.025, M.iron, i * 0.12, 0, 0);
      for (const y of [0.1, 1.0, 2.0]) box(pivot, 0.96, 0.05, 0.05, M.iron, 0.48, y, 0);
      box(pivot, 0.1, 0.16, 0.08, M.metal, 0.85, 0.95, 0.05);
    } else if (style === 'double') {
      box(pivot, 0.96, 2.4, 0.08, M.woodDark, 0.48, 0, 0);
      for (const y of [0.3, 1.3]) box(pivot, 0.8, 0.8, 0.02, M.woodRaw, 0.48, y, 0.05);
      box(pivot, 0.04, 0.3, 0.04, M.brass, 0.85, 1.0, 0.07);
    } else {
      box(pivot, 0.92, 2.15, 0.06, M.woodDark, 0.47, 0, 0);
      for (const y of [0.2, 1.15]) box(pivot, 0.62, 0.8, 0.015, M.woodDark, 0.47, y, 0.035);
      for (const y of [0.2, 1.15]) box(pivot, 0.62, 0.8, 0.015, M.woodDark, 0.47, y, -0.035);
      const k = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass, 0.82, 1.0, 0.06, pivot);
      mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass, 0.82, 1.0, -0.06, pivot);
    }
    pivot.position.set(-0.48, 0, 0);
    g.add(pivot);
    g.userData.pivot = pivot;
    return g;
  };
  B.secret = (o) => {
    const g = new THREE.Group();
    const inner = B.shelf({ floorChar: '.' });
    inner.position.z = 0; // affleurant au mur côté bibliothèque
    const pivot = new THREE.Group(); pivot.add(inner);
    g.add(pivot);
    g.userData.pivot = pivot;
    return g;
  };
  B.frontdoor = () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      box(g, 0.48, 2.6, 0.12, M.woodDark, s * 0.25, 0, 0);
      for (const y of [0.3, 1.45]) box(g, 0.34, 0.9, 0.02, M.woodRaw, s * 0.25, y, 0.07);
    }
    if (!G.flag('lockChain')) {
      for (let i = 0; i < 9; i++) { const l = mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 8), M.iron, -0.4 + i * 0.1, 1.2 + Math.sin(i / 8 * Math.PI) * -0.15, 0.1, g); l.rotation.y = i % 2 ? Math.PI / 2 : 0; }
      box(g, 0.1, 0.12, 0.05, M.brass, 0, 1.0, 0.13);
    }
    if (!G.flag('lockBar')) box(g, 1.1, 0.12, 0.1, M.iron, 0, 1.5, 0.15);
    box(g, 0.06, 0.12, 0.03, G.flag('lockMain') ? M.iron : M.brass, 0.12, 1.1, 0.08);
    return g;
  };
  B.window = () => {
    const g = new THREE.Group();
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.4), M.glassMoon);
    gl.position.set(0, 1.55, -0.499); g.add(gl);
    box(g, 0.9, 0.06, 0.08, M.woodDark, 0, 0.82, -0.47);
    box(g, 0.9, 0.06, 0.08, M.woodDark, 0, 2.26, -0.47);
    box(g, 0.05, 1.45, 0.06, M.woodDark, 0, 0.84, -0.47);
    for (let i = 0; i < 3; i++) { const b = box(g, 1.0, 0.16, 0.03, M.woodRaw, 0, 1.0 + i * 0.45, -0.44); b.rotation.z = (Math.random() - 0.5) * 0.3; }
    return g;
  };
  /* ---- Objets ramassables ---- */
  B.item = (o) => {
    const g = new THREE.Group();
    const id = o.spec.item || o.spec.type;
    const y = o.surfaceY || 0;
    const m = M.brass;
    if (id === 'battery') { for (let i = 0; i < 2; i++) { const c = cyl(g, 0.017, 0.017, 0.06, M.metal, i * 0.04, y, 0, 8); c.rotation.z = Math.PI / 2; c.position.y = y + 0.02; } }
    else if (id === 'lamp') { const c = cyl(g, 0.025, 0.03, 0.22, M.iron, 0, y, 0, 10); c.rotation.z = Math.PI / 2; c.position.y = y + 0.03; }
    else if (id.startsWith('fusible')) { cyl(g, 0.025, 0.025, 0.07, M.porcelain, 0, y, 0, 8); }
    else if (id === 'livre') { box(g, 0.18, 0.05, 0.25, M.fabricR, 0, y, 0); }
    else if (id === 'coupe_boulon') { box(g, 0.6, 0.04, 0.06, M.iron, 0, y, 0).rotation.y = 0.3; box(g, 0.6, 0.04, 0.06, M.fabricR, 0, y + 0.04, 0.05).rotation.y = 0.2; }
    else if (id === 'perche') { const c = cyl(g, 0.015, 0.015, 2.2, M.woodRaw, 0, 0, -0.35, 6); c.rotation.x = 0.2; }
    else { // clé
      const k = new THREE.Group();
      const r = mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 12), m, 0, 0, 0, k); r.rotation.x = Math.PI / 2;
      box(k, 0.09, 0.01, 0.012, m, 0.07, -0.005, 0);
      box(k, 0.012, 0.01, 0.03, m, 0.1, -0.005, 0.015);
      if (id === 'grande_cle') k.scale.setScalar(2.2);
      k.position.y = y + 0.012; g.add(k);
    }
    g.traverse(c => { if (c.isMesh) c.castShadow = false; });
    return g;
  };
  B.note = (o) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), M.paper);
    p.rotation.x = -Math.PI / 2; p.rotation.z = (Math.random() - 0.5) * 0.6;
    p.position.y = (o.surfaceY || 0) + 0.006; g.add(p);
    return g;
  };
  B.none = () => new THREE.Group();
  B.floor = () => new THREE.Group();

  /* ---- Lustre / ampoule de plafond ---- */
  B.ceilLamp = (ceil, on) => {
    const g = new THREE.Group();
    box(g, 0.01, 0.4, 0.01, M.black, 0, ceil - 0.4, 0);
    const bulb = mesh(new THREE.SphereGeometry(0.06, 8, 6), on ? M.lampOn : M.lampOff, 0, ceil - 0.46, 0, g);
    bulb.castShadow = false;
    const shade = mesh(new THREE.ConeGeometry(0.2, 0.16, 12, 1, true), M.metal, 0, ceil - 0.38, 0, g);
    shade.material = M.metal; shade.castShadow = false;
    g.userData.bulb = bulb;
    return g;
  };

  /* ---- Le Gardien (Armand) ---- */
  B.monster = () => {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const coat = M.coat;
    const torso = box(body, 0.42, 0.75, 0.26, coat, 0, 1.15, 0);
    const skirt = mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.6, 10), coat, 0, 0.95, 0, body);
    // tête : sac de toile, affaissé
    const head = new THREE.Group(); head.position.set(0, 2.0, 0.02); body.add(head);
    const hg = new THREE.SphereGeometry(0.16, 14, 12); const hp = hg.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i);
      const sag = y < 0 ? 1.05 : 0.92 + Math.random() * 0.1;
      hp.setXYZ(i, hp.getX(i) * sag * (1 + (Math.random() - 0.5) * 0.08), y * 1.25 + (y > 0.1 ? (Math.random() - 0.5) * 0.04 : 0), hp.getZ(i) * sag * (1 + (Math.random() - 0.5) * 0.08));
    }
    hg.computeVertexNormals();
    const sack = new THREE.MeshStandardMaterial({ map: M.burlap.map, color: 0x6a5a48, roughness: 1, bumpMap: M.burlap.map, bumpScale: 0.04 });
    mesh(hg, sack, 0, 0, 0, head);
    const holeM = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const e1 = mesh(new THREE.CircleGeometry(0.03, 7), holeM, -0.058, 0.04, 0.152, head); e1.scale.y = 0.75; e1.rotation.z = 0.3;
    const e2 = mesh(new THREE.CircleGeometry(0.026, 7), holeM, 0.06, 0.03, 0.15, head); e2.scale.y = 0.8;
    // bouche cousue
    for (let i = 0; i < 6; i++) { const st = box(head, 0.006, 0.035, 0.01, M.black, -0.05 + i * 0.02, -0.1, 0.145); st.rotation.z = (i % 2 ? 0.25 : -0.25); }
    box(head, 0.12, 0.004, 0.01, M.black, 0, -0.082, 0.146);
    // corde au cou
    const rope = mesh(new THREE.TorusGeometry(0.1, 0.014, 5, 14), M.woodRaw, 0, -0.18, 0, head); rope.rotation.x = Math.PI / 2;
    box(head, 0.02, 0.14, 0.02, M.woodRaw, 0.04, -0.3, 0.09).rotation.z = 0.2;
    box(body, 0.1, 0.12, 0.1, M.skin, 0, 1.88, 0);
    // bras
    const mkArm = (s) => {
      const a = new THREE.Group(); a.position.set(s * 0.26, 1.85, 0);
      box(a, 0.1, 0.52, 0.1, coat, 0, -0.52, 0);
      const fore = new THREE.Group(); fore.position.y = -0.52; a.add(fore);
      box(fore, 0.085, 0.5, 0.085, coat, 0, -0.5, 0);
      box(fore, 0.07, 0.2, 0.035, M.skin, 0, -0.7, 0);
      for (let f = 0; f < 3; f++) box(fore, 0.014, 0.12, 0.014, M.skin, -0.024 + f * 0.024, -0.82, 0);
      body.add(a); return { a, fore };
    };
    const armL = mkArm(-1), armR = mkArm(1);
    // jambes
    const mkLeg = (s) => {
      const l = new THREE.Group(); l.position.set(s * 0.11, 0.95, 0);
      box(l, 0.13, 0.5, 0.13, coat, 0, -0.5, 0);
      const shin = new THREE.Group(); shin.position.y = -0.5; l.add(shin);
      box(shin, 0.11, 0.45, 0.11, coat, 0, -0.45, 0);
      box(shin, 0.12, 0.08, 0.26, M.black, 0, -0.48, 0.06);
      body.add(l); return { l, shin };
    };
    const legL = mkLeg(-1), legR = mkLeg(1);
    // lanterne
    const lantern = new THREE.Group();
    box(lantern, 0.14, 0.2, 0.14, M.iron, 0, -0.12, 0);
    const glass = mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), new THREE.MeshBasicMaterial({ color: 0xffa040 }), 0, -0.02, 0, lantern);
    glass.castShadow = false;
    lantern.position.set(0, -0.82, 0.05); armR.fore.add(lantern);
    g.userData = { body, head, armL, armR, legL, legR, lantern, glass };
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    glass.castShadow = false;
    return g;
  };

  /* ---- Les enfants (Léa et Tom) ---- */
  B.kid = (o) => {
    const g = new THREE.Group();
    const girl = !!o.girl;
    const H = girl ? 1.22 : 1.45, k = H / 1.45;
    const col = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const skin = col(0xd9b49a), hair = col(girl ? 0x5a3418 : 0x2a1c12);
    const top = col(girl ? 0xb8a030 : 0x8a2a22), bottom = col(girl ? 0xb8a030 : 0x2a3a5a), shoe = col(0x2a2a2a), sock = col(0xd8d8d0);
    const body = new THREE.Group(); body.scale.setScalar(k); g.add(body);
    // jambes
    const mkLeg = (sx) => { const l = new THREE.Group(); l.position.set(sx * 0.075, 0.68, 0);
      box(l, 0.09, 0.4, 0.1, girl ? skin : bottom, 0, -0.4, 0); box(l, 0.085, 0.2, 0.09, girl ? sock : bottom, 0, -0.6, 0); box(l, 0.1, 0.08, 0.2, shoe, 0, -0.68, 0.04);
      body.add(l); return l; };
    const legL = mkLeg(-1), legR = mkLeg(1);
    // buste
    if (girl) { const dress = mesh(new THREE.CylinderGeometry(0.13, 0.26, 0.62, 12), top, 0, 0.87, 0, body); }
    else { box(body, 0.3, 0.42, 0.17, top, 0, 0.68, 0); box(body, 0.31, 0.2, 0.18, bottom, 0, 0.55, 0); }
    // bras
    const mkArm = (sx) => { const a = new THREE.Group(); a.position.set(sx * 0.19, 1.08, 0);
      box(a, 0.07, 0.24, 0.08, top, 0, -0.24, 0); box(a, 0.06, 0.22, 0.065, skin, 0, -0.46, 0); body.add(a); return a; };
    const armL = mkArm(-1), armR = mkArm(1);
    const torch = cyl(armR, 0.02, 0.028, 0.16, M.iron, 0, -0.5, 0.06, 8); torch.rotation.x = Math.PI / 2;
    // tête
    box(body, 0.07, 0.07, 0.07, skin, 0, 1.08, 0);
    const head = new THREE.Group(); head.position.set(0, 1.27, 0); body.add(head);
    const hd = mesh(new THREE.SphereGeometry(0.135, 16, 14), skin, 0, 0, 0, head); hd.scale.set(0.95, 1.05, 1);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1210 });
    mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeM, -0.05, 0.01, 0.125, head); mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeM, 0.05, 0.01, 0.125, head);
    box(head, 0.04, 0.008, 0.01, col(0x7a4a40), 0, -0.065, 0.128);
    const cap = mesh(new THREE.SphereGeometry(0.143, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.012, -0.012, head);
    if (girl) {
      for (const sx of [-1, 1]) { const t = cyl(head, 0.035, 0.02, 0.26, hair, sx * 0.15, -0.26, -0.01, 8); t.rotation.z = sx * 0.25; mesh(new THREE.SphereGeometry(0.022, 6, 6), col(0xa02030), sx * 0.14, -0.02, -0.01, head); }
      box(head, 0.2, 0.05, 0.03, hair, 0, 0.075, 0.115);
    } else {
      box(head, 0.22, 0.045, 0.05, hair, 0, 0.085, 0.105).rotation.x = 0.2;
    }
    g.userData = { legL, legR, armL, armR, head };
    return g;
  };

  function init(mats) { M = mats; }
  function build(name, o) { const f = B[name]; if (!f) { console.warn('modèle inconnu', name); return new THREE.Group(); } return f(o || {}); }
  return { init, build, B };
})();
