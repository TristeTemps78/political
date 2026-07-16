// Script DÉVELOPPEUR (à lancer une fois, hors runtime) : génère js/geo.js,
// la géométrie SVG des départements pour la carte du mode Gouverner.
// Le client ne télécharge JAMAIS rien : la sortie est commitée (décision n°1, docs 00).
//
// Source : france-geojson de Grégoire David (github.com/gregoiredavid/france-geojson),
// contours IGN/Etalab — Licence Ouverte / Open Licence.
//
// Usage :
//   node tools/build-geo.mjs [dossier-cache]
// Si un dossier-cache est fourni et contient depts.geojson / drom-971.geojson …,
// il est utilisé ; sinon les fichiers sont téléchargés (Node 18+, fetch natif).

import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPARTEMENTS } from '../js/data.js';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master';
const DROM = [
  ['971', '971-guadeloupe'], ['972', '972-martinique'], ['973', '973-guyane'],
  ['974', '974-la-reunion'], ['976', '976-mayotte'],
];

// ---------------------------------------------------------------- géométrie

// Distance perpendiculaire d'un point au segment [a, b].
function distSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Douglas-Peucker itératif (pile explicite : pas de limite de récursion).
function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  const garder = new Uint8Array(points.length);
  garder[0] = garder[points.length - 1] = 1;
  const pile = [[0, points.length - 1]];
  while (pile.length) {
    const [debut, fin] = pile.pop();
    let dMax = 0, iMax = 0;
    for (let i = debut + 1; i < fin; i++) {
      const d = distSegment(points[i], points[debut], points[fin]);
      if (d > dMax) { dMax = d; iMax = i; }
    }
    if (dMax > tolerance) {
      garder[iMax] = 1;
      pile.push([debut, iMax], [iMax, fin]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

// Aire signée (shoelace) — sert à écarter les îlots négligeables.
function aire(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a / 2);
}

// GeoJSON Polygon/MultiPolygon → liste d'anneaux [[lon, lat], …].
function anneaux(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  throw new Error(`Géométrie inattendue : ${geometry.type}`);
}

// Projette, simplifie, quantifie et sérialise un jeu d'anneaux en path SVG.
// projeter : [lon, lat] → [x, y] (y déjà inversé). Retourne '' si tout dégénère.
function versPath(rings, projeter, tolerance) {
  const projetes = rings.map((r) => r.map(projeter));
  const aireMax = Math.max(...projetes.map(aire));
  const morceaux = [];
  for (const ring of projetes) {
    // Îlots < 1,5 % de l'anneau principal : invisibles à cette échelle.
    if (aire(ring) < Math.max(aireMax * 0.015, 3)) continue;
    let simple = douglasPeucker(ring, tolerance);
    if (simple.length < 4) simple = douglasPeucker(ring, tolerance / 4);
    if (simple.length < 4) continue;
    const pts = [];
    let precedent = null;
    for (const [x, y] of simple) {
      const q = [Math.round(x), Math.round(y)];
      if (precedent && q[0] === precedent[0] && q[1] === precedent[1]) continue;
      pts.push(q);
      precedent = q;
    }
    if (pts.length < 3) continue;
    morceaux.push(`M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`);
  }
  return morceaux.join('');
}

function bbox(features) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of features) for (const ring of anneaux(f.geometry)) for (const [lon, lat] of ring) {
    if (lon < x0) x0 = lon; if (lon > x1) x1 = lon;
    if (lat < y0) y0 = lat; if (lat > y1) y1 = lat;
  }
  return { x0, y0, x1, y1 };
}

// ---------------------------------------------------------------- sources

async function lireOuTelecharger(cache, nomLocal, url) {
  if (cache) {
    const chemin = join(cache, nomLocal);
    try { await access(chemin); return JSON.parse(await readFile(chemin, 'utf8')); } catch { /* absent → réseau */ }
  }
  console.log(`  téléchargement : ${url}`);
  const rep = await fetch(url);
  if (!rep.ok) throw new Error(`HTTP ${rep.status} sur ${url}`);
  return rep.json();
}

// ---------------------------------------------------------------- principal

const cache = process.argv[2] ?? null;
console.log(`Génération de js/geo.js${cache ? ` (cache : ${cache})` : ' (téléchargement direct)'}`);

const metro = await lireOuTelecharger(cache, 'depts.geojson', `${BASE}/departements-version-simplifiee.geojson`);

// Repère métropole : équirectangulaire corrigée (cos 46,5°), y vers le bas.
// La métropole occupe ~900 unités de large, décalée à droite des encarts DROM.
const COS = Math.cos((46.5 * Math.PI) / 180);
const bb = bbox(metro.features);
const LARGEUR_METRO = 880;
const ECHELLE = LARGEUR_METRO / ((bb.x1 - bb.x0) * COS);
const MARGE_X = 118, MARGE_Y = 12; // colonne d'encarts DROM à gauche
const projMetro = ([lon, lat]) => [MARGE_X + (lon - bb.x0) * COS * ECHELLE, MARGE_Y + (bb.y1 - lat) * ECHELLE];

const paths = {};
for (const f of metro.features) {
  const brut = String(f.properties.code);
  const code = brut.length === 2 ? `0${brut}` : brut; // '01' → '001', '2A' → '02A'
  paths[code] = versPath(anneaux(f.geometry), projMetro, 1.1);
}

// Encarts DROM : chaque territoire est projeté à sa propre échelle dans une
// tuile de 92×78 de la colonne de gauche (ordre officiel 971 → 976).
const encarts = {};
const TUILE_L = 92, TUILE_H = 78, TUILE_PAS = 92;
for (let i = 0; i < DROM.length; i++) {
  const [code, slug] = DROM[i];
  const geo = await lireOuTelecharger(cache, `drom-${code}.geojson`, `${BASE}/departements/${slug}/departement-${slug}.geojson`);
  const f = geo.type === 'Feature' ? geo : geo.features[0];
  const rings = anneaux(f.geometry);
  const b = bbox([f]);
  const cos = Math.cos(((b.y0 + b.y1) / 2) * (Math.PI / 180));
  const echelle = Math.min((TUILE_L - 12) / ((b.x1 - b.x0) * cos), (TUILE_H - 12) / (b.y1 - b.y0));
  const tx = 10, ty = MARGE_Y + i * TUILE_PAS;
  const cx = tx + TUILE_L / 2 - ((b.x1 - b.x0) * cos * echelle) / 2;
  const cy = ty + TUILE_H / 2 - ((b.y1 - b.y0) * echelle) / 2;
  const proj = ([lon, lat]) => [cx + (lon - b.x0) * cos * echelle, cy + (b.y1 - lat) * echelle];
  paths[code] = versPath(rings, proj, 0.9);
  encarts[code] = { x: tx, y: ty, l: TUILE_L, h: TUILE_H };
}

// ViewBox englobante (métropole + encarts), arrondie avec une petite marge.
const largeur = Math.ceil(MARGE_X + LARGEUR_METRO + 12);
const hauteur = Math.ceil(Math.max(MARGE_Y + (bb.y1 - bb.y0) * ECHELLE, DROM.length * TUILE_PAS) + 14);

// Territoires du référentiel sans géométrie exploitable → tuiles de repli
// dessinées par carte-france.js (jamais d'oubli : test de couverture en CI).
const absents = DEPARTEMENTS.map((d) => d.code).filter((c) => !paths[c]);
for (const code of absents) console.log(`  sans géométrie (tuile de repli) : ${code}`);

const vides = Object.entries(paths).filter(([, p]) => !p);
if (vides.length) throw new Error(`Paths vides après simplification : ${vides.map(([c]) => c).join(', ')}`);

const contenu = `// GÉNÉRÉ par tools/build-geo.mjs — NE PAS ÉDITER À LA MAIN (relancer le script).
// Contours des départements : france-geojson (Grégoire David), données IGN/Etalab,
// Licence Ouverte / Open Licence. Simplifiés (Douglas-Peucker) et quantifiés en entiers.
// Encarts : DROM en colonne gauche ; les territoires de GEO_ABSENTS n'ont pas de
// géométrie et sont rendus en tuiles par js/carte-france.js.

export const GEO_VIEWBOX = '0 0 ${largeur} ${hauteur}';

export const GEO_ENCARTS = ${JSON.stringify(encarts)};

export const GEO_ABSENTS = ${JSON.stringify(absents)};

export const GEO_PATHS = {
${Object.entries(paths).map(([code, d]) => `  '${code}': '${d}',`).join('\n')}
};
`;

const sortie = join(RACINE, 'js', 'geo.js');
await writeFile(sortie, contenu, 'utf8');
const ko = (contenu.length / 1024).toFixed(1);
console.log(`OK : ${sortie} — ${Object.keys(paths).length} départements, ${absents.length} tuiles de repli, ${ko} Ko, viewBox 0 0 ${largeur} ${hauteur}`);
if (contenu.length > 150 * 1024) throw new Error(`geo.js dépasse 150 Ko (${ko} Ko) : augmenter la tolérance de simplification`);
