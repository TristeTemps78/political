import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAxes, computeAffinites, AXES } from '../js/affinity.js';
import { FAMILLES, THEMES, mulberry32 } from '../js/data.js';

test('aucune réponse → boussole neutre (0 sur chaque axe)', () => {
  const axes = computeAxes({});
  for (const a of AXES) assert.equal(axes[a.id], 0);
});

test('la magnitude des allocations compte (régression du bug de saturation)', () => {
  // 1 pt sur effet fort (0.9) + 11 pts sur effet faible (0.2) doit donner un
  // score écologie NETTEMENT inférieur à 12 pts sur l'effet fort.
  const nuance = computeAxes({ climat: { renouvelables: 1, nucleaire: 11 } });
  const extreme = computeAxes({ climat: { renouvelables: 12 } });
  assert.ok(nuance.ecologie < extreme.ecologie - 0.3,
    `nuance=${nuance.ecologie} devrait être bien sous extreme=${extreme.ecologie}`);
});

test('étalonnage : la réponse uniforme donne une boussole neutre', () => {
  const reponses = {};
  for (const t of THEMES) {
    reponses[t.id] = Object.fromEntries(t.options.map((o) => [o.id, t.budget / t.options.length]));
  }
  const axes = computeAxes(reponses);
  for (const a of AXES) {
    assert.ok(Math.abs(axes[a.id]) < 0.12,
      `axe ${a.id}=${axes[a.id].toFixed(3)} : la réponse indifférente doit être ~0`);
  }
});

test('les axes restent bornés à [-1, 1] pour toute allocation', () => {
  const rng = mulberry32(42);
  for (let run = 0; run < 200; run++) {
    const reponses = allocationAleatoire(rng);
    const axes = computeAxes(reponses);
    for (const a of AXES) assert.ok(axes[a.id] >= -1 && axes[a.id] <= 1);
  }
});

test('un utilisateur aligné sur le vecteur d’une famille la classe première', () => {
  for (const f of FAMILLES) {
    const affinites = computeAffinites({ ...f.vecteur });
    assert.equal(affinites[0].familleId, f.id,
      `${f.id} devrait être 1re pour son propre vecteur, obtenu : ${affinites[0].familleId}`);
  }
});

test('les affinités sont triées décroissantes et bornées à [0, 1]', () => {
  const affinites = computeAffinites({ eco: 0.5, societe: -0.2, ecologie: 0.8, europe: 0.1 });
  assert.equal(affinites.length, FAMILLES.length);
  for (let i = 0; i < affinites.length; i++) {
    assert.ok(affinites[i].score >= 0 && affinites[i].score <= 1);
    if (i > 0) assert.ok(affinites[i - 1].score >= affinites[i].score);
  }
});

test('équité : aucune famille n’est structurellement favorisée sur des réponses aléatoires', () => {
  const rng = mulberry32(2027);
  const N = 3000;
  const sommes = Object.fromEntries(FAMILLES.map((f) => [f.id, 0]));
  const premieres = Object.fromEntries(FAMILLES.map((f) => [f.id, 0]));
  for (let run = 0; run < N; run++) {
    const affinites = computeAffinites(computeAxes(allocationAleatoire(rng)));
    premieres[affinites[0].familleId] += 1;
    for (const a of affinites) sommes[a.familleId] += a.score;
  }
  const moyennes = FAMILLES.map((f) => sommes[f.id] / N);
  const m = moyennes.reduce((a, b) => a + b, 0) / moyennes.length;
  const ecartType = Math.sqrt(moyennes.reduce((s, x) => s + (x - m) ** 2, 0) / moyennes.length);
  assert.ok(ecartType < 0.05,
    `écart-type des affinités moyennes ${ecartType.toFixed(4)} ≥ 0.05 — biais structurel (cible docs_architecture/03)`);
  // Chaque famille doit pouvoir « gagner » sur une part non négligeable de profils aléatoires.
  for (const f of FAMILLES) {
    assert.ok(premieres[f.id] / N > 0.02,
      `${f.id} n'arrive en tête que sur ${((premieres[f.id] / N) * 100).toFixed(1)} % des profils aléatoires`);
  }
});

// Allocation aléatoire valide : les 12 points de chaque thème, répartis un à un.
function allocationAleatoire(rng) {
  const reponses = {};
  for (const t of THEMES) {
    const alloc = Object.fromEntries(t.options.map((o) => [o.id, 0]));
    for (let p = 0; p < t.budget; p++) {
      alloc[t.options[Math.floor(rng() * t.options.length)].id] += 1;
    }
    reponses[t.id] = alloc;
  }
  return reponses;
}
