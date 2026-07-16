// Phase 3 — Hémicycle SVG : 577 sièges en couronnes polaires.
// Deux modes : composition virtuelle (issue de la carte de conquête)
// et composition de démonstration (données fictives étiquetées).

import { CIRCOS, FAMILLES, MAJORITE_ABSOLUE } from './data.js';
import { load } from './store.js';
import { controleur, censureActive } from './guilds.js';
import { adapter } from './adapter.js';

const NEUTRE = '#9aa3af';

export function renderHemicycle(root, mode = 'virtuel') {
  root.innerHTML = `
    <div class="panel">
      <h3>L’hémicycle — 577 sièges, majorité absolue à ${MAJORITE_ABSOLUE}</h3>
      <div class="onglets-secondaires">
        <button class="btn-secondaire ${mode === 'virtuel' ? 'actif' : ''}" data-mode="virtuel" aria-pressed="${mode === 'virtuel'}">Assemblée virtuelle (votre partie)</button>
        <button class="btn-secondaire ${mode === 'demo' ? 'actif' : ''}" data-mode="demo" aria-pressed="${mode === 'demo'}">Assemblée de démonstration</button>
      </div>
      <div id="hemicycle-svg"></div>
      <div id="hemicycle-legende" class="legende"></div>
      <p class="hint">${mode === 'virtuel'
        ? 'Chaque siège reflète la circonscription correspondante sur la carte de conquête. Les sièges gris sont sans contrôle.'
        : '⚠️ Composition fictive de démonstration — en phase 2, ces sièges seront alimentés par l’open data de l’Assemblée nationale (data.assemblee-nationale.fr).'}</p>
    </div>`;

  root.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => renderHemicycle(root, b.dataset.mode)));

  const couleurs = mode === 'virtuel' ? couleursVirtuelles() : couleursDemo();
  dessiner(root.querySelector('#hemicycle-svg'), couleurs);
  legende(root.querySelector('#hemicycle-legende'), couleurs);
}

function couleursVirtuelles() {
  const s = load();
  const cible = censureActive(s)?.cible ?? null;
  return CIRCOS.map((c) => {
    const g = controleur(s.monde.influence[c.id], cible);
    return { couleur: g ? FAMILLES.find((f) => f.id === g).couleur : NEUTRE, groupe: g, titre: c.nom };
  });
}

// Démo : sièges répartis en blocs par famille (proportions fixes plausibles).
function couleursDemo() {
  const parts = [
    ['gauche-rupture', 72], ['eco-sociale', 55], ['social-democrate', 68],
    ['lib-europeen', 148], ['droite-gouvernement', 92], ['souverainiste', 118], ['localiste', 24],
  ];
  const out = [];
  for (const [gid, n] of parts) {
    const f = FAMILLES.find((x) => x.id === gid);
    for (let i = 0; i < n; i++) out.push({ couleur: f.couleur, groupe: gid, titre: `${f.nom} (démo)` });
  }
  while (out.length < 577) out.push({ couleur: NEUTRE, groupe: null, titre: 'Non inscrit (démo)' });
  return out.slice(0, 577);
}

function dessiner(el, sieges) {
  const W = 700, H = 400, cx = W / 2, cy = H - 20;
  const rangees = 12;
  const r0 = 90, dr = (H - 60 - r0) / (rangees - 1);
  // Répartition des 577 sièges sur 12 rangées, proportionnelle à la circonférence.
  const rayons = Array.from({ length: rangees }, (_, i) => r0 + i * dr);
  const total = rayons.reduce((a, r) => a + r, 0);
  const parRangee = rayons.map((r) => Math.floor((577 * r) / total));
  let manque = 577 - parRangee.reduce((a, b) => a + b, 0);
  for (let i = rangees - 1; manque > 0; i = (i - 1 + rangees) % rangees, manque--) parRangee[i] += 1;

  // Ordre de remplissage : par angle (de gauche à droite de l'hémicycle),
  // pour que les blocs de couleur forment des coins cohérents.
  const positions = [];
  for (let row = 0; row < rangees; row++) {
    const n = parRangee[row];
    for (let k = 0; k < n; k++) {
      const angle = Math.PI - (Math.PI * (k + 0.5)) / n;
      positions.push({ angle, row });
    }
  }
  positions.sort((a, b) => b.angle - a.angle || a.row - b.row);

  // role="img" : le contenu du SVG est purement graphique, la légende textuelle
  // (comptage par guilde) porte la même information pour les lecteurs d'écran.
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hémicycle de 577 sièges — répartition détaillée dans la légende ci-dessous">`;
  positions.forEach((p, i) => {
    const r = rayons[p.row];
    const x = cx + r * Math.cos(p.angle);
    const y = cy - r * Math.sin(p.angle);
    const siege = sieges[i] || { couleur: NEUTRE, titre: '' };
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${siege.couleur}"><title>${siege.titre}</title></circle>`;
  });
  svg += `<text x="${cx}" y="${cy - 30}" text-anchor="middle" class="hemicycle-total">577</text>`;
  svg += '</svg>';
  el.innerHTML = svg;
}

function legende(el, sieges) {
  const compte = {};
  for (const s of sieges) if (s.groupe) compte[s.groupe] = (compte[s.groupe] || 0) + 1;
  const sansControle = sieges.filter((s) => !s.groupe).length;
  el.innerHTML = FAMILLES
    .filter((f) => compte[f.id])
    .map((f) => `<span class="legende-item"><span class="pastille" style="background:${f.couleur}"></span>${f.nom} <strong>${compte[f.id]}</strong></span>`)
    .join('') +
    (sansControle ? `<span class="legende-item"><span class="pastille" style="background:${NEUTRE}"></span>Sans contrôle <strong>${sansControle}</strong></span>` : '');
}

export { adapter };
