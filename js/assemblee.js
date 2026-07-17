// Couche institutionnelle du mode Gouverner — machine à états PURE (aucun DOM,
// aucun localStorage), sérialisée dans g.enCours = { reformeId, phase, soutiens }.
// Complète le moteur E3 (js/gouverner.js) : composition de l'Assemblée, dépôt et
// vote d'un texte, négociation, article 49.3 + motion de censure, dissolution
// (art. 12) et référendum (art. 11). Chaque mécanisme référence sa fiche
// pédagogique (js/fiches.js) via FICHE_PAR_MECANISME.

import { FAMILLES, MAJORITE_ABSOLUE, CIRCOS } from './data.js';
import { REFORMES } from './mandat.js';
import { AXES_GOUVERNER } from './personas.js';
import { ECONOMIE_GOUVERNER, assembleeParDefaut } from './gouverner.js';

// Constantes propres à la couche institutionnelle. COUT_NEGOCIER et
// CENSURES_AVANT_DEMISSION restent dans ECONOMIE_GOUVERNER (gouverner.js) et
// sont réutilisées telles quelles : une seule source de vérité par constante.
export const ECONOMIE_ASSEMBLEE = {
  // Alignement cosinus minimal pour qu'une famille hors coalition prenne
  // position franche ; en-dessous, elle s'abstient — comportement réel des
  // groupes « charnières » sur les textes qui ne les concernent pas de front.
  SEUIL_ADHESION_VOTE: 0.15,
  // Hostilité d'une famille = (1 − cos(vecteur famille, ligne politique
  // suivie)) / 2 ∈ [0,1]. Seuil de vote « pour » une censure, à popularité
  // neutre (50).
  SEUIL_HOSTILITE_CENSURE: 0.55,
  // Chaque point de popularité sous 50 abaisse ce seuil d'un centième (et
  // inversement au-dessus) : un gouvernement impopulaire est une cible plus
  // facile, sans que la popularité seule n'explique jamais le vote à elle
  // seule (l'hostilité idéologique reste le facteur principal).
  SENSIBILITE_POPULARITE_CENSURE: 0.01,
  // Dissolution par défaut : bascule de sièges vers/contre la famille du
  // joueur, proportionnelle à l'écart de popularité à 50 — jusqu'à ±25 sièges
  // à popularité extrême, toujours re-plafonnée sous 289 par renormaliser577.
  FACTEUR_DISSOLUTION_POPULARITE: 0.5,
  // Référendum adopté si le score (opinion + alignement)/2 dépasse
  // strictement 0 : à l'égalité pile, rejeté — l'indécision profite
  // historiquement au camp du non (cf. fiche referendum-article-11).
  SEUIL_REFERENDUM: 0,
  // Deux référendums par mandat max : usage réel rarissime de l'art. 11 —
  // éviter qu'il ne devienne un raccourci systématique de gouvernance.
  REFERENDUMS_MAX: 2,
};

// Thèmes éligibles à l'article 11 (« organisation des pouvoirs publics » et les
// engagements européens relèvent explicitement de son champ constitutionnel ;
// cf. js/data.js:THEMES ids 'institutions' et 'europe'). Les autres thèmes
// (fiscalité, sécurité, travail, climat) en sont exclus.
const THEMES_REFERENDUM = ['institutions', 'europe'];

// Fiche pédagogique associée à chaque mécanisme institutionnel (ids réels de
// js/fiches.js).
export const FICHE_PAR_MECANISME = {
  depot: 'vote-texte-assemblee',
  vote: 'vote-texte-assemblee',
  negociation: 'majorite-relative-coalitions',
  '493': 'article-49-3',
  censure: 'motion-de-censure',
  dissolution: 'dissolution',
  referendum: 'referendum-article-11',
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Similarité cosinus entre deux vecteurs partiels sur les 4 axes idéologiques
// (même mécanique que affinity.js/personas.js) — 0 si l'un des deux est nul.
function cosinus(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const axe of AXES_GOUVERNER) {
    const va = a[axe] || 0, vb = b[axe] || 0;
    dot += va * vb; na += va * va; nb += vb * vb;
  }
  na = Math.sqrt(na); nb = Math.sqrt(nb);
  return na && nb ? dot / (na * nb) : 0;
}

function journaliser(g, texte) {
  g.journal.push(texte);
  if (g.journal.length > ECONOMIE_GOUVERNER.JOURNAL_MAX) g.journal.shift();
}

// Répartit un comptage de sièges arbitraire (Σ quelconque, p.ex. héritage du
// rapport de force de la carte Conquête) sur les 577 circonscriptions, en
// écrêtant toute famille qui atteindrait la majorité absolue et en
// redistribuant l'excédent (même logique que gouverner.js:assembleeParDefaut).
function renormaliser577(comptage) {
  const total = FAMILLES.reduce((s, f) => s + Math.max(0, comptage[f.id] || 0), 0) || 1;
  const sieges = {};
  let attribues = 0;
  for (const f of FAMILLES) {
    const n = Math.round((Math.max(0, comptage[f.id] || 0) / total) * CIRCOS.length);
    sieges[f.id] = n;
    attribues += n;
  }
  let ecart = CIRCOS.length - attribues;
  const ordre = FAMILLES.map((f) => f.id).sort();
  let i = 0;
  while (ecart !== 0) {
    sieges[ordre[i % ordre.length]] += ecart > 0 ? 1 : -1;
    ecart += ecart > 0 ? -1 : 1;
    i += 1;
  }
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
  for (const f of FAMILLES) if (sieges[f.id] < 0) sieges[f.id] = 0; // garde-fou improbable
  return sieges;
}

// --- Composition de départ --------------------------------------------------

// `options.sieges` (facultatif) est un comptage de sièges hérité de la carte
// Conquête (Σ quelconque) : il est renormalisé sur 577 en préservant les
// proportions. Par défaut, délègue à assembleeParDefaut (moteur E3).
export function composerAssemblee(familleId, options = {}) {
  if (options && options.sieges) return renormaliser577(options.sieges);
  return assembleeParDefaut(familleId);
}

// --- Dépôt, négociation et vote d'un texte ----------------------------------

export function deposerTexte(g, reformeId) {
  if (g.enCours) throw new Error('deposerTexte : un texte est déjà en discussion, il faut le résoudre avant d’en déposer un autre.');
  if (!REFORMES.some((r) => r.id === reformeId)) throw new Error(`deposerTexte : réforme inconnue « ${reformeId} ».`);
  g.enCours = { reformeId, phase: 'depot', soutiens: [] };
  return g;
}

// Intentions de vote projetées, famille par famille : alignement cosinus entre
// les effets du texte et le vecteur idéologique de la famille, sauf pour le
// gouvernement (familleId du joueur), sa coalition et les soutiens négociés,
// qui votent toujours leur propre texte.
export function intentionsDeVote(g) {
  if (!g.enCours) throw new Error('intentionsDeVote : aucun texte en discussion.');
  const reforme = REFORMES.find((r) => r.id === g.enCours.reformeId);
  const positions = {};
  let pour = 0, contre = 0, abstention = 0;
  for (const f of FAMILLES) {
    const sieges = g.assemblee[f.id] || 0;
    let position;
    if (f.id === g.familleId || g.coalition.includes(f.id) || g.enCours.soutiens.includes(f.id)) {
      position = 'pour';
    } else {
      const cos = cosinus(reforme.effets, f.vecteur);
      if (cos >= ECONOMIE_ASSEMBLEE.SEUIL_ADHESION_VOTE) position = 'pour';
      else if (cos <= -ECONOMIE_ASSEMBLEE.SEUIL_ADHESION_VOTE) position = 'contre';
      else position = 'abstention';
    }
    positions[f.id] = position;
    if (position === 'pour') pour += sieges;
    else if (position === 'contre') contre += sieges;
    else abstention += sieges;
  }
  return { positions, pour, contre, abstention };
}

// Négociation : achète le soutien d'une famille pour le texte en cours
// (idempotent — une famille déjà soutien ne coûte rien). Le capital politique
// vit HORS de g (cf. store.js: joueur.capital) : negocier reste une fonction
// pure qui prend le capital disponible en paramètre et renvoie sa nouvelle
// valeur, plutôt que de manipuler un store.
export function negocier(g, familleId, capitalDisponible) {
  if (!g.enCours) throw new Error('negocier : aucun texte en discussion.');
  if (!FAMILLES.some((f) => f.id === familleId)) throw new Error(`negocier : famille inconnue « ${familleId} ».`);
  if (g.enCours.soutiens.includes(familleId)) return { g, capital: capitalDisponible, cout: 0 };
  const cout = ECONOMIE_GOUVERNER.COUT_NEGOCIER;
  if (capitalDisponible < cout) throw new Error(`negocier : capital insuffisant (${capitalDisponible} < ${cout}).`);
  g.enCours.soutiens.push(familleId);
  return { g, capital: capitalDisponible - cout, cout };
}

// Vote ordinaire : majorité des SUFFRAGES EXPRIMÉS (pour vs contre), les
// abstentions ne comptent pas — à l'égalité stricte, le texte est rejeté.
export function voterTexte(g) {
  if (!g.enCours) throw new Error('voterTexte : aucun texte en discussion.');
  if (g.enCours.phase === 'censure') throw new Error('voterTexte : texte engagé sous 49.3, à résoudre via voterCensure.');
  const reforme = REFORMES.find((r) => r.id === g.enCours.reformeId);
  const { pour, contre, abstention } = intentionsDeVote(g);
  const adopte = pour > contre;
  const decision = adopte
    ? { effets: reforme.effets, cout: reforme.cout, libelle: `${reforme.titre} — adopté (${pour} pour, ${contre} contre)` }
    : { effets: {}, cout: 0, libelle: `${reforme.titre} — rejeté (${pour} pour, ${contre} contre)` };
  g.enCours = null;
  return { adopte, pour, contre, abstention, decision, fiche: FICHE_PAR_MECANISME.vote };
}

// --- Article 49.3 et motion de censure --------------------------------------

// Engage la responsabilité du gouvernement sur le texte en cours : il sera
// considéré adopté sans vote, sauf si une motion de censure est votée
// (résolue par voterCensure).
export function engager493(g) {
  if (!g.enCours) throw new Error('engager493 : aucun texte en discussion.');
  if (g.enCours.phase === 'censure') throw new Error('engager493 : le texte est déjà engagé sous 49.3.');
  g.enCours.phase = 'censure';
  return g;
}

// Motion de censure, consécutive à un 49.3 (g.enCours.phase === 'censure') ou
// spontanée (aucun texte en cours, ou texte hors 49.3 : la motion vise alors
// l'action du gouvernement en général). `options.spontanee` force la lecture
// « motion générale » même si un texte est engagé sous 49.3 (motion distincte
// déposée par l'opposition en parallèle). Seuls les votes « pour » comptent :
// adoptée uniquement si ≥ MAJORITE_ABSOLUE (289) — le gouvernement et sa
// coalition défendent toujours leur survie, l'opposition vote pour si son
// hostilité au gouvernement dépasse un seuil que la popularité fait varier.
export function voterCensure(g, options = {}) {
  const lieAu493 = !options.spontanee && !!(g.enCours && g.enCours.phase === 'censure');
  const seuil = clamp(
    ECONOMIE_ASSEMBLEE.SEUIL_HOSTILITE_CENSURE
      - (50 - g.jauges.popularite) * ECONOMIE_ASSEMBLEE.SENSIBILITE_POPULARITE_CENSURE,
    0, 1
  );
  const positions = {};
  let pour = 0, contre = 0, abstention = 0;
  for (const f of FAMILLES) {
    const sieges = g.assemblee[f.id] || 0;
    let position;
    if (f.id === g.familleId || g.coalition.includes(f.id)) {
      position = 'contre';
    } else {
      const hostilite = (1 - cosinus(f.vecteur, g.ligne)) / 2;
      position = hostilite >= seuil ? 'pour' : 'abstention';
    }
    positions[f.id] = position;
    if (position === 'pour') pour += sieges;
    else if (position === 'contre') contre += sieges;
    else abstention += sieges;
  }
  const adopte = pour >= MAJORITE_ABSOLUE;
  let decision;
  if (adopte) {
    g.censures += 1;
    decision = { effets: {}, cout: 0, libelle: `Motion de censure adoptée (${pour} voix) — gouvernement fragilisé.` };
    if (!g.fin && g.censures >= ECONOMIE_GOUVERNER.CENSURES_AVANT_DEMISSION) {
      g.fin = { type: 'demission', tour: g.tour };
    }
    g.enCours = null;
  } else if (lieAu493) {
    // Motion rejetée après un 49.3 : le texte est considéré adopté sans vote
    // direct (l'usure de popularité du 49.3 est appliquée par finDeTour via
    // decision.force493, cf. gouverner.js).
    const reforme = REFORMES.find((r) => r.id === g.enCours.reformeId);
    decision = {
      effets: reforme.effets, cout: reforme.cout, force493: true,
      libelle: `${reforme.titre} — adopté via 49.3 (motion de censure rejetée, ${pour} voix)`,
    };
    g.enCours = null;
  } else {
    decision = { effets: {}, cout: 0, libelle: `Motion de censure rejetée (${pour} voix).` };
  }
  return { adopte, pour, contre, abstention, positions, decision, fiche: FICHE_PAR_MECANISME.censure };
}

// --- Dissolution (article 12) -----------------------------------------------

// Une seule dissolution par mandat. Sans `nouvelleAssemblee` fournie, la
// recomposition par défaut REFLÈTE la popularité courante : un président
// populaire dissout en position de force (la famille du joueur progresse), un
// président impopulaire prend un risque (elle recule) — toujours < 289
// (renormaliser577 écrête et garantit Σ = 577).
export function dissoudre(g, nouvelleAssemblee) {
  if (g.dissolutionFaite) throw new Error('dissoudre : une seule dissolution est possible par mandat (art. 12).');
  g.dissolutionFaite = true;
  if (nouvelleAssemblee) {
    g.assemblee = renormaliser577(nouvelleAssemblee);
  } else {
    const base = assembleeParDefaut(g.familleId);
    const ecart = g.jauges.popularite - 50; // ∈ [-50, 50]
    const delta = Math.round(ecart * ECONOMIE_ASSEMBLEE.FACTEUR_DISSOLUTION_POPULARITE);
    const comptage = { ...base, [g.familleId]: Math.max(0, base[g.familleId] + delta) };
    const autres = FAMILLES.filter((f) => f.id !== g.familleId).map((f) => f.id);
    const totalAutres = autres.reduce((s, id) => s + base[id], 0) || 1;
    for (const id of autres) {
      comptage[id] = Math.max(0, base[id] - Math.round((base[id] / totalAutres) * delta));
    }
    g.assemblee = renormaliser577(comptage);
  }
  g.enCours = null; // toute négociation en cours tombe avec l'Assemblée dissoute
  journaliser(g, '🗳️ Dissolution de l’Assemblée nationale (art. 12) — nouvelles élections législatives.');
  return g;
}

// --- Référendum (article 11) ------------------------------------------------

// Réservé aux réformes des thèmes institutions/europe. Résultat déterminé par
// l'opinion nationale du moment et l'alignement du texte avec la ligne
// politique suivie jusqu'ici (un texte qui la prolonge convainc plus qu'une
// rupture soudaine) : adopté si le score moyen dépasse strictement 0.
export function referendum(g, reformeId) {
  if (g.referendumsFaits >= ECONOMIE_ASSEMBLEE.REFERENDUMS_MAX) {
    throw new Error(`referendum : plafond de ${ECONOMIE_ASSEMBLEE.REFERENDUMS_MAX} référendums par mandat atteint.`);
  }
  const reforme = REFORMES.find((r) => r.id === reformeId);
  if (!reforme) throw new Error(`referendum : réforme inconnue « ${reformeId} ».`);
  if (!THEMES_REFERENDUM.includes(reforme.themeId)) {
    throw new Error(`referendum : hors périmètre de l’article 11 (thèmes ${THEMES_REFERENDUM.join('/')} uniquement).`);
  }
  // Opinion nationale = popularité courante recentrée sur [-1,1]. La
  // popularité est déjà, dans gouverner.js, une moyenne pondérée des humeurs
  // des personas (moyennePondereeHumeurs, fonction interne non exportée) :
  // réutiliser g.jauges.popularite évite de dupliquer cette mécanique plutôt
  // que de la recalculer indépendamment ici.
  const opinion = (g.jauges.popularite - 50) / 50;
  const alignement = cosinus(reforme.effets, g.ligne);
  const score = (opinion + alignement) / 2;
  const adopte = score > ECONOMIE_ASSEMBLEE.SEUIL_REFERENDUM;
  g.referendumsFaits += 1;
  const decision = adopte
    ? { effets: reforme.effets, cout: reforme.cout, libelle: `Référendum : ${reforme.titre} — adopté (score ${score.toFixed(2)})` }
    : { effets: {}, cout: 0, libelle: `Référendum : ${reforme.titre} — rejeté (score ${score.toFixed(2)})` };
  return { adopte, score, decision, fiche: FICHE_PAR_MECANISME.referendum };
}
