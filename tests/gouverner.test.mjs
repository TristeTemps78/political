import test from 'node:test';
import assert from 'node:assert/strict';
import {
  creerPartie, finDeTour, humeurDepartement, assembleeParDefaut, election2032,
  participationDepartement, ECONOMIE_GOUVERNER,
} from '../js/gouverner.js';
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
  assert.equal(g.derniereEcheance, null);
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

test('finDeTour : détecte la fin de mandat au tour 60 (verdict de la présidentielle 2032)', () => {
  let g = creerPartie({ seed: 22, familleId: 'gauche-rupture' });
  for (let i = 0; i < 60; i++) {
    g = finDeTour(g, { effets: {}, cout: 0, libelle: null });
    if (g.fin) break;
  }
  assert.ok(g.fin, 'la partie doit se terminer au bout de 60 tours');
  assert.ok(['reelu', 'battu', 'demission'].includes(g.fin.type));
  if (g.fin.type === 'reelu' || g.fin.type === 'battu') {
    assert.equal(typeof g.fin.verdict.national, 'number');
    assert.equal(typeof g.fin.verdict.participation, 'number');
  }
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

// --- E6 : élections intermédiaires + fin de mandat 2032 ---------------------

test('participationDepartement : dérivée, bornée [0,100], jamais stockée', () => {
  for (const d of DEPARTEMENTS) {
    const t = participationDepartement(d.code);
    assert.ok(t >= 0 && t <= 100, `${d.code} : participation ${t} hors [0,100]`);
  }
});

test('européennes (tour 24) : score et participation journalisés, malus si score faible', () => {
  function jouer(humeurInit) {
    const g = creerPartie({ seed: 2, familleId: 'eco-sociale' });
    g.tour = 24;
    for (const id in g.personas) g.personas[id].humeur = humeurInit;
    return finDeTour(g, { effets: {}, cout: 0, libelle: null });
  }
  const gBas = jouer(-100);
  assert.equal(gBas.derniereEcheance.type, 'europeennes');
  assert.equal(gBas.derniereEcheance.fiche, 'abstention-participation');
  assert.ok(gBas.derniereEcheance.resultat.malus, 'un score très faible doit déclencher le malus de popularité');

  const gHaut = jouer(100);
  assert.ok(!gHaut.derniereEcheance.resultat.malus, 'un score élevé ne doit pas déclencher le malus');
  assert.ok(gHaut.derniereEcheance.resultat.participation > 0 && gHaut.derniereEcheance.resultat.participation <= 100);
});

test('sénatoriales (tour 27) : senatHostile déterministe selon la popularité', () => {
  function testerSenat(humeurInit) {
    const g = creerPartie({ seed: 1, familleId: 'eco-sociale' });
    g.tour = 27;
    for (const id in g.personas) g.personas[id].humeur = humeurInit;
    return finDeTour(g, { effets: {}, cout: 0, libelle: null });
  }
  const gBas = testerSenat(-100);
  assert.equal(gBas.senatHostile, true, 'popularité basse → Sénat hostile');
  assert.equal(gBas.derniereEcheance.type, 'senatoriales');
  assert.equal(gBas.derniereEcheance.fiche, 'navette-parlementaire-senat');

  const gHaut = testerSenat(100);
  assert.equal(gHaut.senatHostile, false, 'popularité haute → Sénat non hostile');
});

test('sénatoriales : Sénat hostile renchérit de SURCOUT_NAVETTE_SENAT_HOSTILE le coût d’une dépense', () => {
  const g = creerPartie({ seed: 1, familleId: 'eco-sociale' });
  g.senatHostile = true;
  const soldeAvant = g.jauges.solde;
  finDeTour(g, { effets: {}, cout: -10, libelle: null });
  const depenseAttendue = -10 * (1 + ECONOMIE_GOUVERNER.SURCOUT_NAVETTE_SENAT_HOSTILE);
  assert.ok(Math.abs((g.jauges.solde - soldeAvant) - depenseAttendue) < 0.05, `solde ${g.jauges.solde - soldeAvant} ≠ attendu ${depenseAttendue}`);
});

test('municipales (tour 45) : chocs appliqués aux départements les plus mécontents/contents', () => {
  const g = creerPartie({ seed: 3, familleId: 'eco-sociale' });
  g.tour = 45;
  g.personas.nadia.humeur = -100;  // dept 059 : très mécontent, forte pondération locale
  g.personas.martine.humeur = 100; // dept 066 : très content, forte pondération locale
  finDeTour(g, { effets: {}, cout: 0, libelle: null });

  assert.equal(g.derniereEcheance.type, 'municipales');
  assert.equal(g.derniereEcheance.fiche, 'autres-scrutins');
  assert.equal(g.derniereEcheance.resultat.deptsChocNegatif.length, ECONOMIE_GOUVERNER.N_DEPTS_CHOC_MUNICIPALES);
  assert.equal(g.derniereEcheance.resultat.deptsChocPositif.length, ECONOMIE_GOUVERNER.N_DEPTS_CHOC_MUNICIPALES);
  assert.ok(g.derniereEcheance.resultat.deptsChocNegatif.includes('059'), 'le département le plus mécontent doit être sanctionné');
  assert.ok(g.derniereEcheance.resultat.deptsChocPositif.includes('066'), 'le département le plus content doit être récompensé');
  assert.equal(g.chocs['059'], ECONOMIE_GOUVERNER.CHOC_MUNICIPALES_NEGATIF);
  assert.equal(g.chocs['066'], ECONOMIE_GOUVERNER.CHOC_MUNICIPALES_POSITIF);
});

test('election2032 : déterministe, pourcentages entiers ∈ [0,100], national cohérent avec parDept', () => {
  const construire = () => {
    const g = creerPartie({ seed: 55, familleId: 'social-democrate' });
    g.tour = 59;
    let i = 0;
    for (const id in g.personas) { g.personas[id].humeur = ((i * 37) % 161) - 80; i += 1; } // variées, déterministes
    return g;
  };
  const g1 = construire();
  const g2 = construire();
  election2032(g1);
  election2032(g2);
  assert.deepEqual(g1.fin, g2.fin, 'election2032 doit être déterministe à état identique');

  for (const [code, pct] of Object.entries(g1.fin.verdict.parDept)) {
    assert.ok(Number.isInteger(pct), `${code} : pourcentage non entier (${pct})`);
    assert.ok(pct >= 0 && pct <= 100, `${code} : pourcentage hors [0,100] (${pct})`);
  }

  // Recalcul indépendant du national à partir de parDept (pondération circos).
  let circosGagnes = 0, circosTotal = 0;
  for (const d of DEPARTEMENTS) {
    circosTotal += d.circos;
    if (g1.fin.verdict.parDept[d.code] > 50) circosGagnes += d.circos;
  }
  const nationalAttendu = Math.round((circosGagnes / circosTotal) * 100);
  assert.equal(g1.fin.verdict.national, nationalAttendu);
  assert.equal(g1.fin.type, g1.fin.verdict.national >= 50 ? 'reelu' : 'battu');

  // Sérialisable (contrainte localStorage).
  const serialise = JSON.parse(JSON.stringify(g1));
  assert.deepEqual(serialise.fin, g1.fin);
});

test('election2032 : cas extrêmes cohérents avec le seuil de 50 % (reelu/battu)', () => {
  function verdictAvecHumeur(h) {
    const g = creerPartie({ seed: 1, familleId: 'lib-europeen' });
    g.tour = 59;
    for (const id in g.personas) g.personas[id].humeur = h;
    election2032(g);
    return g.fin;
  }
  const positif = verdictAvecHumeur(100);
  const negatif = verdictAvecHumeur(-100);
  assert.equal(positif.type, 'reelu');
  assert.equal(positif.verdict.national, 100);
  assert.equal(negatif.type, 'battu');
  assert.equal(negatif.verdict.national, 0);
});
