// Simulation d'équilibrage du mode Gouverner — exécute le VRAI moteur pur
// (js/gouverner.js) sous Node, patron de tools/simulate.mjs. Deux stratégies
// scriptées jouent un mandat complet (60 tours) :
//   - « cohérente »   : décisions systématiquement alignées avec une ligne fixe,
//                       budget surveillé (pénalise les options coûteuses).
//   - « incohérente »  : zigzag contradictoire tour après tour, 49.3 systématique
//                       tous les 4 tours, dépenses non maîtrisées.
// Usage : node tools/simulate-gouverner.mjs [nbParties]
// Pas d'assertions CI ici (prévues en E7) : le script affiche les résultats et
// vérifie seulement que l'écart entre les deux stratégies est du bon signe.

import { creerPartie, finDeTour } from '../js/gouverner.js';
import { REFORMES, EVENEMENTS } from '../js/mandat.js';
import { PERSONAS } from '../js/personas.js';
import { DEPARTEMENTS, FAMILLES } from '../js/data.js';

const N = Number(process.argv[2]) || 50;
const AXES = ['eco', 'societe', 'ecologie', 'europe'];
const FAMILLE_JOUEUR = FAMILLES.find((f) => f.id === 'social-democrate'); // incarnée, pour creerPartie

// Ligne cible de la stratégie cohérente : moyenne des vecteurs des personas,
// pondérée comme la popularité elle-même (taille du département d'origine,
// cf. js/gouverner.js:moyennePondereeHumeurs) — une ligne qui plaît réellement
// au plus grand nombre, pas une ligne partisane arbitraire.
const POIDS_POP = Object.fromEntries(PERSONAS.map((p) => {
  const d = DEPARTEMENTS.find((x) => x.code === p.dept);
  return [p.id, d ? d.circos : 1];
}));
const TOTAL_POIDS_POP = Object.values(POIDS_POP).reduce((a, b) => a + b, 0);
const LIGNE_POPULAIRE = Object.fromEntries(AXES.map((a) => [
  a, PERSONAS.reduce((s, p) => s + (p.vecteur[a] || 0) * POIDS_POP[p.id], 0) / TOTAL_POIDS_POP,
]));

function scoreEffets(effets, vecteur) {
  return AXES.reduce((s, a) => s + (effets[a] || 0) * (vecteur[a] || 0), 0);
}

// Sélectionne, parmi une liste d'options { effets, cout }, celle qui maximise
// `noter(opt)` — deux notations opposées ci-dessous portent les deux stratégies.
function choisir(options, noter) {
  let meilleure = null;
  let meilleurScore = -Infinity;
  for (const opt of options) {
    const score = noter(opt);
    if (score > meilleurScore) { meilleurScore = score; meilleure = opt; }
  }
  return meilleure;
}

// Sélectionne, parmi les `n` meilleures options selon `noter`, celle d'indice
// `index % n` (déterministe). Depuis l'élection présidentielle 2032
// (election2032, js/gouverner.js), le verdict est géographique — département
// par département, pondéré par circonscriptions — et non plus un simple
// score national moyen. Une stratégie qui rejoue en boucle LE même texte le
// mieux aligné sature une minorité géographique jusqu'à ±100 d'humeur (la
// « ligne populaire » plaît en moyenne mais écrase toujours les mêmes
// personas), ce qui peut faire perdre le pays malgré une popularité
// nationale confortable. Une stratégie cohérente réaliste traite plusieurs
// dossiers alignés au fil du mandat plutôt qu'un seul en boucle : cette
// rotation reste 100 % déterministe (indexée sur le tour), donc reproductible.
function choisirParmiLesMeilleurs(options, noter, n, index) {
  const triees = [...options].sort((a, b) => noter(b) - noter(a));
  return triees[index % Math.min(n, triees.length)];
}

const ROTATION_COHERENTE = 5; // cf. commentaire de choisirParmiLesMeilleurs ci-dessus

// Cohérente : maximise l'alignement avec la ligne choisie, pénalise modérément
// les options déficitaires (un budget géré n'est pas un budget ignoré).
function noterCoherent(opt, vecteur) {
  return scoreEffets(opt.effets, vecteur) - Math.max(0, -opt.cout) * 0.15;
}

// Incohérente : zigzague sur l'alignement (contredit la décision précédente)
// ET recherche activement les options les plus déficitaires — l'indiscipline
// budgétaire est aussi contradictoire que l'indiscipline idéologique.
function noterIncoherent(opt, vecteur, minimiser) {
  const align = scoreEffets(opt.effets, vecteur) * (minimiser ? -1 : 1);
  const depense = Math.max(0, -opt.cout);
  return align + depense * 0.6;
}

function decisionEvenement(g, vecteur, noter, coutChoc, rotation = 1) {
  const evt = EVENEMENTS.find((e) => e.id === g.evenementEnCours?.id);
  if (!evt) return null;
  const reponse = choisirParmiLesMeilleurs(evt.reponses, (opt) => noter(opt, vecteur), rotation, g.tour);
  return {
    effets: reponse.effets,
    cout: reponse.cout,
    libelle: `Réponse : ${reponse.libelle}`,
    choc: evt.local ? { dept: evt.deptsPossibles[0], montant: coutChoc } : undefined,
  };
}

function decisionCoherente(g, vecteur) {
  const parEvenement = decisionEvenement(g, vecteur, noterCoherent, -8, ROTATION_COHERENTE);
  if (parEvenement) return parEvenement;
  const reforme = choisirParmiLesMeilleurs(REFORMES, (opt) => noterCoherent(opt, vecteur), ROTATION_COHERENTE, g.tour);
  return { effets: reforme.effets, cout: reforme.cout, libelle: reforme.titre };
}

function decisionIncoherente(g, vecteur, tour) {
  // Contradictoire par construction : systématiquement l'option la MOINS
  // alignée avec ce que la population accueille bien, la plus déficitaire,
  // et le 49.3 engagé à chaque tour (usure de popularité maximale).
  const minimiser = true;
  const force493 = true;
  const noter = (opt) => noterIncoherent(opt, vecteur, minimiser);
  const parEvenement = decisionEvenement(g, vecteur, (opt, v) => noterIncoherent(opt, v, minimiser), -20);
  if (parEvenement) return { ...parEvenement, force493 };
  const reforme = choisir(REFORMES, noter);
  return { effets: reforme.effets, cout: reforme.cout, libelle: reforme.titre, force493 };
}

function jouerMandat(seed, strategie) {
  let g = creerPartie({ seed, familleId: FAMILLE_JOUEUR.id });
  for (let i = 0; i < 65 && !g.fin; i++) {
    const decision = strategie === 'coherente'
      ? decisionCoherente(g, LIGNE_POPULAIRE)
      : decisionIncoherente(g, LIGNE_POPULAIRE, g.tour);
    g = finDeTour(g, decision);
  }
  return g;
}

function moyenne(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function ecartType(arr) {
  const m = moyenne(arr);
  return Math.sqrt(moyenne(arr.map((v) => (v - m) ** 2)));
}

function simuler(strategie) {
  const popularites = [];
  const soldes = [];
  const types = {};
  for (let i = 0; i < N; i++) {
    const g = jouerMandat(2000 + i, strategie);
    popularites.push(g.jauges.popularite);
    soldes.push(g.jauges.solde);
    const type = g.fin?.type || 'inacheve';
    types[type] = (types[type] || 0) + 1;
  }
  return { popularites, soldes, types };
}

console.log(`Simulation Gouverner sur ${N} mandats par stratégie (famille incarnée : ${FAMILLE_JOUEUR.nom})\n`);

const coherente = simuler('coherente');
const incoherente = simuler('incoherente');

// Répartition des fins (E6 : reelu/battu/demission — 'reelu' n'est plus
// systématique depuis election2032, verdict département par département).
function repartitionFins(res) {
  const total = Object.values(res.types).reduce((a, b) => a + b, 0) || 1;
  return ['reelu', 'battu', 'demission', 'censure', 'inacheve']
    .filter((t) => res.types[t])
    .map((t) => `${t} ${res.types[t]}/${total} (${((res.types[t] / total) * 100).toFixed(0)}%)`)
    .join(', ');
}

function tauxReelu(res) {
  const total = Object.values(res.types).reduce((a, b) => a + b, 0) || 1;
  return ((res.types.reelu || 0) / total) * 100;
}

function rapport(nom, res) {
  console.log(`Stratégie ${nom} :`);
  console.log(`  popularité finale — moyenne ${moyenne(res.popularites).toFixed(1)}, écart-type ${ecartType(res.popularites).toFixed(1)}, min ${Math.min(...res.popularites)}, max ${Math.max(...res.popularites)}`);
  console.log(`  solde final       — moyenne ${moyenne(res.soldes).toFixed(1)} Md€, min ${Math.min(...res.soldes).toFixed(1)}, max ${Math.max(...res.soldes).toFixed(1)}`);
  console.log(`  répartition des fins — ${repartitionFins(res)}`);
}

rapport('cohérente', coherente);
rapport('incohérente', incoherente);

const ecartPopularite = moyenne(coherente.popularites) - moyenne(incoherente.popularites);
const ecartSolde = moyenne(coherente.soldes) - moyenne(incoherente.soldes);
console.log(`\nÉcart cohérente − incohérente : popularité ${ecartPopularite >= 0 ? '+' : ''}${ecartPopularite.toFixed(1)} pts, solde ${ecartSolde >= 0 ? '+' : ''}${ecartSolde.toFixed(1)} Md€`);
console.log(`Signe attendu (cohérente > incohérente sur les deux jauges) : ${ecartPopularite > 0 && ecartSolde > 0 ? 'OK ✅' : 'À REGARDER ⚠️ (cibles chiffrées définitives en E7)'}`);

const reeluCoherente = tauxReelu(coherente);
const reeluIncoherente = tauxReelu(incoherente);
console.log(`\nTaux de réélection — cohérente ${reeluCoherente.toFixed(0)}%, incohérente ${reeluIncoherente.toFixed(0)}%`);
console.log(`Signe attendu (cohérente >> incohérente) : ${reeluCoherente > reeluIncoherente ? 'OK ✅' : 'À REGARDER ⚠️ (cibles chiffrées définitives en E7)'}`);
