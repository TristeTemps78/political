// Moteur d'affinité idéologique — s'exécute STRICTEMENT côté client.
// Pondérations en clair, destinées à une publication AGPL-3.0 (transparence type
// La Fabrique de la Loi). Cf. docs_architecture/02 §3.

import { FAMILLES, THEMES } from './data.js';

export const AXES = [
  { id: 'eco', nom: 'Économie', gauche: 'Marché libre', droite: 'Intervention publique' },
  { id: 'societe', nom: 'Société', gauche: 'Conservateur', droite: 'Libéral' },
  { id: 'ecologie', nom: 'Écologie', gauche: 'Productivisme', droite: 'Priorité écologique' },
  { id: 'europe', nom: 'Europe', gauche: 'Souveraineté', droite: 'Intégration' },
];

// Vecteur utilisateur = moyenne des effets des options, pondérée par les POINTS
// alloués (l'allocation budgétaire EST l'opinion). La normalisation se fait par
// points et non par |effet| : 1 point sur un effet fort ne doit pas peser autant
// que 12 points (bug corrigé le 2026-07-16, cf. docs_architecture/01).
export function computeAxes(reponses) {
  const somme = { eco: 0, societe: 0, ecologie: 0, europe: 0 };
  const poids = { eco: 0, societe: 0, ecologie: 0, europe: 0 };
  for (const theme of THEMES) {
    const alloc = reponses[theme.id];
    if (!alloc) continue;
    for (const opt of theme.options) {
      const pts = alloc[opt.id] || 0;
      if (!pts) continue;
      for (const [axe, valeur] of Object.entries(opt.effets)) {
        somme[axe] += valeur * pts;
        poids[axe] += pts; // dilution par les points : la magnitude des effets compte
      }
    }
  }
  const axes = {};
  for (const a of AXES) {
    const brut = poids[a.id] ? Math.max(-1, Math.min(1, somme[a.id] / poids[a.id])) : ETALONNAGE[a.id];
    axes[a.id] = centrer(brut, ETALONNAGE[a.id]);
  }
  return axes;
}

// Étalonnage de l'instrument : le zéro de chaque axe correspond à la réponse
// UNIFORME (points également répartis). Sans cela, un contenu directionnellement
// déséquilibré (ex. toutes les options « climat » ont un effet écologie ≥ 0)
// donnerait un vecteur non nul à un répondant indifférent et fausserait
// l'équité entre familles (biais mesuré à σ=0,25 avant correction, cf.
// docs_architecture/01). Calculé depuis THEMES : se met à jour avec le contenu.
export const ETALONNAGE = (() => {
  const somme = { eco: 0, societe: 0, ecologie: 0, europe: 0 };
  const nb = { eco: 0, societe: 0, ecologie: 0, europe: 0 };
  for (const theme of THEMES) {
    for (const opt of theme.options) {
      for (const [axe, valeur] of Object.entries(opt.effets)) {
        somme[axe] += valeur;
        nb[axe] += 1;
      }
    }
  }
  const e = {};
  for (const a of ['eco', 'societe', 'ecologie', 'europe']) {
    e[a] = nb[a] ? Math.max(-0.99, Math.min(0.99, somme[a] / nb[a])) : 0;
  }
  return e;
})();

// Centre la valeur brute sur l'étalonnage puis remet à l'échelle chaque
// demi-intervalle sur [-1, 1] (déviation relative à la réponse uniforme).
function centrer(brut, e) {
  const d = brut - e;
  return d >= 0 ? d / (1 - e) : d / (1 + e);
}

// Affinité par similarité cosinus, affichée sur [0,1].
// Choix méthodologique : la distance euclidienne favorise mécaniquement les
// familles au vecteur proche du centre (elles « gagnent » sur des réponses
// aléatoires) ; le cosinus compare des DIRECTIONS idéologiques, ce qui
// neutralise ce biais (équité validée par tools/simulate.mjs).
export function computeAffinites(axes) {
  const nu = Math.sqrt(AXES.reduce((s, a) => s + axes[a.id] ** 2, 0));
  return FAMILLES.map((f) => {
    const nf = Math.sqrt(AXES.reduce((s, a) => s + f.vecteur[a.id] ** 2, 0));
    const dot = AXES.reduce((s, a) => s + axes[a.id] * f.vecteur[a.id], 0);
    const cos = nu && nf ? dot / (nu * nf) : 0;
    return { familleId: f.id, score: (cos + 1) / 2 };
  }).sort((a, b) => b.score - a.score);
}
