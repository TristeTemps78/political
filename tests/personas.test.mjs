import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, AXES_GOUVERNER, poidsSegments, reagirPersona, tirerRecit, sensibilite, participation } from '../js/personas.js';
import { DEPARTEMENTS, mulberry32 } from '../js/data.js';

test('10 personas exactement, schéma complet et fictifs', () => {
  assert.equal(PERSONAS.length, 10);
  const ids = new Set();
  for (const p of PERSONAS) {
    assert.ok(!ids.has(p.id), `id dupliqué : ${p.id}`);
    ids.add(p.id);
    assert.equal(typeof p.nom, 'string');
    assert.equal(typeof p.age, 'number');
    assert.equal(typeof p.emoji, 'string');
    assert.ok(DEPARTEMENTS.some((d) => d.code === p.dept), `département inconnu : ${p.dept}`);
    for (const axe of AXES_GOUVERNER) {
      assert.ok(p.vecteur[axe] >= -1 && p.vecteur[axe] <= 1, `${p.id}.${axe} hors [-1,1]`);
    }
    assert.equal(typeof p.rapport, 'string');
    assert.equal(typeof p.pedagogie, 'string');
    for (const bucket of ['fortPos', 'pos', 'neg', 'fortNeg']) {
      assert.ok(Array.isArray(p.recits[bucket]) && p.recits[bucket].length > 0, `${p.id}.recits.${bucket} vide`);
    }
  }
});

test('sensibilite : toujours positive, valeur par défaut pour un rapport inconnu', () => {
  for (const p of PERSONAS) assert.ok(sensibilite(p.rapport) > 0);
  assert.equal(sensibilite('inconnu-xyz'), 1.0);
});

test('participation : bornée [0,1], monotone selon le rapport à la politique (abstention devient visible)', () => {
  for (const p of PERSONAS) {
    const t = participation(p.rapport);
    assert.ok(t >= 0 && t <= 1, `${p.rapport} : taux ${t} hors [0,1]`);
  }
  assert.equal(participation('inconnu-xyz'), 0.6, 'valeur par défaut raisonnable pour un rapport non répertorié');
  // Ordre documenté (cf. js/personas.js) : conviction/engagement les plus
  // mobilisés, abstention/éloignement les moins mobilisés — un persona
  // mécontent ET participant doit pouvoir peser contre le gouvernement,
  // un persona content mais abstentionniste ne doit pas suffire à sauver le
  // score (cf. election2032, js/gouverner.js).
  const ordre = ['conviction', 'engagement', 'utile', 'fiscalite', 'protestataire', 'intermittent', 'defiance', 'eloignement', 'abstention'];
  for (let i = 0; i < ordre.length - 1; i++) {
    assert.ok(
      participation(ordre[i]) >= participation(ordre[i + 1]),
      `participation(${ordre[i]}) devrait être ≥ participation(${ordre[i + 1]})`
    );
  }
});

test('poidsSegments : somme à 1, le persona du département pèse le plus localement', () => {
  const poids = poidsSegments('059'); // Nord — Nadia
  const somme = Object.values(poids).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somme - 1) < 1e-9, `somme des poids = ${somme}`);
  const maxId = Object.entries(poids).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(maxId, 'nadia', 'Nadia (059) doit dominer l’humeur de son propre département');
});

test('poidsSegments : département inconnu ne casse pas (repli neutre)', () => {
  const poids = poidsSegments('999-inconnu');
  const somme = Object.values(poids).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somme - 1) < 1e-9);
});

test('reagirPersona : cohérence signée — effet aligné ≥ 0, effet opposé ≤ 0', () => {
  for (const p of PERSONAS) {
    const norme = Math.sqrt(AXES_GOUVERNER.reduce((s, a) => s + (p.vecteur[a] || 0) ** 2, 0));
    if (norme === 0) continue; // aucun persona n'a un vecteur nul, mais on se protège
    const aligne = reagirPersona(p, p.vecteur, 35);
    const oppose = reagirPersona(p, Object.fromEntries(AXES_GOUVERNER.map((a) => [a, -(p.vecteur[a] || 0)])), 35);
    assert.ok(aligne >= 0, `${p.id} : réaction à un effet aligné devrait être ≥ 0 (obtenu ${aligne})`);
    assert.ok(oppose <= 0, `${p.id} : réaction à un effet opposé devrait être ≤ 0 (obtenu ${oppose})`);
  }
});

test('reagirPersona : bornée à ±25, nulle si effets nuls', () => {
  const p = PERSONAS[0];
  assert.equal(reagirPersona(p, {}, 35), 0);
  const extreme = reagirPersona(p, { eco: 1000, societe: -1000, ecologie: 1000, europe: -1000 }, 35);
  assert.ok(extreme >= -25 && extreme <= 25, `réaction hors bornes : ${extreme}`);
});

test('tirerRecit : respecte le bucket selon le signe/l’intensité, déterministe à rng égal', () => {
  const p = PERSONAS[0];
  const rng = () => 0; // premier élément du bucket, systématiquement
  assert.equal(tirerRecit(p, 20, rng), p.recits.fortPos[0]);
  assert.equal(tirerRecit(p, 5, rng), p.recits.pos[0]);
  assert.equal(tirerRecit(p, -5, rng), p.recits.neg[0]);
  assert.equal(tirerRecit(p, -20, rng), p.recits.fortNeg[0]);
  // Déterminisme : même seed → même suite de tirages.
  const r1 = mulberry32(42);
  const r2 = mulberry32(42);
  const s1 = Array.from({ length: 5 }, () => tirerRecit(p, 20, r1));
  const s2 = Array.from({ length: 5 }, () => tirerRecit(p, 20, r2));
  assert.deepEqual(s1, s2);
});
