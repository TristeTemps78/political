// Moteur du mode Gouverner — 100 % PUR : aucun accès DOM/localStorage, testable
// directement sous Node (cf. tests/gouverner.test.mjs, tools/simulate-gouverner.mjs).
// La couche institutionnelle (votes, 49.3, dissolution, référendum) est spécifiée
// et implémentée en E4 (js/assemblee.js) ; ici on ne pose que les crochets prévus
// par le plan (assemblee passée en paramètre, échéances reconnues dans le journal).

import { FAMILLES, DEPARTEMENTS, MAJORITE_ABSOLUE, CIRCOS, mulberry32 } from './data.js';
import { PERSONAS, AXES_GOUVERNER, poidsSegments, reagirPersona, tirerRecit } from './personas.js';
import { CALENDRIER, EVENEMENTS } from './mandat.js';

// Toute constante d'économie du mode Gouverner vit ici, avec sa justification
// (cf. docs_architecture/03_game_loop.md, section à compléter en E7).
export const ECONOMIE_GOUVERNER = {
  POPULARITE_INIT: 52,        // léger état de grâce post-élection, sans excès
  K_REACTION: 35,             // calibré pour que dot∈[-1,1] × sensibilité produise ±25 max (cf. reagirPersona)
  USURE_493: 6,                // coût de popularité du 49.3 : contourner le débat a un prix politique
  COUT_NEGOCIER: 20,            // capital dépensé pour négocier un vote (réservé à assemblee.js, E4)
  RECOMP_FICHE: 5,                // capital gagné à la 1re lecture d'une fiche (réservé à fiches.js, déjà livré)
  DECAY_HUMEUR: 0.1,               // 10 %/tour : les humeurs s'estompent, rien n'est figé pour un mandat
  DECAY_CHOC: 0.15,                 // les chocs locaux (crises) s'atténuent plus vite que les humeurs de fond
  LIGNE_LISSAGE: 0.15,               // poids de la décision du mois dans la moyenne mobile de la ligne politique
  RECITS_MAX: 12,                     // plafond de récits par persona (mémoire bornée, cf. schéma v3)
  JOURNAL_MAX: 12,                     // plafond du journal (mémoire bornée, cf. schéma v3)
  SEUIL_HOSTILITE_ASSEMBLEE: 0.35,      // gouvernement minoritaire si < 35 % des sièges — condition de censure spontanée
  SEUIL_CENSURE_SPONTANEE: 30,           // popularité en-dessous de laquelle une censure spontanée devient possible
  PROBA_CENSURE_SPONTANEE: 0.12,          // probabilité par tour sous condition — crédible sans être systématique
  CENSURES_AVANT_DEMISSION: 2,             // 2 motions adoptées → démission (fin de partie), cf. plan
  PROBA_EVENEMENT: 0.35,                    // ~1 crise tous les 3 tours en moyenne, rythme d'un mandat réel
  SOLDE_INIT: -40,                           // Md€/an, déficit de départ réaliste (ordre de grandeur pédagogique)
};

const arrondi = (v) => Math.round(v * 10) / 10;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Poids « population » d'un persona pour la moyenne pondérée nationale : le
// nombre de circonscriptions de son département d'origine sert de proxy de
// taille démographique (dérivé de DEPARTEMENTS, rien n'est stocké).
const POIDS_POPULATION = Object.fromEntries(PERSONAS.map((p) => {
  const d = DEPARTEMENTS.find((x) => x.code === p.dept);
  return [p.id, d ? d.circos : 1];
}));
const TOTAL_POIDS_POPULATION = Object.values(POIDS_POPULATION).reduce((a, b) => a + b, 0);

function moyennePondereeHumeurs(g) {
  let somme = 0;
  for (const p of PERSONAS) somme += (g.personas[p.id]?.humeur || 0) * POIDS_POPULATION[p.id];
  return somme / TOTAL_POIDS_POPULATION;
}

function journaliser(g, texte) {
  g.journal.push(texte);
  if (g.journal.length > ECONOMIE_GOUVERNER.JOURNAL_MAX) g.journal.shift();
}

function pousserPlafonne(tableau, valeur, max) {
  tableau.push(valeur);
  if (tableau.length > max) tableau.shift();
}

// Répartition proportionnelle plausible de l'Assemblée : la famille incarnée et
// ses voisines idéologiques (dans l'ordre de FAMILLES, proxy simple de proximité)
// pèsent davantage. Aucune famille n'atteint la majorité absolue (289) — la
// composition institutionnelle réelle (coalitions, négociation) arrive en E4.
export function assembleeParDefaut(familleId) {
  const idx = FAMILLES.findIndex((f) => f.id === familleId);
  const base = idx === -1 ? 0 : idx;
  const poids = FAMILLES.map((_, i) => 1 / (1 + Math.abs(i - base)));
  const total = poids.reduce((a, b) => a + b, 0);
  const sieges = {};
  let attribues = 0;
  FAMILLES.forEach((f, i) => {
    const n = Math.round((poids[i] / total) * CIRCOS.length);
    sieges[f.id] = n;
    attribues += n;
  });
  // Corrige l'arrondi pour retomber exactement sur le nombre total de sièges.
  let ecart = CIRCOS.length - attribues;
  const ordre = FAMILLES.map((f) => f.id).sort();
  let i = 0;
  while (ecart !== 0) {
    sieges[ordre[i % ordre.length]] += ecart > 0 ? 1 : -1;
    ecart += ecart > 0 ? -1 : 1;
    i += 1;
  }
  // Écrête toute famille qui atteindrait la majorité absolue et redistribue
  // l'excédent : la majorité relative est un invariant du plan.
  const plafond = MAJORITE_ABSOLUE - 1;
  for (const f of FAMILLES) {
    if (sieges[f.id] >= MAJORITE_ABSOLUE) {
      let excedent = sieges[f.id] - plafond;
      sieges[f.id] = plafond;
      const autres = FAMILLES.filter((x) => x.id !== f.id).map((x) => x.id);
      let j = 0;
      while (excedent > 0) { sieges[autres[j % autres.length]] += 1; excedent -= 1; j += 1; }
    }
  }
  return sieges;
}

// Crée une nouvelle partie. `assemblee` est optionnelle : sa composition
// institutionnelle réelle arrive en E4 (composerAssemblee), un défaut simple
// et déterministe est fourni pour que le moteur soit testable dès E3.
export function creerPartie({ seed, familleId, assemblee } = {}) {
  if (seed === undefined || seed === null) throw new Error('creerPartie : seed requis (déterminisme du mandat).');
  if (!FAMILLES.some((f) => f.id === familleId)) throw new Error(`creerPartie : famille inconnue « ${familleId} ».`);
  return {
    seed, tour: 0,
    familleId, coalition: [],
    assemblee: assemblee || assembleeParDefaut(familleId),
    jauges: { popularite: ECONOMIE_GOUVERNER.POPULARITE_INIT, solde: ECONOMIE_GOUVERNER.SOLDE_INIT },
    ligne: { eco: 0, societe: 0, ecologie: 0, europe: 0 },
    personas: Object.fromEntries(PERSONAS.map((p) => [p.id, { humeur: 0, recits: [] }])),
    chocs: {},
    senatHostile: false, x493: 0, dissolutionFaite: false, referendumsFaits: 0,
    censures: 0, // compteur provisoire de motions adoptées, avant l'assemblée complète (E4)
    enCours: null,      // texte en discussion { reformeId, phase } — machine à états (E4)
    evenementEnCours: null, // dernier événement tiré, en attente d'une réponse du joueur
    fichesVues: [], journal: [],
    fin: null, // { type: 'reelu'|'battu'|'censure'|'demission', tour }
  };
}

function assembleeHostile(g) {
  const total = Object.values(g.assemblee).reduce((a, b) => a + b, 0) || CIRCOS.length;
  const siegesGouvernement = g.assemblee[g.familleId] || 0;
  return siegesGouvernement / total < ECONOMIE_GOUVERNER.SEUIL_HOSTILITE_ASSEMBLEE;
}

// Décision du mois attendue par finDeTour :
// { effets: { eco?, societe?, ecologie?, europe? }, cout: number (Md€, - = dépense),
//   libelle?: string, force493?: boolean, choc?: { dept, montant } }
// Résolue par l'appelant (réforme votée, réponse à un événement, arbitrage de PLF) —
// gouverner.js n'a pas besoin de savoir laquelle de ces sources l'a produite.
const DECISION_VIDE = Object.freeze({ effets: {}, cout: 0, libelle: 'Aucune décision notable ce mois-ci.' });

export function finDeTour(g, decision = DECISION_VIDE) {
  const rng = mulberry32(g.seed + g.tour);
  const effets = decision.effets || {};

  // 1. Effets → ligne politique, en moyenne mobile (cohérence dans le temps).
  for (const axe of AXES_GOUVERNER) {
    const val = effets[axe] || 0;
    g.ligne[axe] = arrondi(
      g.ligne[axe] * (1 - ECONOMIE_GOUVERNER.LIGNE_LISSAGE) + val * ECONOMIE_GOUVERNER.LIGNE_LISSAGE
    );
  }

  // 2. Réactions des personas, récit tiré par PRNG seedé, journalisées.
  for (const p of PERSONAS) {
    const etat = g.personas[p.id];
    const reaction = reagirPersona(p, effets, ECONOMIE_GOUVERNER.K_REACTION);
    etat.humeur = clamp(arrondi(etat.humeur + reaction), -100, 100);
    if (reaction !== 0) {
      const recit = tirerRecit(p, reaction, rng);
      pousserPlafonne(etat.recits, recit, ECONOMIE_GOUVERNER.RECITS_MAX);
      journaliser(g, `${p.emoji} ${p.nom} : ${recit}`);
    }
  }

  // 3. Décroissance des humeurs et des chocs locaux.
  for (const id in g.personas) {
    g.personas[id].humeur = arrondi(g.personas[id].humeur * (1 - ECONOMIE_GOUVERNER.DECAY_HUMEUR));
  }
  if (decision.choc) {
    const cur = g.chocs[decision.choc.dept] || 0;
    g.chocs[decision.choc.dept] = clamp(arrondi(cur + decision.choc.montant), -100, 100);
  }
  for (const dept of Object.keys(g.chocs)) {
    const v = g.chocs[dept] * (1 - ECONOMIE_GOUVERNER.DECAY_CHOC);
    if (Math.abs(v) < 0.5) delete g.chocs[dept];
    else g.chocs[dept] = arrondi(v);
  }

  // 4. Jauges : popularité = moyenne pondérée des humeurs, solde budgétaire.
  // L'usure du 49.3 passe par les humeurs et non par une soustraction directe
  // de popularité : celle-ci étant recalculée chaque tour depuis les humeurs,
  // un malus direct s'évaporerait dès le tour suivant. -USURE_493 d'humeur
  // ≈ -USURE_493/2 points de popularité, cumulatifs, qui s'estompent ensuite
  // au rythme de DECAY_HUMEUR.
  if (decision.force493) {
    g.x493 += 1;
    for (const id in g.personas) {
      g.personas[id].humeur = clamp(arrondi(g.personas[id].humeur - ECONOMIE_GOUVERNER.USURE_493), -100, 100);
    }
    journaliser(g, `📜 49.3 engagé — « ${decision.libelle || 'texte du mois'} » (usure de popularité).`);
  } else if (decision.libelle) {
    journaliser(g, `🏛️ ${decision.libelle}`);
  }
  g.jauges.popularite = clamp(Math.round(50 + moyennePondereeHumeurs(g) / 2), 0, 100);
  g.jauges.solde = arrondi(g.jauges.solde + (decision.cout || 0));

  // 5. Opposition : censure spontanée si popularité basse et Assemblée hostile.
  // Mécanique complète (négociation, vote à 289) posée en E4 (js/assemblee.js) ;
  // ce jet probabiliste est le crochet minimal demandé pour la boucle de tour E3.
  if (!g.fin && g.jauges.popularite < ECONOMIE_GOUVERNER.SEUIL_CENSURE_SPONTANEE && assembleeHostile(g)) {
    if (rng() < ECONOMIE_GOUVERNER.PROBA_CENSURE_SPONTANEE) {
      g.censures += 1;
      journaliser(g, `⚠️ Motion de censure spontanée adoptée (${g.censures}/${ECONOMIE_GOUVERNER.CENSURES_AVANT_DEMISSION}).`);
      if (g.censures >= ECONOMIE_GOUVERNER.CENSURES_AVANT_DEMISSION) {
        g.fin = { type: 'demission', tour: g.tour };
      }
    }
  }

  // 6. Échéances du calendrier + tirage d'un événement (déterminisme total).
  const echeance = CALENDRIER.find((e) => e.tour === g.tour);
  if (echeance) journaliser(g, `📅 ${echeance.libelle}`);
  if (!g.fin && rng() < ECONOMIE_GOUVERNER.PROBA_EVENEMENT) {
    const evt = EVENEMENTS[Math.floor(rng() * EVENEMENTS.length)];
    g.evenementEnCours = { id: evt.id, titre: evt.titre };
    journaliser(g, `🚨 ${evt.titre}`);
  } else if (!g.fin) {
    g.evenementEnCours = null;
  }

  // 7. Avancement du tour et détection de fin.
  g.tour += 1;
  if (!g.fin && g.tour >= 60) {
    // Verdict département par département : détaillé en E6 (election2032).
    g.fin = { type: 'reelu', tour: g.tour };
    journaliser(g, '🗳️ Fin de mandat — le verdict des urnes tombe (détail : élection 2032).');
  }
  return g;
}

// Humeur départementale DÉRIVÉE, jamais stockée : moyenne pondérée des humeurs
// des personas (poidsSegments, dérivé de DEPARTEMENTS) + choc local éventuel.
export function humeurDepartement(g, codeDept) {
  const poids = poidsSegments(codeDept);
  let somme = 0;
  for (const p of PERSONAS) somme += (poids[p.id] || 0) * (g.personas[p.id]?.humeur || 0);
  return clamp(Math.round(somme + (g.chocs[codeDept] || 0)), -100, 100);
}
