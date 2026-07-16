import './shims.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMIE, controleur, comptageSieges, majoriteAtteinte, investir, rejoindreGuilde, tickIA } from '../js/guilds.js';
import { load, update } from '../js/store.js';
import { CIRCOS, MAJORITE_ABSOLUE } from '../js/data.js';

test('controleur : seuil, majorité stricte et ex-aequo', () => {
  assert.equal(controleur(undefined), null, 'territoire vierge');
  assert.equal(controleur({ a: ECONOMIE.SEUIL_CONTROLE - 1 }), null, 'sous le seuil');
  assert.equal(controleur({ a: ECONOMIE.SEUIL_CONTROLE }), 'a', 'au seuil, majoritaire');
  assert.equal(controleur({ a: 6, b: 6 }), null, 'ex-aequo → personne');
  assert.equal(controleur({ a: 7, b: 6 }), 'a', 'majorité stricte');
});

test('comptageSieges et majoriteAtteinte sur un état construit', () => {
  const s = { monde: { influence: {} } };
  for (let i = 0; i < MAJORITE_ABSOLUE - 1; i++) {
    s.monde.influence[CIRCOS[i].id] = { guildeX: ECONOMIE.SEUIL_CONTROLE };
  }
  assert.equal(comptageSieges(s).guildeX, MAJORITE_ABSOLUE - 1);
  assert.equal(majoriteAtteinte(s), null, '288 sièges ne suffisent pas');
  s.monde.influence[CIRCOS[MAJORITE_ABSOLUE - 1].id] = { guildeX: ECONOMIE.SEUIL_CONTROLE };
  assert.equal(majoriteAtteinte(s), 'guildeX', '289 sièges = majorité absolue');
});

test('investir : refus sans guilde, refus sans capital, débit correct', () => {
  update((s) => { s.joueur.guildeId = null; s.joueur.capital = 100; });
  assert.equal(investir(CIRCOS[0].id).ok, false, 'sans guilde');

  rejoindreGuilde('eco-sociale');
  update((s) => { s.joueur.capital = ECONOMIE.COUT_INFLUENCE - 1; });
  assert.equal(investir(CIRCOS[0].id).ok, false, 'capital insuffisant');

  update((s) => { s.joueur.capital = ECONOMIE.COUT_INFLUENCE; });
  const res = investir(CIRCOS[0].id);
  assert.equal(res.ok, true);
  const s = load();
  assert.equal(s.joueur.capital, 0, 'capital débité');
  assert.equal(s.monde.influence[CIRCOS[0].id]['eco-sociale'], 1, 'influence créditée');
});

test('tickIA : déterministe à seed égal, budget rubber-band borné', () => {
  const influencesTotales = (s) =>
    Object.values(s.monde.influence).reduce(
      (t, cell) => t + Object.values(cell).reduce((a, b) => a + b, 0), 0);

  update((s) => { s.monde = { influence: {}, tick: 0, seed: 12345 }; s.joueur.guildeId = 'eco-sociale'; });
  tickIA();
  const apres1 = JSON.stringify(load().monde.influence);
  const total1 = influencesTotales(load());

  update((s) => { s.monde = { influence: {}, tick: 0, seed: 12345 }; });
  tickIA();
  assert.equal(JSON.stringify(load().monde.influence), apres1, 'même seed → même monde');

  // 6 guildes IA (la guilde du joueur ne joue pas), budget de base par tick.
  assert.equal(total1, 6 * ECONOMIE.IA_BUDGET_TICK, 'budget IA de base sans avance du joueur');
});
