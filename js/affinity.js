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

// Vecteur utilisateur = moyenne des effets des options, pondérée par les points
// que l'utilisateur leur a alloués (l'allocation budgétaire EST l'opinion).
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
        poids[axe] += Math.abs(valeur) * pts;
      }
    }
  }
  const axes = {};
  for (const a of AXES) {
    axes[a.id] = poids[a.id] ? Math.max(-1, Math.min(1, somme[a.id] / poids[a.id])) : 0;
  }
  return axes;
}

// Affinité ∈ [0,1] : 1 − distance euclidienne normalisée dans l'hypercube des 4 axes.
export function computeAffinites(axes) {
  const dMax = Math.sqrt(4 * 2 * 2); // distance maximale possible
  return FAMILLES.map((f) => {
    const d = Math.sqrt(AXES.reduce((s, a) => s + (axes[a.id] - f.vecteur[a.id]) ** 2, 0));
    return { familleId: f.id, score: 1 - d / dMax };
  }).sort((a, b) => b.score - a.score);
}
