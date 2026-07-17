import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composerAssemblee, deposerTexte, intentionsDeVote, negocier, voterTexte,
  engager493, voterCensure, dissoudre, referendum, ECONOMIE_ASSEMBLEE, FICHE_PAR_MECANISME,
} from '../js/assemblee.js';
import { creerPartie, assembleeParDefaut, ECONOMIE_GOUVERNER } from '../js/gouverner.js';
import { REFORMES } from '../js/mandat.js';
import { FAMILLES, MAJORITE_ABSOLUE, CIRCOS } from '../js/data.js';
import { ficheParId } from '../js/fiches.js';

function partie(familleId, seed = 1) {
  return creerPartie({ seed, familleId });
}

// --- composerAssemblee -------------------------------------------------------

test('composerAssemblee : sans options, délègue à assembleeParDefaut', () => {
  for (const f of FAMILLES) {
    assert.deepEqual(composerAssemblee(f.id), assembleeParDefaut(f.id));
  }
});

test('composerAssemblee : renormalise un héritage Conquête quelconque sur 577, aucune famille ≥ 289', () => {
  const heritages = [
    Object.fromEntries(FAMILLES.map((f, i) => [f.id, (i + 1) * 37])), // Σ arbitraire, très inégal
    Object.fromEntries(FAMILLES.map((f) => [f.id, 3])), // Σ minuscule (21)
    { [FAMILLES[0].id]: 900, [FAMILLES[1].id]: 100 }, // familles manquantes, Σ énorme, une famille dominante
  ];
  for (const sieges of heritages) {
    const assemblee = composerAssemblee(FAMILLES[2].id, { sieges });
    const total = Object.values(assemblee).reduce((a, b) => a + b, 0);
    assert.equal(total, CIRCOS.length);
    for (const [id, n] of Object.entries(assemblee)) {
      assert.ok(n < MAJORITE_ABSOLUE, `${id} atteint ${n} sièges`);
      assert.ok(n >= 0);
    }
    assert.equal(Object.keys(assemblee).length, FAMILLES.length);
  }
});

// --- machine à états : dépôt / vote ------------------------------------------

test('deposerTexte : refuse un second dépôt tant que le premier n’est pas résolu', () => {
  let g = partie('social-democrate');
  g = deposerTexte(g, REFORMES[0].id);
  assert.ok(g.enCours);
  assert.throws(() => deposerTexte(g, REFORMES[1].id));
});

test('deposerTexte : refuse une réforme inconnue', () => {
  const g = partie('social-democrate');
  assert.throws(() => deposerTexte(g, 'reforme-inexistante'));
});

test('voterTexte / intentionsDeVote : refusent en l’absence de texte déposé', () => {
  const g = partie('social-democrate');
  assert.throws(() => voterTexte(g));
  assert.throws(() => intentionsDeVote(g));
});

test('intentionsDeVote : Σ des positions = 577 pour toute réforme et toute famille jouée', () => {
  for (const f of FAMILLES) {
    for (const r of REFORMES) {
      let g = partie(f.id);
      g = deposerTexte(g, r.id);
      const { pour, contre, abstention } = intentionsDeVote(g);
      assert.equal(pour + contre + abstention, CIRCOS.length, `familleId=${f.id} reforme=${r.id}`);
    }
  }
});

test('voterTexte : adopté si pour > contre, nettoie g.enCours et fournit une decision exploitable', () => {
  let g = partie('gauche-rupture');
  g = deposerTexte(g, REFORMES[0].id);
  const resultat = voterTexte(g);
  assert.equal(resultat.pour > resultat.contre, resultat.adopte);
  assert.equal(g.enCours, null);
  assert.equal(typeof resultat.decision.cout, 'number');
  assert.equal(resultat.fiche, FICHE_PAR_MECANISME.vote);
  assert.ok(ficheParId(resultat.fiche), 'la fiche référencée doit exister dans js/fiches.js');
});

test('voterTexte : cas limite d’égalité stricte (pour === contre) → rejeté', () => {
  // Reforme fortement clivante eco+ : droite-gouvernement (eco:-0.6) et
  // lib-europeen (eco:-0.5) votent contre par cosinus ; gauche-rupture est ici
  // la famille du joueur, donc forcée « pour ». Sièges construits à la main
  // pour obtenir exactement 288 pour / 288 contre (le reste à 0).
  const reforme = REFORMES.find((r) => r.id === 'hausse-salaires'); // effets { eco: 0.8 }
  assert.ok(reforme);
  let g = partie('gauche-rupture');
  g.assemblee = Object.fromEntries(FAMILLES.map((f) => [f.id, 0]));
  g.assemblee['gauche-rupture'] = 288;
  g.assemblee['droite-gouvernement'] = 288;
  g = deposerTexte(g, reforme.id);
  const { pour, contre } = intentionsDeVote(g);
  assert.equal(pour, 288);
  assert.equal(contre, 288);
  const resultat = voterTexte(g);
  assert.equal(resultat.pour, resultat.contre);
  assert.equal(resultat.adopte, false);
});

test('voterTexte : refuse un texte engagé sous 49.3 (résolution via voterCensure)', () => {
  let g = partie('lib-europeen');
  g = deposerTexte(g, REFORMES[0].id);
  g = engager493(g);
  assert.throws(() => voterTexte(g));
});

// --- négociation --------------------------------------------------------------

test('negocier : idempotent (déjà soutien = gratuit) et fait basculer une position', () => {
  // 'baisser-depense' (eco: -0.9) : 'gauche-rupture' (eco:0.9) y est fortement
  // opposée par cosinus ('contre'). Le joueur est 'droite-gouvernement' (aligné).
  const reforme = REFORMES.find((r) => r.id === 'baisser-depense');
  assert.ok(reforme);
  let g = partie('droite-gouvernement');
  g = deposerTexte(g, reforme.id);
  const avant = intentionsDeVote(g);
  assert.equal(avant.positions['gauche-rupture'], 'contre');

  let res = negocier(g, 'gauche-rupture', 100);
  assert.equal(res.cout, ECONOMIE_GOUVERNER.COUT_NEGOCIER);
  assert.equal(res.capital, 100 - ECONOMIE_GOUVERNER.COUT_NEGOCIER);
  g = res.g;
  const apres = intentionsDeVote(g);
  assert.equal(apres.positions['gauche-rupture'], 'pour');
  assert.ok(apres.pour > avant.pour);

  // Deuxième négociation sur la même famille : idempotente, sans coût.
  res = negocier(g, 'gauche-rupture', 5);
  assert.equal(res.cout, 0);
  assert.equal(res.capital, 5);
  assert.equal(g.enCours.soutiens.filter((id) => id === 'gauche-rupture').length, 1);
});

test('negocier : refuse si capital insuffisant, ou famille/texte invalides', () => {
  let g = partie('droite-gouvernement');
  g = deposerTexte(g, REFORMES[0].id);
  assert.throws(() => negocier(g, 'gauche-rupture', 1));
  assert.throws(() => negocier(g, 'parti-inexistant', 1000));
  const g2 = partie('droite-gouvernement');
  assert.throws(() => negocier(g2, 'gauche-rupture', 1000));
});

// --- 49.3 et motion de censure ------------------------------------------------

test('engager493 : bascule la phase, refuse un second engagement', () => {
  let g = partie('souverainiste');
  g = deposerTexte(g, REFORMES[0].id);
  g = engager493(g);
  assert.equal(g.enCours.phase, 'censure');
  assert.throws(() => engager493(g));
});

test('voterCensure : adoptée seulement si ≥ 289 voix pour (288 → rejetée, 289 → adoptée)', () => {
  function scenario(siegesOpposition) {
    // Popularité très basse : seuil d'hostilité clampé à 0, donc toute famille
    // hors gouvernement/coalition vote systématiquement « pour » (hostilite ∈
    // [0,1] ≥ seuil 0), quelle que soit la ligne politique.
    let g = partie('lib-europeen');
    g.jauges.popularite = -1000;
    g.assemblee = Object.fromEntries(FAMILLES.map((f) => [f.id, 0]));
    g.assemblee['lib-europeen'] = CIRCOS.length - siegesOpposition;
    g.assemblee['souverainiste'] = siegesOpposition;
    return g;
  }
  const rejetee = voterCensure(scenario(288));
  assert.equal(rejetee.pour, 288);
  assert.equal(rejetee.adopte, false);

  const adoptee = voterCensure(scenario(289));
  assert.equal(adoptee.pour, 289);
  assert.equal(adoptee.adopte, true);
});

test('voterCensure : motion adoptée → g.censures += 1, démission au seuil CENSURES_AVANT_DEMISSION', () => {
  let g = partie('lib-europeen');
  g.jauges.popularite = -1000;
  g.assemblee = Object.fromEntries(FAMILLES.map((f) => [f.id, 0]));
  g.assemblee['lib-europeen'] = CIRCOS.length - 400;
  g.assemblee['souverainiste'] = 400;
  for (let i = 0; i < ECONOMIE_GOUVERNER.CENSURES_AVANT_DEMISSION; i++) {
    const resultat = voterCensure(g);
    assert.equal(resultat.adopte, true);
  }
  assert.equal(g.censures, ECONOMIE_GOUVERNER.CENSURES_AVANT_DEMISSION);
  assert.ok(g.fin && g.fin.type === 'demission');
});

test('voterCensure : motion rejetée après 49.3 → texte considéré adopté (decision.force493)', () => {
  let g = partie('lib-europeen');
  g.jauges.popularite = 1000; // seuil d'hostilité maximal → personne ne vote pour
  const reforme = REFORMES[0];
  g = deposerTexte(g, reforme.id);
  g = engager493(g);
  const resultat = voterCensure(g);
  assert.equal(resultat.adopte, false);
  assert.equal(resultat.decision.force493, true);
  assert.deepEqual(resultat.decision.effets, reforme.effets);
  assert.equal(g.enCours, null);
  assert.equal(resultat.fiche, FICHE_PAR_MECANISME.censure);
});

// --- dissolution ---------------------------------------------------------------

test('dissoudre : refuse une seconde dissolution dans le même mandat', () => {
  let g = partie('eco-sociale');
  g = dissoudre(g);
  assert.equal(g.dissolutionFaite, true);
  assert.throws(() => dissoudre(g));
});

test('dissoudre : la nouvelle Assemblée reste Σ = 577, aucune famille ≥ 289, et vide g.enCours', () => {
  let g = partie('eco-sociale');
  g = deposerTexte(g, REFORMES[0].id);
  g.jauges.popularite = 90; // cas favorable : la famille du joueur doit progresser
  const avant = g.assemblee['eco-sociale'];
  g = dissoudre(g);
  const total = Object.values(g.assemblee).reduce((a, b) => a + b, 0);
  assert.equal(total, CIRCOS.length);
  for (const n of Object.values(g.assemblee)) assert.ok(n < MAJORITE_ABSOLUE && n >= 0);
  assert.ok(g.assemblee['eco-sociale'] >= avant, 'popularité haute : la famille du joueur ne doit pas reculer');
  assert.equal(g.enCours, null);
});

test('dissoudre : accepte une nouvelle assemblée fournie, renormalisée', () => {
  let g = partie('eco-sociale');
  const fournie = Object.fromEntries(FAMILLES.map((f) => [f.id, 50]));
  g = dissoudre(g, fournie);
  const total = Object.values(g.assemblee).reduce((a, b) => a + b, 0);
  assert.equal(total, CIRCOS.length);
});

// --- référendum ------------------------------------------------------------

test('referendum : refuse un thème hors périmètre (institutions/europe uniquement)', () => {
  const g = partie('social-democrate');
  const horsPerimetre = REFORMES.find((r) => r.themeId === 'fiscalite');
  assert.ok(horsPerimetre);
  assert.throws(() => referendum(g, horsPerimetre.id));
});

test('referendum : accepte institutions/europe et se borne à 2 par mandat', () => {
  const eligibles = REFORMES.filter((r) => r.themeId === 'institutions' || r.themeId === 'europe');
  assert.ok(eligibles.length >= 3);
  let g = partie('social-democrate');
  const r1 = referendum(g, eligibles[0].id);
  assert.equal(g.referendumsFaits, 1);
  assert.equal(typeof r1.decision.cout, 'number');
  const r2 = referendum(g, eligibles[1].id);
  assert.equal(g.referendumsFaits, 2);
  assert.equal(r2.fiche, FICHE_PAR_MECANISME.referendum);
  assert.throws(() => referendum(g, eligibles[2].id));
});

// --- déterminisme -----------------------------------------------------------

test('déterminisme : mêmes entrées → mêmes sorties (intentionsDeVote, voterCensure)', () => {
  function jouerVote() {
    let g = partie('social-democrate', 42);
    g = deposerTexte(g, REFORMES[5].id);
    return intentionsDeVote(g);
  }
  assert.deepEqual(jouerVote(), jouerVote());

  function jouerCensure() {
    const g = partie('social-democrate', 42);
    g.ligne = { eco: 0.4, societe: 0.2, ecologie: -0.1, europe: 0.3 };
    return voterCensure(g);
  }
  assert.deepEqual(jouerCensure(), jouerCensure());
});

// --- FICHE_PAR_MECANISME -----------------------------------------------------

test('FICHE_PAR_MECANISME : chaque id référencé existe réellement dans js/fiches.js', () => {
  for (const [mecanisme, ficheId] of Object.entries(FICHE_PAR_MECANISME)) {
    assert.ok(ficheParId(ficheId), `mécanisme ${mecanisme} référence une fiche inconnue « ${ficheId} »`);
  }
});

test('ECONOMIE_ASSEMBLEE : constantes documentées présentes', () => {
  assert.equal(typeof ECONOMIE_ASSEMBLEE.SEUIL_ADHESION_VOTE, 'number');
  assert.equal(typeof ECONOMIE_ASSEMBLEE.SEUIL_HOSTILITE_CENSURE, 'number');
  assert.equal(ECONOMIE_ASSEMBLEE.REFERENDUMS_MAX, 2);
});
