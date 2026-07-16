// Couverture et intégrité de la géométrie générée (js/geo.js).
// Invariant : chaque territoire du référentiel a un contour OU une tuile de repli.

import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEPARTEMENTS } from '../js/data.js';
import { GEO_VIEWBOX, GEO_PATHS, GEO_ABSENTS, GEO_ENCARTS } from '../js/geo.js';

test('géo : chaque code du référentiel a un contour ou une tuile de repli, jamais les deux', () => {
  for (const { code, nom } of DEPARTEMENTS) {
    const aPath = Object.hasOwn(GEO_PATHS, code);
    const absent = GEO_ABSENTS.includes(code);
    assert.ok(aPath || absent, `${code} (${nom}) : ni contour ni repli`);
    assert.ok(!(aPath && absent), `${code} (${nom}) : à la fois contour et repli`);
  }
  // Réciproque : pas de code orphelin hors référentiel.
  const codes = new Set(DEPARTEMENTS.map((d) => d.code));
  for (const code of [...Object.keys(GEO_PATHS), ...GEO_ABSENTS]) {
    assert.ok(codes.has(code), `${code} présent dans geo.js mais absent du référentiel`);
  }
});

test('géo : paths SVG valides et contenus dans la viewBox', () => {
  const [x0, y0, largeur, hauteur] = GEO_VIEWBOX.split(' ').map(Number);
  assert.equal(x0, 0);
  assert.equal(y0, 0);
  assert.ok(largeur > 0 && hauteur > 0);
  for (const [code, d] of Object.entries(GEO_PATHS)) {
    assert.match(d, /^M[-\d ]+/, `${code} : path ne commençant pas par M`);
    assert.ok(d.endsWith('Z'), `${code} : path non fermé`);
    const nombres = d.match(/-?\d+/g).map(Number);
    assert.ok(nombres.length >= 6, `${code} : moins de 3 points`);
    for (let i = 0; i < nombres.length; i += 2) {
      assert.ok(nombres[i] >= 0 && nombres[i] <= largeur, `${code} : x hors viewBox (${nombres[i]})`);
      assert.ok(nombres[i + 1] >= 0 && nombres[i + 1] <= hauteur, `${code} : y hors viewBox (${nombres[i + 1]})`);
    }
  }
});

test('géo : encarts DROM cohérents (clés avec contour, tuiles dans la viewBox)', () => {
  const [, , largeur, hauteur] = GEO_VIEWBOX.split(' ').map(Number);
  for (const [code, { x, y, l, h }] of Object.entries(GEO_ENCARTS)) {
    assert.ok(Object.hasOwn(GEO_PATHS, code), `encart ${code} sans contour`);
    assert.ok(x >= 0 && y >= 0 && x + l <= largeur && y + h <= hauteur, `encart ${code} hors viewBox`);
  }
});

test('géo : le fichier généré reste sous 150 Ko (budget hors-ligne mobile)', () => {
  const taille = statSync(fileURLToPath(new URL('../js/geo.js', import.meta.url))).size;
  assert.ok(taille < 150 * 1024, `geo.js fait ${(taille / 1024).toFixed(1)} Ko`);
});
