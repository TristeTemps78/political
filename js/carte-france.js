// Carte géographique de la France par département (SVG embarqué, js/geo.js).
// Composant réutilisable : le mode Gouverner l'utilise pour l'humeur des
// territoires puis pour le verdict de la présidentielle 2032.
//
// Accessibilité (même pattern « grid » que le cartogramme js/map.js) : la carte
// est UN SEUL point de tabulation ; ←/→ département suivant/précédent (ordre du
// référentiel), ↑/↓ région précédente/suivante, Home/End, Entrée ou Espace ouvre.
// L'état est porté par l'aria-label de chaque territoire, jamais par la couleur seule.
// Les territoires sans contour (GEO_ABSENTS : Polynésie, Wallis…) sont des
// boutons-tuiles sous la carte — mêmes interactions, aucun oubli.

import { DEPARTEMENTS } from './data.js';
import { GEO_VIEWBOX, GEO_PATHS, GEO_ABSENTS, GEO_ENCARTS } from './geo.js';

let rovingIdx = 0; // persiste entre re-rendus, comme dans map.js

// Intensité visuelle d'une valeur ∈ [-100, 100] : mélange vers --ok (positif)
// ou --danger (négatif) au-dessus d'un fond neutre. null = neutre.
function remplissage(v) {
  if (v === null || v === undefined) return 'var(--carte-neutre)';
  const pct = Math.round(Math.min(100, Math.abs(v)) * 0.85);
  const teinte = v >= 0 ? 'var(--ok)' : 'var(--danger)';
  return `color-mix(in oklab, ${teinte} ${pct}%, var(--carte-neutre))`;
}

// options :
//   valeur(code)  → nombre ∈ [-100, 100] ou null (neutre) — pilote la couleur
//   libelle(code) → texte d'état complet pour l'aria-label et l'infobulle
//   onSelect(code) → ouverture d'un territoire (Entrée/Espace/clic)
//   selection      → code du territoire actuellement ouvert (surligné)
export function renderCarteFrance(root, options = {}) {
  const valeur = options.valeur ?? (() => null);
  const libelle = options.libelle ?? ((code) => DEPARTEMENTS.find((d) => d.code === code).nom);
  const { onSelect, selection } = options;

  const avecContour = DEPARTEMENTS.filter((d) => GEO_PATHS[d.code]);
  const sansContour = DEPARTEMENTS.filter((d) => GEO_ABSENTS.includes(d.code));
  const ordre = [...avecContour, ...sansContour]; // ordre de navigation clavier

  const paths = avecContour.map((d, i) => {
    const texte = libelle(d.code);
    return `<path d="${GEO_PATHS[d.code]}" data-idx="${i}" data-code="${d.code}" data-region="${d.region}"
      role="button" tabindex="-1" aria-label="${texte}"
      class="carte-dept${selection === d.code ? ' selectionnee' : ''}"
      fill="${remplissage(valeur(d.code))}"><title>${texte}</title></path>`;
  }).join('');

  const cadres = Object.entries(GEO_ENCARTS).map(([code, { x, y, l, h }]) =>
    `<rect x="${x}" y="${y}" width="${l}" height="${h}" class="carte-encart" aria-hidden="true"></rect>
     <text x="${x + 4}" y="${y + h - 5}" class="carte-encart-code" aria-hidden="true">${code}</text>`).join('');

  const tuiles = sansContour.map((d, i) => {
    const texte = libelle(d.code);
    const v = valeur(d.code);
    return `<button type="button" data-idx="${avecContour.length + i}" data-code="${d.code}" data-region="${d.region}"
      tabindex="-1" aria-label="${texte}" title="${texte}"
      class="carte-tuile${selection === d.code ? ' selectionnee' : ''}"
      style="background:${remplissage(v)}">${d.nom}</button>`;
  }).join('');

  root.innerHTML = `
    <div class="carte-france">
      <svg viewBox="${GEO_VIEWBOX}" role="group"
        aria-label="Carte de France par département — flèches pour naviguer, Entrée pour ouvrir">
        ${cadres}${paths}
      </svg>
      ${tuiles ? `<div class="carte-tuiles" role="group" aria-label="Territoires hors carte">${tuiles}</div>` : ''}
    </div>`;

  const elements = [...root.querySelectorAll('[data-idx]')]
    .sort((a, b) => Number(a.dataset.idx) - Number(b.dataset.idx));
  if (rovingIdx >= elements.length) rovingIdx = 0;
  majTabindex(elements);

  const conteneur = root.querySelector('.carte-france');
  conteneur.addEventListener('keydown', (ev) => navigationClavier(ev, elements, ordre, onSelect));
  conteneur.addEventListener('click', (ev) => {
    const el = ev.target.closest?.('[data-code]');
    if (!el) return;
    rovingIdx = Number(el.dataset.idx);
    majTabindex(elements);
    onSelect?.(el.dataset.code);
  });
}

function majTabindex(elements) {
  elements.forEach((el, i) => el.setAttribute('tabindex', i === rovingIdx ? '0' : '-1'));
}

function navigationClavier(ev, elements, ordre, onSelect) {
  const cible = ev.target.closest?.('[data-idx]');
  if (!cible) return;
  const idx = Number(cible.dataset.idx);
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    onSelect?.(cible.dataset.code);
    return;
  }
  let suivant = null;
  switch (ev.key) {
    case 'ArrowRight': suivant = Math.min(idx + 1, elements.length - 1); break;
    case 'ArrowLeft': suivant = Math.max(idx - 1, 0); break;
    case 'ArrowDown': { // premier département de la région suivante
      const region = ordre[idx].region;
      for (let i = idx + 1; i < ordre.length; i++) {
        if (ordre[i].region !== region) { suivant = i; break; }
      }
      break;
    }
    case 'ArrowUp': { // premier département de la région précédente
      let i = idx - 1;
      while (i >= 0 && ordre[i].region === ordre[idx].region) i--;
      if (i >= 0) {
        const regionPrec = ordre[i].region;
        while (i > 0 && ordre[i - 1].region === regionPrec) i--;
        suivant = i;
      }
      break;
    }
    case 'Home': suivant = 0; break;
    case 'End': suivant = elements.length - 1; break;
    default: return;
  }
  ev.preventDefault();
  if (suivant === null || suivant === idx) return;
  rovingIdx = suivant;
  majTabindex(elements);
  elements[suivant].focus();
}
