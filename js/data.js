'use strict';
/* =====================================================================
   VALCOURT — données du jeu : plans des étages, objets, énigmes, textes
   ===================================================================== */

const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const SYMBOLS = ['Lune','Étoile','Soleil','Oiseau','Fleur','Cœur'];
const DOLLS = ['PERLE','FLEUR','NINON','LUCIE','AGATE','ROSIE','JULIE','PAULE','MAELA','LOUNA'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DIGITS = '0123456789'.split('');
const pad2 = n => String(n).padStart(2, '0');
const PLAYER_NAMES = ['Léa', 'Tom'];

function makeCodes() {
  const r = n => Math.floor(Math.random() * n);
  const digits = n => Array.from({ length: n }, () => r(10)).join('');
  let fuses;
  do { fuses = [r(2), r(2), r(2), r(2)]; } while (fuses.join('') === '0000');
  const sym = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    atelier: digits(3),
    cave: digits(4),
    fuses,
    clockH: 1 + r(11),
    clockM: 5 * (1 + r(11)),
    portrait: [r(10), r(10), r(10), r(10)], // Henri, Edith, Armand, Clémence (ordre de naissance)
    symbols: sym,
    doll: DOLLS[r(DOLLS.length)],
    day: 1 + r(28),
    month: r(12),
  };
}

const ITEMS = {
  fusible1: { name: 'Fusible en porcelaine (1)' },
  fusible2: { name: 'Fusible en porcelaine (2)' },
  fusible3: { name: 'Fusible en porcelaine (3)' },
  cle_office: { name: "Clé de l'office" },
  petite_cle: { name: 'Petite clé dorée' },
  cle_bureau: { name: 'Clé du bureau' },
  livre: { name: 'Contes de Perrault' },
  cle_grille: { name: 'Clé de la grille' },
  coupe_boulon: { name: 'Coupe-boulon' },
  cle_lingerie: { name: 'Clé de la lingerie' },
  perche: { name: 'Perche à crochet' },
  cle_clemence: { name: 'Clé de la chambre de Clémence' },
  grande_cle: { name: 'Grande clé en fer' },
  cle_armand: { name: "Clé de la chambre d'Armand" },
  cle_malle: { name: 'Petite clé de malle' },
};

/* ---------- Décor commun à tous les étages ---------- */
const DECOR = {
  e: { model: 'shelf', wall: true },
  r: { model: 'crate' },
  l: { model: 'barrel' },
  b: { model: 'bed', group: true },
  t: { model: 'table', group: true },
  y: { model: 'dresser', wall: true },
  a: { type: 'hide', model: 'wardrobe', wall: true },
  s: { model: 'sofa', group: true },
  c: { model: 'counter', wall: true },
  o: { model: 'stove', wall: true },
  w: { model: 'sink', wall: true },
  g: { model: 'plant' },
  x: { model: 'covered', group: true },
  h: { model: 'rockinghorse' },
  p: { model: 'piano', wall: true },
  f: { model: 'fireplace', wall: true },
  T: { model: 'workbench', wall: true },
  k: { model: 'mannequin' },
  q: { model: 'toilet', wall: true },
  u: { model: 'tubend' },
  B: { model: 'boiler' },
  '&': { model: 'armchair', wall: true },
  '%': { model: 'gueridon', wall: true },
  '*': { model: 'sidetable', wall: true },
};

const row = (...parts) => parts.join('');

/* =====================================================================
   ÉTAGE 0 — SOUS-SOL
   ===================================================================== */
const MAP_CAVE = [
  '####################################',
  '#:S:::#eee:::lll:#::::B:::#w:::w:::#',
  '#::::m#::::::::::#::::::::#::::::::#',
  '#b::::#l::::::::l#F:::::::#:::::j::#',
  '#:::::#l:::i::::l#::::::n:#::::::ee#',
  '###1######+#######+########+########',
  '#::::::::::::::::::::::::::::::::::#',
  '#::::::::::::::::::::::::::::::::::#',
  '######+######2##########+######+####',
  '#r:::::r#::::::::#::::::::::#::::::#',
  '#:::::::#T:::::::#M::::::::<#e:::::#',
  '#::rr:::#K:::::::#::::::::::#e::z::#',
  '#a::::::#::::::k:#::::::::::#::::r:#',
  '#r:::::r#ee::::::#::::::::::#::rr::#',
  '####################################',
];

/* =====================================================================
   ÉTAGE 1 — REZ-DE-CHAUSSÉE
   ===================================================================== */
const MAP_RDC = [
  row('#','####','#','###W##W###','#','####W#####','#','###W###W###W###','#'),
  row('#','__r_','#','eee.ee.eee','#','e.........','#','y.............y','#'),
  row('#','X___','H','.........e','#','e........C','#','...............','W'),
  row('#','____','#','.........e','#','e.........','#','...tttttttt....','#'),
  row('#','n___','#','..t.Y....B','#','e...NL....','#','...tttttttt....','#'),
  row('#','####','#','..........','#','..........','#','..............G','#'),
  row('#','r.Rr','#','.s.......e','#','........a.','#','...............','W'),
  row('W','r.z.','#','........ze','#','..........','#','y.............y','#'),
  row('#','....','+','.........e','#','y.........','#','...a...........','#'),
  row('#','a..r','#','eee...eeee','#','..........','#','...............','#'),
  row('#','####','#','####J#####','#','##U#######','#','#######+#######','#'),
  row('#','..D............','#','........^.','#','ckoc....ccwc...','#'),
  row('#','..............p','#','..........','#','c..............','#'),
  row('W','...............','#','6........7','#','.....tt........','#'),
  row('#','......s........','#','..........','#','.....tt........','W'),
  row('#','f.....s........','+','..........','#','..............v','#'),
  row('#','...............','#','8.........','#','...............','#'),
  row('W','....t..........','#','.........9','#','c..............','#'),
  row('#','..............a','#','..........','#','cz............a','#'),
  row('#','...............','#','..........','#','cc.............','#'),
  row('#','#######+#######','#','..........','#','##+############','#'),
  row('W','g,,,,,,,,,,,,,g','#','..........','#','......','#',',,,,,,,,','#'),
  row('#',',,,,,,,,,,,,,,,','#','..........','#','a.....','#','e,,,,,,e','W'),
  row('#',',,,t,,,,,,,,,,,','#','..........','#','......','#','e,,,,,,,','#'),
  row('#',',,,,,,,,,,,,,,,','#','..........','+','......','#','e,,12,,M','#'),
  row('#',',,,,,,,,,,,,,,,','#','..........','#','......','O',',,,,,,,,','#'),
  row('#','g,,,,,,,,,,,,,g','#','..........','#','......','#','S,,,,,,F','#'),
  row('#',',,,,,,3,,,,,,,,','#','a.........','#','......','#','b,,,,,,z','#'),
  row('#','g,,,,,,,,,,,,,g','#','..........','#','......','#','b,,,,,,4','#'),
  row('#','#W###W###W###W#','#','####P#####','#','######','#','########','#'),
];

/* =====================================================================
   ÉTAGE 2 — PREMIER ÉTAGE (chambres)
   ===================================================================== */
const MAP_ETAGE = [
  row('#','###W####W#####','#','####W####','#','####W#####','#','##W###','#'),
  row('#','....bb.......y','#',',Tu,,,,,,','#','.........b','#','e....e','#'),
  row('#','y...bb.......J','#',',,,,,,,,,','#','.........b','#','e....e','#'),
  row('#','..............','#',',,,,,,,,,','#','m.........','#','e....e','#'),
  row('W','a.............','#',',,,,,,,,,','#','..........','#','..H...','#'),
  row('#','..............','#','w,,,,,,,,','#','..........','#','......','W'),
  row('#','......5.......','#',',,,,,,,,,','#','....d.....','#','e....e','#'),
  row('#','..............','#',',,,,,,,,,','#','..........','#','e....e','#'),
  row('W','..............','#','q,,,,,,,,','#','..........','#','......','#'),
  row('#','a.............','#',',,,,,,,,,','#','a.........','#','......','#'),
  row('#','z.............','#',',,,,,,,,,','#','.......z..','#','......','#'),
  row('#','..............','#',',,,,,,,,,','#','..........','#','......','#'),
  row('#','#######+######','#','####+####','#','####K#####','#','###G##','#'),
  row('W','________________________v_________________','W'),
  row('#','_________A________________________________','#'),
  row('W','__________________________________________','W'),
  row('#','#######+######','#','######X#####','#','######+#######','#'),
  row('#','..............','#','b..........y','#','..............','#'),
  row('#','..t...........','#','b...........','#','.bb...........','#'),
  row('W','..............','#','............','#','.bb...........','W'),
  row('#','R.............','#','......6.Y...','#','..............','#'),
  row('#','..............','#','............','#','.......xx.....','#'),
  row('#','......h.......','#','............','#','..............','#'),
  row('W','..............','#','............','#','..............','#'),
  row('#','.......t......','#','...........a','#','..............','#'),
  row('#','..............','#','............','#','a.............','#'),
  row('#','..............','#','............','#','..............','W'),
  row('#','a............z','#','..z.........','#','.............z','#'),
  row('#','..............','#','............','#','.......7......','#'),
  row('#','###W####W#####','#','#####W######','#','####W####W####','#'),
];

/* =====================================================================
   ÉTAGE 3 — GRENIER
   ===================================================================== */
const MAP_GRENIER = [
  '########W###############W#######',
  '#;;r;;;;;;;;;;r;#;;;;;;;;;;;;;;#',
  '#;;;;;;;1;;;;;;;#;;;;;;;;;;;;;;#',
  '#r;;;;;;;;;;;;;;#;;;bb;;;;;;;;;#',
  '#;;;;k;;;;;;;;z;#;;;;;;;;;;c;;;#',
  '#;;;;;;;;;;;r;;;#;;;;;;;;;;;;;;#',
  '#;3;;;;;;;;;;;;;#;;c;;;;;;;;;;M#',
  '#;;;;;;;;;;;;;;;#;;;;;;;;;;;;;;#',
  '#;;;;;;;;;;;;;;Q;;;;;;;;;;;;;;;#',
  '#;;;;;v;;;;;;;;;#;;;;;;;;;S;;;;#',
  '#;;;;;;;;;;;;;;;#;;;;;;;;;;;;;;#',
  '#r;;;;;;;;;;;;;;#;;;;c;;;;;;;;;#',
  '#;;;;;;;;q;;;;;;#;;;;;;;;;;;;;;#',
  '#;;;;;;;;;;;;;;;#;;;;;;;;;;;;2;#',
  '#;;r;;;;;;;;;r;;#;;;;;;z;;;;;;;#',
  '########W###############W#######',
];

/* =====================================================================
   OBJETS SPÉCIFIQUES
   Les fonctions reçoivent (p, obj) : p = joueur, obj = l'objet du monde.
   L'API G est définie dans game.js.
   ===================================================================== */

const LEGEND_CAVE = {
  S: { type: 'spawn', player: 0 },
  '1': { type: 'door', style: 'bars', cachot: true, locked: true, name: 'Porte de la cellule' },
  '2': {
    type: 'door', locked: true, name: "Porte de l'atelier",
    codeLock: { title: "Cadenas de l'atelier", len: 3, answer: () => G.codes.atelier,
      desc: 'Un vieux cadenas à trois molettes.' },
  },
  m: { type: 'note', model: 'scratches', wall: true, label: 'Examiner le mur',
    title: 'Des marques sur le mur',
    text: () => "Des centaines de petits traits, gravés dans la pierre par groupes de cinq.\n\nQuelqu'un a compté les jours ici.\n\nTout en bas, une phrase griffée avec un ongle :\n« IL CHANTE AVANT DE VENIR »" },
  i: { type: 'item', item: 'fusible1', furn: 'crate' },
  j: { type: 'item', item: 'fusible2', furn: 'shelflow' },
  k: { type: 'item', item: 'fusible3', furn: 'table' },
  K: { type: 'item', item: 'cle_office', furn: 'workbench', wall: true },
  z: { type: 'battery', furn: 'shelflow' },
  n: { type: 'note', furn: 'table', title: 'Feuille arrachée',
    text: () => `Écriture tremblante, au crayon :\n\n« Mère dit qu'il faut TOUJOURS fermer en haut quand il y a des invités.\nLe cadenas de la porte de la cuisine : ${G.codes.cave}\nNe pas oublier. NE PAS OUBLIER. »\n\n— A.` },
  F: { type: 'custom', model: 'fusebox', wall: true,
    label: () => G.flag('power') ? null : 'Examiner le tableau électrique',
    use: (p) => G.useFuseBox(p) },
  M: { type: 'custom', model: 'dumbwaiter', wall: true, end: 0,
    label: (p) => G.dumbLabel(p, 0), use: (p) => G.useDumbwaiter(p, 0) },
  '<': { type: 'stairs', link: 'cave', dir: 'up', label: 'Monter l\'escalier',
    req: () => G.flag('caveDoor') ? null : "Tout en haut des marches, la porte est fermée. Quelque chose cliquette de l'autre côté... un cadenas." },
  B: { model: 'boiler', type: 'decor', examine: "Une vieille chaudière à charbon. Froide depuis des années." },
};

const LEGEND_RDC = {
  S: { type: 'spawn', player: 1 },
  '+': { type: 'door' },
  H: { type: 'secret', name: 'Bibliothèque murale', rot: Math.PI / 2 },
  X: { type: 'item', item: 'coupe_boulon', furn: 'table' },
  n: { type: 'note', furn: 'table', scare: 'sack', title: 'Une boîte de photographies',
    text: () => "Des dizaines de photos, rangées avec soin. Des inconnus, endormis. Un homme en ciré. Deux adolescentes. Un couple de randonneurs.\n\nAu dos, des dates : 1979, 1983, 1988, 1996, 2004, 2011, 2019...\n\nLa dernière photo est un polaroid encore brillant. Elle est datée d'hier." },
  B: { type: 'custom', model: 'bookslot', wall: true,
    label: (p) => G.flag('secret') ? null : (G.has(p, 'livre') ? 'Ranger le livre' : 'Examiner l\'étagère'),
    use: (p) => {
      if (!G.has(p, 'livre')) { G.say(p, "Il manque un livre ici. La place est marquée « C — 3 ». Il ne reste que la poussière."); return; }
      G.take(p, 'livre'); G.set('secret'); G.sfx('secret', p);
      G.say(p, "Le livre s'enfonce... un déclic. Quelque chose grince derrière le mur.");
      G.refreshAll();
    } },
  Y: { type: 'note', furn: 'table', title: 'Fiche de bibliothèque',
    text: () => "Une fiche cartonnée, écriture soignée :\n\n« Contes de Perrault — Rayon C, 3e étagère.\nCe volume ne doit JAMAIS être déplacé.\n— H. V. »\n\nUn second mot, plus récent, d'une autre main :\n« Père l'a emporté dans son bureau. Pour que personne n'entre. »" },
  C: { type: 'custom', model: 'safe', wall: true,
    label: () => G.flag('safe') ? null : 'Ouvrir le coffre-fort',
    use: (p) => G.openDial(p, {
      title: 'Coffre-fort', desc: 'Quatre molettes. Le métal est froid.',
      dials: [DIGITS, DIGITS, DIGITS, DIGITS],
      answer: () => G.codes.portrait.map(String),
      success: (p) => {
        G.set('safe'); G.sfx('unlock', p); G.give(p, 'cle_grille');
        G.read(p, "Lettre d'Edith, 1974", "Une lettre pliée, trouvée avec la clé.\n\n« Armand, mon fils.\nJe sais ce que tu as fait à ta sœur, cette nuit-là, à l'étang. Je l'ai toujours su.\nJ'ai fait fermer la grille de l'escalier et condamné le grenier. Tes \"invités\" ne te ramèneront pas Clémence.\nQue Dieu me pardonne de t'avoir protégé.\n— Ta mère »");
        G.refreshAll();
      },
    }) },
  N: { type: 'note', furn: 'desk', title: "Lettre d'Henri Valcourt",
    text: () => "« Edith tient à ce que les portraits de la famille soient accrochés dans le hall, comme chez mon père.\nAu dos de chaque cadre, j'ai fait graver un chiffre.\nLe coffre s'ouvre en les lisant dans l'ordre de nos naissances, du plus ancien au plus jeune.\nAinsi, seule la famille pourra l'ouvrir. »\n\n— Henri, 1956" },
  L: { type: 'item', item: 'livre', furn: 'desk' },
  G: { type: 'custom', model: 'clock', wall: true,
    label: () => G.flag('clock') ? null : "Régler l'horloge",
    use: (p) => G.openDial(p, {
      title: 'Horloge comtoise', desc: "Les aiguilles sont arrêtées. Un mot gravé sous le cadran : « L'heure où elle nous a quittés »",
      dials: [Array.from({ length: 12 }, (_, i) => String(i + 1)), Array.from({ length: 12 }, (_, i) => pad2(i * 5))],
      labels: ['Heures', 'Minutes'],
      answer: () => [String(G.codes.clockH), pad2(G.codes.clockM)],
      success: (p) => {
        G.set('clock'); G.sfx('chime', p); G.give(p, 'cle_bureau');
        G.say(p, "L'horloge sonne, lugubre. Un petit tiroir s'ouvre sous le balancier.");
      },
    }) },
  J: { type: 'door', style: 'double', twin: true, name: 'Portes coulissantes de la bibliothèque' },
  U: { type: 'door', locked: true, key: 'cle_bureau', name: 'Porte du bureau',
    lockMsg: 'Fermée à clé. Une plaque en laiton : « Bureau — H. Valcourt ».' },
  O: { type: 'door', locked: true, key: 'cle_office', name: "Porte de l'office",
    lockMsg: "Fermée à clé de l'extérieur." },
  '^': { type: 'stairs', link: 'grille', dir: 'up', model: 'stairsup', label: 'Monter à l\'étage',
    req: (p) => {
      if (G.flag('grille')) return null;
      if (G.has(p, 'cle_grille')) { G.take(p, 'cle_grille'); G.set('grille'); G.sfx('unlock', p); G.refreshAll(); return "La clé tourne. La grille s'ouvre en grinçant."; }
      return "Une grille en fer forgé, cadenassée, ferme l'escalier.";
    } },
  v: { type: 'stairs', link: 'cave', dir: 'down', label: 'Descendre à la cave',
    req: (p) => {
      if (G.flag('caveDoor')) return null;
      G.openDial(p, {
        title: 'Cadenas de la porte de la cave', desc: 'Un cadenas à quatre chiffres, accroché au loquet.',
        dials: [DIGITS, DIGITS, DIGITS, DIGITS],
        answer: () => G.codes.cave.split(''),
        success: (p) => { G.set('caveDoor'); G.sfx('unlock', p); G.say(p, 'Le cadenas cède. La porte de la cave est ouverte.'); G.refreshAll(); G.onCaveOpened(); },
      });
      return false;
    } },
  D: { type: 'custom', model: 'secretaire', wall: true,
    label: () => G.flag('secretaire') ? 'Relire la coupure de journal' : 'Ouvrir le secrétaire',
    use: (p) => {
      if (!G.flag('secretaire')) {
        if (!G.has(p, 'petite_cle')) { G.say(p, 'Le secrétaire est fermé à clé. Une toute petite serrure dorée.'); G.sfx('locked', p); return; }
        G.take(p, 'petite_cle'); G.set('secretaire'); G.sfx('unlock', p);
      }
      G.read(p, "L'Écho du Val — 1955", `DRAME AU DOMAINE VALCOURT\n\nLa petite Clémence Valcourt, 9 ans, a été retrouvée sans vie le ${G.codes.day} ${MONTHS[G.codes.month]} au matin, dans l'étang de la propriété.\n\nSelon le médecin de famille, le décès remonterait à ${G.codes.clockH} h ${pad2(G.codes.clockM)} dans la nuit.\n\nSon frère aîné, Armand, 24 ans, aurait donné l'alerte. La famille n'a souhaité faire aucune déclaration.`);
    } },
  '6': { type: 'note', model: 'portrait', wall: true, pi: 2, label: 'Retourner le portrait', title: 'Portrait',
    text: () => `Armand Valcourt\nné en 1931\n\nUn jeune homme pâle, au regard fixe. Quelqu'un a gratté les yeux de la toile.\n\nAu dos du cadre, un chiffre est gravé : ${G.codes.portrait[2]}` },
  '7': { type: 'note', model: 'portrait', wall: true, pi: 0, label: 'Retourner le portrait', title: 'Portrait',
    text: () => `Henri Valcourt\n1898 – 1961\n\nUn homme sévère, moustache grise, main posée sur une canne.\n\nAu dos du cadre, un chiffre est gravé : ${G.codes.portrait[0]}` },
  '8': { type: 'note', model: 'portrait', wall: true, pi: 3, label: 'Retourner le portrait', title: 'Portrait',
    text: () => `Clémence Valcourt\n1946 – 1955\n\nUne fillette en robe blanche, une poupée dans les bras. La peinture est plus fraîche que les autres, comme retouchée souvent.\n\nAu dos du cadre, un chiffre est gravé : ${G.codes.portrait[3]}` },
  '9': { type: 'note', model: 'portrait', wall: true, pi: 1, label: 'Retourner le portrait', title: 'Portrait',
    text: () => `Edith Valcourt, née Morel\n1905 – 1974\n\nUne femme élégante, col montant, un médaillon au cou.\n\nAu dos du cadre, un chiffre est gravé : ${G.codes.portrait[1]}` },
  k: { type: 'item', item: 'petite_cle', furn: 'counter', wall: true },
  z: { type: 'battery', furn: 'table' },
  '1': { type: 'note', furn: 'table', title: "Carnet d'Armand (page arrachée)",
    text: () => `« Ranger les outils de Père dans l'atelier, en bas. Mère ne doit pas savoir.\nCode de l'atelier : ${G.codes.atelier}\n\nLes deux petits dorment bien. La petite avait une lampe dans sa poche. Je lui laisse. Clémence aimait jouer à cache-cache dans le noir. »` },
  '2': { type: 'note', furn: 'table', title: "Note de l'électricien",
    text: () => `Établissements Morin & Fils — 12 mai 1971\n\nTableau du sous-sol remis en état. Trois fusibles neufs livrés (à ranger : cave à vin, buanderie, atelier).\n\nPour le réarmement, positionner les leviers ainsi :\n  Levier 1 : ${G.codes.fuses[0] ? 'HAUT' : 'BAS'}\n  Levier 2 : ${G.codes.fuses[1] ? 'HAUT' : 'BAS'}\n  Levier 3 : ${G.codes.fuses[2] ? 'HAUT' : 'BAS'}\n  Levier 4 : ${G.codes.fuses[3] ? 'HAUT' : 'BAS'}\n\nToute autre combinaison ne rétablira pas le courant.\nNB : le circuit de l'étage est hors service.` },
  '3': { type: 'note', furn: 'floor', title: 'Billet froissé',
    text: () => "Au crayon, sur un ticket de bus de 2019 :\n\n« Si vous lisez ça : il chante une berceuse quand il marche. Si vous l'entendez, CACHEZ-VOUS.\nIl ne fouille pas les armoires s'il ne vous a pas vu y entrer.\nIl voit la lumière des lampes de loin. Éteignez.\nNe courez que s'il vous a vu, il entend tout.\n\nLa porte d'entrée : une serrure, une chaîne, une barre. Il faut être deux pour la barre.\n— M. »" },
  '4': { type: 'note', furn: 'dresserlow', scare: 'girl', title: 'Un polaroid',
    text: () => "Un polaroid, encore tiède.\n\nDeux enfants endormis, dans le noir. Une petite fille et un garçon.\n\nC'est nous. Cette nuit.\n\nAu dos, d'une écriture appliquée : « Bienvenue à la maison. »" },
  R: { type: 'note', furn: 'crate', title: 'Calendrier des Postes, 1974',
    text: () => "Un calendrier arrêté au mois d'octobre 1974. Le 19 est entouré en rouge.\n\nEn dessous : « Mère est partie dormir avec Clémence. Je reste. Je garde la maison. »" },
  M: { type: 'custom', model: 'dumbwaiter', wall: true, end: 1,
    label: (p) => G.dumbLabel(p, 1), use: (p) => G.useDumbwaiter(p, 1) },
  F: { type: 'lamp', furn: 'dresserlow', wall: true },
  P: { type: 'custom', model: 'frontdoor', front: true,
    label: (p) => G.frontLabel(p), use: (p) => G.useFrontDoor(p) },
};

const LEGEND_ETAGE = {
  T: { type: 'custom', model: 'tub',
    label: () => G.flag('tub') ? null : 'Examiner la baignoire',
    use: (p) => {
      if (!G.has(p, 'perche')) { G.say(p, "La baignoire est pleine d'une eau noire et croupie. Quelque chose brille au fond, près de la bonde. Hors de question d'y plonger la main..."); return; }
      G.set('tub'); G.sfx('drain', p);
      G.say(p, "Avec la perche, vous accrochez la chaînette de la bonde. L'eau s'écoule dans un gargouillis... Au fond : une clé.");
      G.give(p, 'cle_clemence'); G.refreshAll(); G.scareSoon(p, 'girl', 2.2);
    } },
  J: { type: 'custom', model: 'jewelbox', furn: 'dresser', wall: true,
    label: () => G.flag('jewel') ? null : 'Ouvrir le coffret à bijoux',
    use: (p) => G.openDial(p, {
      title: 'Coffret à bijoux', desc: 'Trois petites molettes ornées de symboles.',
      dials: [SYMBOLS, SYMBOLS, SYMBOLS],
      answer: () => G.codes.symbols.map(i => SYMBOLS[i]),
      success: (p) => { G.set('jewel'); G.sfx('musicbox', p); G.give(p, 'cle_lingerie');
        G.say(p, "Le couvercle s'ouvre. Pas de bijoux... une clé étiquetée « Lingerie »."); },
    }) },
  '5': { type: 'note', furn: 'table', title: "Journal d'Edith",
    text: () => `« ${G.codes.day} ${MONTHS[G.codes.month]} 1955.\nArmand est rentré de l'étang à l'aube, trempé jusqu'aux os. Il fredonnait la berceuse de Clémence.\nHenri dit que c'était un accident. Henri dit beaucoup de choses.\n\nJ'ai rangé la clé de la lingerie dans mon coffret. Clémence avait choisi les symboles elle-même, comme sur son dessin de la salle de jeux. »` },
  m: { type: 'custom', model: 'musicbox', furn: 'dresserlow', wall: true,
    label: () => 'Remonter la boîte à musique',
    use: (p) => {
      G.sfx('musicbox', p);
      if (!G.flag('mbKey')) { G.set('mbKey'); G.say(p, "Une petite danseuse tourne en grinçant... C'est la même mélodie. Celle qu'il fredonne. Le socle s'ouvre : une clé y était cachée.", 7); G.give(p, 'cle_armand'); }
      else G.say(p, "La mélodie s'élève dans le noir. Il doit l'entendre, lui aussi.", 5);
    } },
  X: { type: 'door', locked: true, key: 'cle_armand', name: "Chambre d'Armand",
    lockMsg: "Fermée à clé. Quelqu'un a gravé dans le bois : « PAS TOUCHE ». Une écriture d'adulte qui imite celle d'un enfant." },
  Y: { type: 'item', item: 'cle_malle', furn: 'desk' },
  d: { type: 'note', furn: 'table', scare: 'girl', title: 'Journal de Clémence',
    text: () => `Écriture d'enfant, au crayon de couleur :\n\n« Ma poupée s'appelle ${G.codes.doll}. C'est le plus joli nom du monde.\nArmand dit que les poupées n'ont pas d'âme. Armand est méchant.\nIl a mis un cadenas avec des lettres sur la trappe du grenier. Il dit que le mot secret, c'est le nom de ma poupée, comme ça je ne l'oublierai jamais.\nJe n'aime pas le grenier. »` },
  H: { type: 'item', item: 'perche', furn: 'none', wall: true },
  K: { type: 'door', locked: true, key: 'cle_clemence', name: 'Chambre de Clémence', scare: 'girl',
    lockMsg: "Fermée à clé. Des fleurs séchées sont accrochées à la poignée." },
  G: { type: 'door', locked: true, key: 'cle_lingerie', name: 'Lingerie', lockMsg: 'Fermée à clé. Une étiquette : « Lingerie ».' },
  v: { type: 'stairs', link: 'grille', dir: 'down', label: 'Descendre au rez-de-chaussée' },
  A: { type: 'stairs', link: 'hatch', dir: 'hatch', model: 'hatch', label: 'Grimper au grenier',
    req: (p) => {
      if (G.flag('hatch')) return null;
      if (!G.has(p, 'perche') && !G.flag('hatchDown')) return "Une trappe au plafond. L'anneau est hors de portée.";
      if (!G.flag('hatchDown')) { G.set('hatchDown'); G.refreshAll(); }
      G.openDial(p, {
        title: 'Cadenas à lettres', desc: "Un cadenas à cinq lettres bloque l'échelle repliée.",
        dials: [LETTERS, LETTERS, LETTERS, LETTERS, LETTERS],
        answer: () => G.codes.doll.split(''),
        success: (p) => { G.set('hatch'); G.sfx('unlock', p); G.say(p, "Le cadenas s'ouvre. L'échelle se déplie dans un nuage de poussière."); G.refreshAll(); },
      });
      return false;
    } },
  R: { type: 'note', model: 'drawing', wall: true, title: "Un dessin d'enfant",
    text: () => `Un dessin aux crayons de couleur, punaisé au mur.\nTrois symboles dessinés en grand, avec des flèches entre eux :\n\n${G.codes.symbols.map(i => SYMBOLS[i].toUpperCase()).join('   →   ')}\n\nEn dessous : « Le code secret de Maman ». Signé : Clémence, 8 ans.` },
  '6': { type: 'note', furn: 'desk', title: "Carnet d'Armand",
    text: () => "« Les invités ne restent jamais. Ils essaient tous de partir.\nMère disait qu'une maison vide, c'est une maison morte.\nJe les garde. Je les mets en haut, avec Clémence, pour qu'elle ne soit plus seule.\n\nJ'ai mis la grande clé de la porte dans la malle de Clémence, au grenier. Deux verrous : la petite clé reste ici, sur mon bureau, et le code, c'est le jour où elle est partie.\nPersonne ne se souvient de ce jour. Sauf moi. »" },
  '7': { type: 'note', furn: 'table', title: 'Lettre jamais envoyée',
    text: () => "« Maman, si un jour tu lis ça : je suis dans une grande maison près de la forêt. Je ne sais pas depuis combien de jours. Il est vieux, mais il est fort, et il ne dort presque jamais.\nIl y a une armoire dans chaque pièce. Je les connais toutes maintenant.\nJe t'aime. — Julie, 1996 »" },
  z: { type: 'battery', furn: 'table' },
};

const LEGEND_GRENIER = {
  v: { type: 'stairs', link: 'hatch', dir: 'ladder', model: 'ladderhole', label: "Redescendre par l'échelle" },
  Q: { type: 'pushable', model: 'wardrobe', name: 'Grande armoire', to: [0, -1] },
  M: { type: 'custom', model: 'trunk', wall: true,
    label: () => G.flag('trunk') ? null : 'Examiner la malle',
    use: (p) => G.openDial(p, {
      title: 'La malle de Clémence', desc: "Une étiquette jaunie : « Pour ma sœur — le jour où tu es partie (JJ / MM) »",
      dials: [DIGITS, DIGITS, DIGITS, DIGITS],
      before: (p) => {
        if (G.flag('trunkKey')) return true;
        if (G.has(p, 'cle_malle')) { G.take(p, 'cle_malle'); G.set('trunkKey'); G.sfx('unlock', p); G.say(p, 'La petite clé tourne dans la serrure. Reste le cadenas à chiffres.'); return true; }
        G.say(p, "La malle est fermée par deux verrous : une petite serrure en fer, et un cadenas à quatre chiffres. Une étiquette : « Pour ma sœur — le jour où tu es partie »."); G.sfx('locked', p); return false;
      },
      answer: () => (pad2(G.codes.day) + pad2(G.codes.month + 1)).split(''),
      success: (p) => { G.set('trunk'); G.sfx('unlock', p); G.give(p, 'grande_cle'); G.refreshAll(); G.onGrandeCle(p); },
    }) },
  S: { type: 'note', model: 'shrine', scare: 'girl', title: 'Un autel',
    text: () => "Une petite table couverte de bougies. Au centre, la photo d'une fillette en robe blanche, et une poupée de porcelaine au visage fendu.\n\nAutour, des objets alignés avec soin : une montre, un bonnet, des lunettes, un téléphone portable, une barrette rose... Des dizaines d'objets.\n\nLes « invités »." },
  c: { model: 'candles', type: 'decor', light: 'candle' },
  b: { model: 'mattress', group: true },
  q: { model: 'chest' },
  '1': { type: 'note', furn: 'crate', title: 'Liste',
    text: () => "Une liste de noms, sur du papier d'écolier. Chaque nom est barré.\n\nLes deux derniers ne le sont pas encore.\n\nLe premier a été écrit cette nuit." },
  '2': { type: 'note', furn: 'crate', title: 'Dernier mot',
    text: () => "« Il ne faut pas rester ensemble au même endroit. Un qui l'attire, l'autre qui cherche.\nLa grande clé est dans la malle. Le code, c'est une date. Elle est écrite dans un vieux journal, en bas.\nJe n'ai jamais trouvé le journal. »" },
  z: { type: 'battery', furn: 'crate' },
  '3': { type: 'note', furn: 'crate', title: 'Gravé dans une poutre',
    text: () => "Gravé au couteau, profondément :\n\nCLÉMENCE NE DORT PAS ICI\nELLE EST DANS L'ÉTANG\nIL LE SAIT" },
};

const FLOORS = [
  { name: 'Sous-sol', map: MAP_CAVE, legend: LEGEND_CAVE, defFloor: ':', ceil: 2.6, lights: 'power' },
  { name: 'Rez-de-chaussée', map: MAP_RDC, legend: LEGEND_RDC, defFloor: '.', ceil: 3.1, lights: 'power' },
  { name: 'Étage', map: MAP_ETAGE, legend: LEGEND_ETAGE, defFloor: '.', ceil: 2.9, lights: 'none' },
  { name: 'Grenier', map: MAP_GRENIER, legend: LEGEND_GRENIER, defFloor: ';', ceil: 2.3, lights: 'none' },
];

const CHAPTERS = [
  null,
  { title: 'Chapitre I', sub: 'Le réveil' },
  { title: 'Chapitre II', sub: 'La maison' },
  { title: 'Chapitre III', sub: 'Les chambres' },
  { title: 'Chapitre IV', sub: 'Le grenier' },
  { title: 'Chapitre V', sub: 'La fuite' },
];

const INTRO_TEXT = [
  "Octobre. Le domaine Valcourt est abandonné depuis 1974. Tous les enfants du village le savent : on ne passe pas la grille.",
  "Léa, 8 ans, voulait seulement récupérer son ballon. Tom, son grand frère de 11 ans, l'a suivie pour ne pas la laisser seule.",
  "Ils se souviennent de la porte entrouverte. D'une odeur de bougie. D'une berceuse, quelque part dans les murs.",
  "Puis plus rien.",
];

/* ---------- Serrures à énigmes ---------- */
const RIDDLES = [
  ["Je commence la nuit et je finis le matin. Qui suis-je ?", "La lettre N", ["La lune", "Le sommeil", "Le rêve"]],
  ["Plus j'ai de gardiens, moins je suis gardé. Qui suis-je ?", "Un secret", ["Un trésor", "Un prisonnier", "Un château"]],
  ["J'ai des dents mais je ne mords pas. Qui suis-je ?", "Un peigne", ["Un loup", "Une clé", "Un chien"]],
  ["Plus je sèche, plus je suis mouillée. Qui suis-je ?", "Une serviette", ["La pluie", "Une éponge de mer", "Une rivière"]],
  ["On me casse sans me toucher. Qui suis-je ?", "Le silence", ["Un verre", "Un œuf", "Une promesse d'acier"]],
  ["J'ai un chapeau mais pas de tête, un pied mais pas de chaussure. Qui suis-je ?", "Un champignon", ["Un épouvantail", "Un clou", "Une lampe"]],
  ["Qu'est-ce qui monte et qui descend sans jamais bouger ?", "Un escalier", ["Un ascenseur", "La fumée", "Un oiseau"]],
  ["Quel mois de l'année a 28 jours ?", "Tous les mois", ["Février seulement", "Aucun", "Janvier"]],
  ["J'ai des aiguilles mais je ne couds pas. Qui suis-je ?", "Une horloge", ["Un hérisson malade", "Une couturière", "Un sapin de fer"]],
  ["Je grandis quand on me nourrit, je meurs quand on me donne à boire. Qui suis-je ?", "Le feu", ["Une plante", "Un enfant", "Un poisson"]],
  ["Plus on m'enlève, plus je deviens grand. Qui suis-je ?", "Un trou", ["Un gâteau", "Un mur", "Un arbre"]],
  ["Je suis toujours devant toi mais tu ne peux jamais me voir. Qui suis-je ?", "L'avenir", ["Ton ombre", "Ton nez", "Le vent"]],
  ["J'ai une tête et une queue, mais pas de corps. Qui suis-je ?", "Une pièce de monnaie", ["Un serpent", "Une comète", "Un têtard"]],
  ["Qu'est-ce qui a des feuilles mais n'est pas un arbre ?", "Un livre", ["Une forêt", "Une salade de pierre", "Un nuage"]],
  ["Je parle sans bouche et j'entends sans oreilles. Qui suis-je ?", "Un écho", ["Un fantôme", "Un téléphone cassé", "Une statue"]],
  ["On me prend avant de me donner. Qui suis-je ?", "Une photo", ["Un cadeau", "Un coup", "Un rhume"]],
  ["Je suis plein de trous et pourtant je retiens l'eau. Qui suis-je ?", "Une éponge", ["Un seau percé", "Un filet", "Une passoire"]],
  ["Plus il y en a, moins on y voit. Qu'est-ce que c'est ?", "L'obscurité", ["Les fenêtres", "Les bougies", "Les lunettes"]],
  ["Combien de pattes ont trois araignées ?", "24", ["18", "12", "30"]],
  ["Le père de Clémence a trois enfants : Pim, Pam et... ?", "Clémence", ["Poum", "Pom", "Armand seulement"]],
  ["Si tu me nommes, je disparais. Qui suis-je ?", "Le silence", ["Un secret gardé", "Une ombre", "Un rêve"]],
  ["Qu'est-ce qui a un lit mais ne dort jamais ?", "Une rivière", ["Un hôpital", "Un chat", "Une poupée"]],
  ["Je n'ai pas de jambes, pourtant je cours. Qui suis-je ?", "L'eau", ["Un serpent", "Le temps perdu", "Un caillou"]],
  ["Un coq pond un œuf au sommet d'un toit. De quel côté tombe-t-il ?", "Un coq ne pond pas", ["À gauche", "À droite", "Il reste en haut"]],
];
function makeRiddle() {
  const r = n => Math.floor(Math.random() * n);
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  if (Math.random() < 0.55) {
    let q, ans;
    const t = r(6);
    if (t === 0) { const a = 2 + r(8), b = 2 + r(8); q = `Combien font ${a} × ${b} ?`; ans = a * b; }
    else if (t === 1) { const a = 12 + r(60), b = 11 + r(40); q = `Combien font ${a} + ${b} ?`; ans = a + b; }
    else if (t === 2) { const b = 6 + r(30), a = b + 5 + r(50); q = `Combien font ${a} − ${b} ?`; ans = a - b; }
    else if (t === 3) { const a = 2 + r(8), b = 2 + r(8), c = 1 + r(9); q = `Combien font ${a} × ${b} + ${c} ?`; ans = a * b + c; }
    else if (t === 4) { const st = 2 + r(7), a0 = 1 + r(9); q = `Quel nombre continue la suite ?  ${a0}, ${a0 + st}, ${a0 + 2 * st}, ${a0 + 3 * st}, ...`; ans = a0 + 4 * st; }
    else { const b = 2 + r(8), ans0 = 2 + r(9); q = `Combien font ${b * ans0} ÷ ${b} ?`; ans = ans0; }
    const wrong = new Set();
    while (wrong.size < 3) { const w = ans + (r(2) ? 1 : -1) * (1 + r(6)); if (w !== ans && w >= 0) wrong.add(w); }
    const choices = shuffle([ans, ...wrong].map(String));
    return { q, choices, answer: choices.indexOf(String(ans)) };
  }
  const [q, ok, bad] = RIDDLES[r(RIDDLES.length)];
  const choices = shuffle([ok, ...bad]);
  return { q, choices, answer: choices.indexOf(ok) };
}
