import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCOS, DEPARTEMENTS, FAMILLES, THEMES, MAJORITE_ABSOLUE } from '../js/data.js';

test('le référentiel compte exactement 577 circonscriptions', () => {
  assert.equal(CIRCOS.length, 577);
});

test('la majorité absolue est 289 (577/2 + 1)', () => {
  assert.equal(MAJORITE_ABSOLUE, 289);
  assert.equal(MAJORITE_ABSOLUE, Math.floor(577 / 2) + 1);
});

test('les identifiants de circonscription sont uniques et bien formés', () => {
  const ids = new Set(CIRCOS.map((c) => c.id));
  assert.equal(ids.size, 577);
  for (const c of CIRCOS) assert.match(c.id, /^[0-9AB]{3}-\d{2}$/);
});

test('chaque département a au moins 1 circonscription et un nom', () => {
  for (const d of DEPARTEMENTS) {
    assert.ok(d.circos >= 1, `${d.code} sans circonscription`);
    assert.ok(d.nom.length > 1);
    assert.ok(d.region.length > 1);
  }
});

test('les 7 familles ont des vecteurs bornés à [-1, 1] et des couleurs distinctes', () => {
  assert.equal(FAMILLES.length, 7);
  const couleurs = new Set(FAMILLES.map((f) => f.couleur));
  assert.equal(couleurs.size, 7);
  for (const f of FAMILLES) {
    for (const v of Object.values(f.vecteur)) {
      assert.ok(v >= -1 && v <= 1, `${f.id} : composante hors bornes`);
    }
  }
});

test('chaque thème propose exactement 4 options et un budget de 12', () => {
  assert.equal(THEMES.length, 6);
  for (const t of THEMES) {
    assert.equal(t.options.length, 4, t.id);
    assert.equal(t.budget, 12, t.id);
    const ids = new Set(t.options.map((o) => o.id));
    assert.equal(ids.size, 4, `options dupliquées dans ${t.id}`);
    for (const o of t.options) {
      assert.ok(Object.keys(o.effets).length >= 1, `${t.id}/${o.id} sans effet`);
      for (const v of Object.values(o.effets)) assert.ok(Math.abs(v) <= 1);
    }
  }
});
