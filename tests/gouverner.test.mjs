import test from 'node:test';
import assert from 'node:assert/strict';
import { creerPartie, finDeTour, humeurDepartement, assembleeParDefaut, ECONOMIE_GOUVERNER } from '../js/gouverner.js';
import { PERSONAS } from '../js/personas.js';
import { REFORMES, EVENEMENTS, CALENDRIER } from '../js/mandat.js';
import { FAMILLES, MAJORITE_ABSOLUE, CIRCOS, DEPARTEMENTS } from '../js/data.js';

test('assembleeParDefaut : Σ = 577 sièges, aucune famille ≥ majorité absolue', () => {
  for (const f of FAMILLES) {
    const assemblee = assembleeParDefaut(f.id);
    const total = Object.values(assemblee).reduce((a, b) => a + b, 0);
    assert.equal(total, CIRCOS.length, `familleId=${f.id}`);
    for (const [id, n] of Object.entries(assemblee)) {
      assert.ok(n < MAJORITE_ABSOLUE, `${id} atteint ${n} ≥ ${MAJORITE_ABSOLUE} sièges`);
      assert.ok(n >= 0, `${id} a un nombre de sièges négatif`);
    }
    assert.ok(Object.keys(assemblee).length === FAMILLES.length);
  }
});

test('creerPartie : état initial conforme au schéma v3, refuse seed/famille invalides', () => {
  const g = creerPartie({ seed: 12345, familleId: 'eco-sociale' });
  assert.equal(g.tour, 0);
  assert.equal(g.familleId, 'eco-sociale');
  assert.equal(g.jauges.popularite, ECONOMIE_GOUVERNER.POPULARITE_INIT);
  assert.equal(g.jauges.solde, ECONOMIE_GOUVERNER.SOLDE_INIT);
  assert.deepEqual(g.ligne, { eco: 0, societe: 0, ecologie: 0, europe: 0 });
  assert.equal(Object.keys(g.personas).length, PERSONAS.length);
  for (const p of PERSONAS) assert.deepEqual(g.personas[p.id], { humeur: 0, recits: [] });
  assert.deepEqual(g.chocs, {});
  assert.equal(g.fin, null);
  assert.throws(() => creerPartie({ seed: 1, familleId: 'parti-inexistant' }));
  assert.throws(() => creerPartie({ familleId: 'eco-sociale' }));
});

test('creerPartie : accepte une assemblée fournie en paramètre (crochet E4)', () => {
  const assemblee = Object.fromEntries(FAMILLES.map((f) => [f.id, 82])); // 7 × 82 = 574 ≠ 577, peu importe pour ce test
  const g = creerPartie({ seed: 1, familleId: 'lib-europeen', assemblee });
  assert.deepEqual(g.assemblee, assemblee);
});

function decisionReforme(reforme) {
  return { effets: reforme.effets, cout: reforme.cout, libelle: reforme.titre };
}

test('finDeTour : déterministe à seed égal (deux runs identiques produisent le même état)', () => {
  const sequence = [REFORMES[0], REFORMES[3], REFORMES[7], REFORMES[12], REFORMES[20]];
  function jouer() {
    let g = creerPartie({ seed: 777, familleId: 'social-democrate' });
    for (const r of sequence) g = finDeTour(g, decisionReforme(r));
    return g;
  }
  const a = jouer();
  const b = jouer();
  assert.deepEqual(a, b);
});

test('finDeTour : humeurs et popularité restent bornées sous des effets extrêmes répétés', () => {
  let g = creerPartie({ seed: 5, familleId: 'souverainiste' });
  const decisionExtreme = { effets: { eco: 50, societe: -50, ecologie: 50, europe: -50 }, cout: -100, libelle: 'Choc extrême' };
  for (let i = 0; i < 80; i++) {
    g = finDeTour(g, decisionExtreme);
    for (const id in g.personas) {
      assert.ok(g.personas[id].humeur >= -100 && g.personas[id].humeur <= 100, `humeur hors bornes pour ${id}`);
    }
    assert.ok(g.jauges.popularite >= 0 && g.jauges.popularite <= 100, 'popularité hors [0,100]');
    if (g.fin) break;
  }
});

test('finDeTour : journal et récits par persona plafonnés à 12', () => {
  let g = creerPartie({ seed: 9, familleId: 'droite-gouvernement' });
  for (let i = 0; i < 30 && !g.fin; i++) {
    g = finDeTour(g, decisionReforme(REFORMES[i % REFORMES.length]));
  }
  assert.ok(g.journal.length <= ECONOMIE_GOUVERNER.JOURNAL_MAX, `journal trop long : ${g.journal.length}`);
  for (const id in g.personas) {
    assert.ok(g.personas[id].recits.length <= ECONOMIE_GOUVERNER.RECITS_MAX, `récits trop nombreux pour ${id}`);
  }
});

test('finDeTour : applique un choc départemental borné', () => {
  let g = creerPartie({ seed: 3, familleId: 'localiste' });
  g = finDeTour(g, { effets: {}, cout: 0, libelle: 'Réponse à la sécheresse', choc: { dept: '032', montant: 200 } });
  assert.ok(g.chocs['032'] <= 100 && g.chocs['032'] >= -100, `choc hors bornes : ${g.chocs['032']}`);
});

test('finDeTour : détecte la fin de mandat au tour 60 (réélu par défaut, verdict détaillé en E6)', () => {
  let g = creerPartie({ seed: 22, familleId: 'gauche-rupture' });
  for (let i = 0; i < 60; i++) {
    g = finDeTour(g, { effets: {}, cout: 0, libelle: null });
    if (g.fin) break;
  }
  assert.ok(g.fin, 'la partie doit se terminer au bout de 60 tours');
  assert.ok(['reelu', 'demission'].includes(g.fin.type));
});

test('finDeTour : reconnaît les échéances du calendrier dans le journal', () => {
  let g = creerPartie({ seed: 41, familleId: 'lib-europeen' });
  let vuPLF = false;
  for (let i = 0; i < 6 && !g.fin; i++) {
    g = finDeTour(g, { effets: {}, cout: 0, libelle: null });
    if (g.journal.some((l) => l.includes('finances'))) vuPLF = true;
  }
  assert.ok(vuPLF, 'le PLF 2028 (tour 4) doit apparaître dans le journal');
  assert.equal(CALENDRIER.find((e) => e.tour === 4).type, 'plf');
});

test('humeurDepartement : toujours bornée à [-100, 100], y compris sous chocs extrêmes', () => {
  let g = creerPartie({ seed: 6, familleId: 'eco-sociale' });
  g.chocs['059'] = 500; // valeur artificielle hors bornes pour tester le clamp de lecture
  for (const d of DEPARTEMENTS) {
    const h = humeurDepartement(g, d.code);
    assert.ok(h >= -100 && h <= 100, `${d.code} : humeur ${h} hors bornes`);
  }
});

test('REFORMES : 24 entrées dérivées des THEMES, ids uniques', () => {
  assert.equal(REFORMES.length, 24);
  const ids = new Set(REFORMES.map((r) => r.id));
  assert.equal(ids.size, 24);
  for (const r of REFORMES) assert.equal(typeof r.cout, 'number');
});

test('EVENEMENTS : au moins 15 crises, chacune avec 2 à 3 réponses chiffrées', () => {
  assert.ok(EVENEMENTS.length >= 15, `seulement ${EVENEMENTS.length} événements`);
  for (const e of EVENEMENTS) {
    assert.ok(e.reponses.length >= 2 && e.reponses.length <= 3, `${e.id} : ${e.reponses.length} réponses`);
    for (const r of e.reponses) assert.equal(typeof r.cout, 'number');
    if (e.local) assert.ok(Array.isArray(e.deptsPossibles) && e.deptsPossibles.length > 0, `${e.id} local sans deptsPossibles`);
  }
});
