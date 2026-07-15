// Phase 2 — Cartogramme des 577 circonscriptions (1 cellule = 1 siège),
// regroupées par département puis région. Choix argumenté dans docs_architecture/00 §1.1.

import { DEPARTEMENTS, CIRCOS, FAMILLES, MAJORITE_ABSOLUE } from './data.js';
import { load } from './store.js';
import { ECONOMIE, investir, controleur, comptageSieges, majoriteAtteinte, toast } from './guilds.js';

const REGIONS_ORDRE = [
  'Île-de-France', 'Hauts-de-France', 'Normandie', 'Grand Est', 'Bretagne',
  'Pays de la Loire', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté',
  'Nouvelle-Aquitaine', 'Auvergne-Rhône-Alpes', 'Occitanie',
  'Provence-Alpes-Côte d’Azur', 'Corse', 'Outre-mer', 'Français de l’étranger',
];

export function renderMap(root) {
  const s = load();
  const sieges = comptageSieges(s);
  const guilde = s.joueur.guildeId ? FAMILLES.find((f) => f.id === s.joueur.guildeId) : null;
  const vainqueur = majoriteAtteinte(s);

  root.innerHTML = `
    <div class="panel carte-entete">
      <div>
        <h3>Conquête des 577 circonscriptions</h3>
        <p class="hint">Investissez <strong>${ECONOMIE.COUT_INFLUENCE} capital</strong> pour +1 influence.
        Une circonscription est contrôlée à partir de <strong>${ECONOMIE.SEUIL_CONTROLE}</strong> points d’influence
        majoritaires. Objectif : <strong>${MAJORITE_ABSOLUE} sièges</strong> — la majorité absolue réelle de l’Assemblée nationale.</p>
        ${guilde ? `<p>Votre guilde : <span class="pastille" style="background:${guilde.couleur}"></span> <strong>${guilde.nom}</strong> — ${sieges[guilde.id] || 0} siège(s)</p>`
          : '<p class="alerte">Rejoignez une guilde dans l’onglet Profil pour investir.</p>'}
        ${vainqueur ? `<p class="victoire">🏆 <strong>${FAMILLES.find((f) => f.id === vainqueur).nom}</strong> a atteint la majorité absolue !</p>` : ''}
      </div>
      <div class="legende">${FAMILLES.map((f) =>
        `<span class="legende-item"><span class="pastille" style="background:${f.couleur}"></span>${f.nom} <strong>${sieges[f.id] || 0}</strong></span>`).join('')}
      </div>
    </div>
    <div id="carte"></div>
    <div id="circo-detail"></div>`;

  const carte = root.querySelector('#carte');
  const parRegion = new Map();
  for (const d of DEPARTEMENTS) {
    if (!parRegion.has(d.region)) parRegion.set(d.region, []);
    parRegion.get(d.region).push(d);
  }

  for (const region of REGIONS_ORDRE) {
    const depts = parRegion.get(region);
    if (!depts) continue;
    const section = document.createElement('section');
    section.className = 'region';
    section.innerHTML = `<h4>${region}</h4>`;
    const grille = document.createElement('div');
    grille.className = 'depts';
    for (const d of depts) {
      const bloc = document.createElement('div');
      bloc.className = 'dept';
      bloc.innerHTML = `<span class="dept-nom" title="${d.nom}">${d.nom}</span>`;
      const cells = document.createElement('div');
      cells.className = 'cells';
      for (const circo of CIRCOS.filter((c) => c.dept === d.code)) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.setAttribute('aria-label', circo.nom);
        const ctrl = controleur(s.monde.influence[circo.id]);
        if (ctrl) {
          cell.style.background = FAMILLES.find((f) => f.id === ctrl).couleur;
          cell.classList.add('controlee');
        } else if (s.monde.influence[circo.id]) {
          cell.classList.add('contestee');
        }
        cell.addEventListener('click', () => renderCircoDetail(root, circo.id));
        cells.appendChild(cell);
      }
      bloc.appendChild(cells);
      grille.appendChild(bloc);
    }
    section.appendChild(grille);
    carte.appendChild(section);
  }
}

function renderCircoDetail(root, circoId) {
  const s = load();
  const circo = CIRCOS.find((c) => c.id === circoId);
  const infl = s.monde.influence[circoId] || {};
  const ctrl = controleur(infl);
  const lignes = Object.entries(infl).sort((a, b) => b[1] - a[1]);
  const detail = root.querySelector('#circo-detail');
  detail.innerHTML = `
    <div class="panel">
      <h3>${circo.nom}</h3>
      <p>${ctrl
        ? `Contrôlée par <strong>${FAMILLES.find((f) => f.id === ctrl).nom}</strong>.`
        : lignes.length ? 'Contestée — aucune guilde ne domine encore.' : 'Territoire vierge : aucune influence.'}</p>
      ${lignes.map(([g, v]) => {
        const f = FAMILLES.find((x) => x.id === g);
        return `<div class="affinite-row"><span class="pastille" style="background:${f.couleur}"></span>
          <span class="affinite-nom">${f.nom}</span><span class="affinite-score">${v} pt(s)</span></div>`;
      }).join('')}
      <button class="btn-primaire" id="btn-investir">Investir ${ECONOMIE.COUT_INFLUENCE} capital (+1 influence)</button>
      <p class="hint">Chaque investissement déclenche un tour des guildes rivales : le scrutin uninominal
      récompense la concentration locale, pas la dispersion — c’est toute la logique du maillage territorial.</p>
    </div>`;
  detail.querySelector('#btn-investir').addEventListener('click', () => {
    const res = investir(circoId);
    if (!res.ok) { toast(res.err); return; }
    renderMap(root);
    renderCircoDetail(root, circoId);
  });
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
