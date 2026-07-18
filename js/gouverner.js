// Moteur du mode Gouverner — 100 % PUR : aucun accès DOM/localStorage, testable
// directement sous Node (cf. tests/gouverner.test.mjs, tools/simulate-gouverner.mjs).
// La couche institutionnelle (votes, 49.3, dissolution, référendum) est spécifiée
// et implémentée en E4 (js/assemblee.js) ; ici on ne pose que les crochets prévus
// par le plan (assemblee passée en paramètre, échéances reconnues dans le journal).

import { FAMILLES, DEPARTEMENTS, MAJORITE_ABSOLUE, CIRCOS, mulberry32 } from './data.js';
import { PERSONAS, AXES_GOUVERNER, poidsSegments, reagirPersona, tirerRecit, participation } from './personas.js';
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

  // --- Élections intermédiaires (E6) ---------------------------------------
  SIGMOID_K_VERDICT: 40,                      // pente de la logistique humeur→soutien : à ±40 d'humeur (rarement
                                               // dépassé en pratique), le soutien est déjà nettement majoritaire/
                                               // minoritaire (~73 %/27 %) sans jamais saturer complètement 0/100 %.
  SEUIL_EUROPEENNES_MALUS: 45,                // un score < 45 % à un scrutin-sondage grandeur nature (participation
                                               // plus faible, vote plus contestataire) se lit comme un désaveu net.
  MALUS_EUROPEENNES_HUMEUR: 4,                // sanction politique modérée (environ 2/3 de l'USURE_493) : l'onde de
                                               // choc d'un mauvais résultat intermédiaire, sans plomber tout le mandat.
  SEUIL_SENAT_HOSTILE: 45,                    // en dessous de 45 % de popularité au renouvellement partiel, le
                                               // collège des grands électeurs (élus locaux, plus lents à bouger que
                                               // l'opinion) bascule contre le gouvernement ; au-dessus, il reste prudent.
  SURCOUT_NAVETTE_SENAT_HOSTILE: 0.15,        // +15 % sur le coût budgétaire d'une décision quand le Sénat est
                                               // hostile : la navette qui s'éternise (allers-retours, CMP, dernier mot
                                               // de l'Assemblée) renchérit le compromis final, sans le rendre impossible.
  N_DEPTS_CHOC_MUNICIPALES: 3,                // aux municipales, les 3 départements aux deux extrêmes de l'humeur
                                               // reçoivent un choc local : lisible sur la carte, pas un bruit généralisé.
  CHOC_MUNICIPALES_NEGATIF: -8,               // choc local supplémentaire (ordre de grandeur d'une crise ponctuelle)
                                               // là où l'ancrage est déjà le plus faible : la défaite locale nourrit la défiance.
  CHOC_MUNICIPALES_POSITIF: 4,                // récompense deux fois plus faible que la sanction — asymétrie
                                               // documentée : l'électorat sanctionne plus qu'il ne récompense.
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

// Fonction logistique : convertit une humeur ∈ [-100,100] en probabilité de
// soutien ∈ ]0,1[ — jamais 0 % ni 100 % pile, même à humeur extrême (aucun
// département n'est acquis à 100 % d'avance, cf. election2032).
function sigmoid(x, k) {
  return 1 / (1 + Math.exp(-x / k));
}

// Moyenne pondérée des humeurs, poids = population × participation : sert au
// score des européennes (élection intermédiaire où l'abstention pèse déjà
// lourd, cf. fiche 'abstention-participation'). Un persona mécontent qui vote
// pèse davantage ici qu'un persona content mais abstentionniste.
function humeurPondereeParticipation(g) {
  let num = 0, denom = 0;
  for (const p of PERSONAS) {
    const w = POIDS_POPULATION[p.id] * participation(p.rapport);
    num += w * (g.personas[p.id]?.humeur || 0);
    denom += w;
  }
  return denom ? num / denom : 0;
}

// Participation nationale simulée aux scrutins intermédiaires : moyenne
// pondérée (population) des taux de participation par rapport à la
// politique. Ne dépend pas de l'humeur du moment (le rapport d'un persona à
// la politique est stable) : seul l'écart entre scrutins de mobilisations
// différentes justifierait une variation, hors périmètre de ce modèle simple.
function participationNationaleSimulee() {
  let num = 0;
  for (const p of PERSONAS) num += POIDS_POPULATION[p.id] * participation(p.rapport);
  return Math.round((num / TOTAL_POIDS_POPULATION) * 100);
}

// Taux de participation simulé d'UN département ∈ [0,100], dérivé (jamais
// stocké, même logique que humeurDepartement) : moyenne des taux de
// participation des personas, pondérée par leur poids local (poidsSegments).
// Réutilisé par election2032 (verdict départemental) et par l'UI (libellé de
// la carte du verdict) sans dupliquer le calcul.
export function participationDepartement(codeDept) {
  const poids = poidsSegments(codeDept);
  let total = 0;
  for (const p of PERSONAS) total += (poids[p.id] || 0) * participation(p.rapport);
  return Math.round(total * 100);
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
    fin: null, // { type: 'reelu'|'battu'|'censure'|'demission', tour, verdict? }
    // Dernière échéance électorale intermédiaire résolue (européennes,
    // sénatoriales, municipales) : { type, tour, fiche, resultat }. Champ
    // d'état dédié plutôt qu'un simple parsing du journal — celui-ci est
    // plafonné (JOURNAL_MAX) et purement textuel, impropre à piloter de façon
    // fiable un bouton « voir la fiche » côté UI. Un seul petit objet, écrasé
    // à chaque nouvelle échéance : aucune croissance non bornée, ajout au
    // schéma v3 assumé (cf. plan E6, aucune migration nécessaire : cette
    // partie du store n'est jamais lue par ancienne version du code, seule la
    // forme retournée par creerPartie compte).
    derniereEcheance: null,
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
  // Sénat hostile (cf. échéance sénatoriales, point 6 ci-dessous) : la navette
  // parlementaire qui s'éternise renchérit le coût d'une dépense engagée ce
  // mois-ci (+SURCOUT_NAVETTE_SENAT_HOSTILE), tous types de décision confondus
  // — distinguer réforme votée / réponse à un événement / PLF demanderait de
  // faire transiter un identifiant depuis assemblee.js/mandat.js, hors
  // périmètre de cette étape ; l'essentiel des décisions à coût de ce mode
  // passe de toute façon par le Parlement (textes, budget).
  let coutEffectif = decision.cout || 0;
  if (g.senatHostile && coutEffectif < 0) {
    coutEffectif = arrondi(coutEffectif * (1 + ECONOMIE_GOUVERNER.SURCOUT_NAVETTE_SENAT_HOSTILE));
  }
  g.jauges.solde = arrondi(g.jauges.solde + coutEffectif);

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
  if (echeance?.type === 'europeennes') resoudreEuropeennes(g);
  else if (echeance?.type === 'senatoriales') resoudreSenatoriales(g);
  else if (echeance?.type === 'municipales') resoudreMunicipales(g);
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
    election2032(g);
  }
  return g;
}

// --- Élections intermédiaires (E6) ------------------------------------------

// Européennes 2029 (t=24) : moment pédagogique sur l'abstention aux scrutins
// intermédiaires. Score du gouvernement = moyenne de la popularité courante
// (sondage) et d'une popularité recalculée en pondérant les humeurs par la
// PARTICIPATION de chaque persona (qui vote vraiment) — même formule que
// jauges.popularite (50 + humeur/2), mais sur l'électorat qui se déplace.
function resoudreEuropeennes(g) {
  const humeurPart = humeurPondereeParticipation(g);
  const scoreEuropeennes = clamp(Math.round((g.jauges.popularite + (50 + humeurPart / 2)) / 2), 0, 100);
  const participationEuro = participationNationaleSimulee();
  const malus = scoreEuropeennes < ECONOMIE_GOUVERNER.SEUIL_EUROPEENNES_MALUS;
  journaliser(g, `🇪🇺 Élections européennes 2029 : score du gouvernement ${scoreEuropeennes} % (participation simulée ${participationEuro} %)${malus ? ' — sanction dans les urnes.' : '.'}`);
  if (malus) {
    for (const id in g.personas) {
      g.personas[id].humeur = clamp(arrondi(g.personas[id].humeur - ECONOMIE_GOUVERNER.MALUS_EUROPEENNES_HUMEUR), -100, 100);
    }
    journaliser(g, '📉 Le résultat sanctionne la majorité : climat politique en léger repli.');
  }
  g.derniereEcheance = {
    type: 'europeennes', tour: g.tour, fiche: 'abstention-participation',
    resultat: { score: scoreEuropeennes, participation: participationEuro, malus },
  };
}

// Sénatoriales (renouvellement partiel, t=27) : le Sénat, élu par un collège
// de grands électeurs majoritairement locaux, bascule contre le gouvernement
// sous SEUIL_SENAT_HOSTILE de popularité. Effet de jeu posé au point 4 de
// finDeTour (surcoût de la navette parlementaire).
function resoudreSenatoriales(g) {
  g.senatHostile = g.jauges.popularite < ECONOMIE_GOUVERNER.SEUIL_SENAT_HOSTILE;
  journaliser(g, `🏛️ Sénatoriales : le Sénat est désormais ${g.senatHostile ? 'hostile' : 'favorable'} (popularité ${g.jauges.popularite} %).`);
  g.derniereEcheance = {
    type: 'senatoriales', tour: g.tour, fiche: 'navette-parlementaire-senat',
    resultat: { senatHostile: g.senatHostile, popularite: g.jauges.popularite },
  };
}

// Municipales 2031 (t=45) : l'ancrage local se retourne contre (ou pour) le
// gouvernement. Les N_DEPTS_CHOC_MUNICIPALES départements à l'humeur la plus
// basse reçoivent un choc négatif supplémentaire, les N meilleurs un choc
// positif plus modeste (asymétrie sanction/récompense).
function resoudreMunicipales(g) {
  const tries = DEPARTEMENTS
    .map((d) => ({ code: d.code, humeur: humeurDepartement(g, d.code) }))
    .sort((a, b) => a.humeur - b.humeur);
  const n = ECONOMIE_GOUVERNER.N_DEPTS_CHOC_MUNICIPALES;
  const pires = tries.slice(0, n).map((x) => x.code);
  const meilleurs = tries.slice(-n).map((x) => x.code);
  for (const code of pires) {
    g.chocs[code] = clamp(arrondi((g.chocs[code] || 0) + ECONOMIE_GOUVERNER.CHOC_MUNICIPALES_NEGATIF), -100, 100);
  }
  for (const code of meilleurs) {
    g.chocs[code] = clamp(arrondi((g.chocs[code] || 0) + ECONOMIE_GOUVERNER.CHOC_MUNICIPALES_POSITIF), -100, 100);
  }
  journaliser(g, `🏘️ Municipales 2031 : ancrage local sanctionné dans ${pires.length} département(s), renforcé dans ${meilleurs.length}.`);
  g.derniereEcheance = {
    type: 'municipales', tour: g.tour, fiche: 'autres-scrutins',
    resultat: { deptsChocNegatif: pires, deptsChocPositif: meilleurs },
  };
}

// --- Élection présidentielle 2032 (E6) --------------------------------------

// Verdict département par département (t=59, second tour) : pour chaque
// département, part de voix du gouvernement = moyenne pondérée (par
// poidsSegments, comme humeurDepartement) du soutien de chaque persona
// (sigmoïde de son humeur courante), les personas étant eux-mêmes pondérés
// par leur PARTICIPATION — un persona mécontent qui vote pèse contre le
// gouvernement, un persona content mais abstentionniste ne le sauve pas.
// Département gagné si > 50 % (formule simple, déterministe, aucun aléa).
// Verdict national = part des CIRCONSCRIPTIONS des départements gagnés (pas
// un simple comptage de départements : un grand département gagné pèse plus
// qu'un petit, comme le nombre réel de sièges qu'il représente).
export function election2032(g) {
  const parDept = {};
  let circosGagnes = 0;
  let circosTotal = 0;
  let participationPonderee = 0;
  for (const d of DEPARTEMENTS) {
    const poids = poidsSegments(d.code);
    const participationDept = participationDepartement(d.code); // ∈ [0,100], affichage seulement
    // Le choc local courant (crise récente, municipales) pèse sur le vote du
    // département, comme il pèse déjà sur humeurDepartement : cohérence entre
    // la carte d'humeur affichée et le verdict rendu sur cette même carte.
    const choc = g.chocs[d.code] || 0;
    let numSupport = 0;
    let denom = 0; // Σ poids·participation exact — pas l'entier arrondi de
    // participationDepartement : autour du seuil des 50 % qui décide d'un
    // département, l'arrondi du dénominateur suffirait à fausser le verdict.
    for (const p of PERSONAS) {
      const w = (poids[p.id] || 0) * participation(p.rapport);
      const humeur = g.personas[p.id]?.humeur || 0;
      numSupport += w * sigmoid(humeur + choc, ECONOMIE_GOUVERNER.SIGMOID_K_VERDICT);
      denom += w;
    }
    const pourcentageGouv = clamp(denom > 0 ? Math.round((numSupport / denom) * 100) : 50, 0, 100);
    parDept[d.code] = pourcentageGouv; // pourcentage ENTIER — contrainte de taille localStorage
    circosTotal += d.circos;
    participationPonderee += participationDept * d.circos;
    if (pourcentageGouv > 50) circosGagnes += d.circos;
  }
  const national = Math.round((circosGagnes / circosTotal) * 100);
  const participationNationale = Math.round(participationPonderee / circosTotal);
  const type = national >= 50 ? 'reelu' : 'battu';
  g.fin = { type, tour: g.tour, verdict: { parDept, national, participation: participationNationale } };
  journaliser(g, `🗳️ Verdict de la présidentielle 2032 : ${national} % pour votre majorité (participation ${participationNationale} %) — vous êtes ${type === 'reelu' ? 'réélu(e)' : 'battu(e)'}.`);
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
