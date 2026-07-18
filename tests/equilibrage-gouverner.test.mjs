// Cibles d'équilibrage du mode Gouverner en assertions CI (E7) — même méthode
// que la Conquête (tools/simulate.mjs) : les stratégies scriptées du harness
// (tools/simulate-gouverner.mjs) jouent des mandats complets avec le VRAI
// moteur, seeds fixes → résultat parfaitement déterministe d'une exécution à
// l'autre. N = 100 mandats par stratégie : assez pour des taux stables,
// assez court pour la CI (~15 s).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simuler, tauxReelu, moyenne } from '../tools/simulate-gouverner.mjs';

const N = 100;
const coherente = simuler('coherente', N);
const incoherente = simuler('incoherente', N);

test('équilibrage : la stratégie cohérente est réélue sur au moins 60 % des mandats', () => {
  const taux = tauxReelu(coherente);
  assert.ok(taux >= 60, `réélection cohérente ${taux.toFixed(0)} % < 60 % — rééquilibrer ECONOMIE_GOUVERNER (cf. VOTE_BARRAGE_2032)`);
});

test('équilibrage : la stratégie incohérente est battue sur au moins 80 % des mandats', () => {
  const tauxBattu = 100 - tauxReelu(incoherente);
  assert.ok(tauxBattu >= 80, `défaite incohérente ${tauxBattu.toFixed(0)} % < 80 % — le zigzag + 49.3 systématique doit rester perdant`);
});

test('équilibrage : la cohérence paie sur les deux jauges (popularité et solde)', () => {
  const ecartPopularite = moyenne(coherente.popularites) - moyenne(incoherente.popularites);
  const ecartSolde = moyenne(coherente.soldes) - moyenne(incoherente.soldes);
  assert.ok(ecartPopularite > 0, `écart de popularité ${ecartPopularite.toFixed(1)} pts ≤ 0`);
  assert.ok(ecartSolde > 0, `écart de solde ${ecartSolde.toFixed(1)} Md€ ≤ 0`);
});

test('équilibrage : aucun mandat ne reste inachevé (le moteur termine toujours en ≤ 65 tours)', () => {
  assert.ok(!coherente.types.inacheve, `${coherente.types.inacheve} mandat(s) cohérent(s) inachevé(s)`);
  assert.ok(!incoherente.types.inacheve, `${incoherente.types.inacheve} mandat(s) incohérent(s) inachevé(s)`);
});
