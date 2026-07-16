// Phase 2 — Cartogramme des 577 circonscriptions (1 cellule = 1 siège),
// regroupées par département puis région. Choix argumenté dans docs_architecture/00 §1.1.
// Accessibilité : pattern « grid » — la carte est UN SEUL point de tabulation,
// les flèches déplacent le focus (←/→ cellule, ↑/↓ département), Entrée ouvre.

import { DEPARTEMENTS, CIRCOS, FAMILLES, MAJORITE_ABSOLUE } from './data.js';
import { load } from './store.js';
import { ECONOMIE, investir, controleur, comptageSieges, majoriteAtteinte, toast, prefersReducedMotion, partiellesDuJour, censureActive } from './guilds.js';

const REGIONS_ORDRE = [
  'Île-de-France', 'Hauts-de-France', 'Normandie', 'Grand Est', 'Bretagne',
  'Pays de la Loire', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté',
  'Nouvelle-Aquitaine', 'Auvergne-Rhône-Alpes', 'Occitanie',
  'Provence-Alpes-Côte d’Azur', 'Corse', 'Outre-mer', 'Français de l’étranger',
];

let rovingIdx = 0; // cellule porteuse du tabindex 0 (persiste entre re-rendus)

function etatCirco(s, circo, cible, partielles) {
  const infl = s.monde.influence[circo.id];
  const ctrl = controleur(infl, cible);
  const suffixe = partielles.includes(circo.id) ? ' — élection partielle en cours, influence doublée' : '';
  if (ctrl) return `contrôlée par ${FAMILLES.find((f) => f.id === ctrl).nom}${suffixe}`;
  if (infl) {
    const [tete, pts] = Object.entries(infl).sort((a, b) => b[1] - a[1])[0];
    return `contestée, ${FAMILLES.find((f) => f.id === tete).nom} en tête avec ${pts} point${pts > 1 ? 's' : ''}${suffixe}`;
  }
  return `territoire vierge${suffixe}`;
}

export function renderMap(root) {
  const s = load();
  const sieges = comptageSieges(s);
  const guilde = s.joueur.guildeId ? FAMILLES.find((f) => f.id === s.joueur.guildeId) : null;
  const vainqueur = majoriteAtteinte(s);
  const censure = censureActive(s);
  const cible = censure?.cible ?? null;
  const partielles = partiellesDuJour();

  root.innerHTML = `
    <div class="panel carte-entete">
      <div>
        <h3>Conquête des 577 circonscriptions</h3>
        <p class="hint">Investissez <strong>${ECONOMIE.COUT_INFLUENCE} capital</strong> pour +1 influence.
        Une circonscription est contrôlée à partir de <strong>${ECONOMIE.SEUIL_CONTROLE}</strong> points d’influence
        majoritaires. Objectif : <strong>${MAJORITE_ABSOLUE} sièges</strong> — la majorité absolue réelle de l’Assemblée nationale.</p>
        <p class="hint">⌨️ Au clavier : Tab pour entrer dans la carte, flèches ←/→ pour changer de
        circonscription, ↑/↓ pour changer de département, Entrée pour ouvrir.</p>
        ${guilde ? `<p>Votre guilde : <span class="pastille" style="background:${guilde.couleur}"></span> <strong>${guilde.nom}</strong> — ${sieges[guilde.id] || 0} siège(s)</p>`
          : '<p class="alerte">Rejoignez une guilde dans l’onglet Profil pour investir.</p>'}
        ${censure ? `<p class="alerte">🏛️ <strong>Motion de censure contre ${FAMILLES.find((f) => f.id === cible).nom}</strong> —
          la coalition additionne ses influences contre elle sur ses circonscriptions, encore ${censure.restant} tour${censure.restant > 1 ? 's' : ''}.</p>` : ''}
        <p class="partielles-bandeau">🔥 <strong>Partielles du jour</strong> (influence ×${ECONOMIE.PARTIELLE_MULT}) :
          ${partielles.map((id) => CIRCOS.find((c) => c.id === id).nom).join(' · ')}</p>
        ${vainqueur ? `<p class="victoire">🏆 <strong>${FAMILLES.find((f) => f.id === vainqueur).nom}</strong> a atteint la majorité absolue !</p>` : ''}
      </div>
      <div class="legende" aria-label="Sièges contrôlés par guilde">${FAMILLES.map((f) =>
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

  const cellules = []; // ordre DOM, pour la navigation aux flèches
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
        cell.dataset.idx = String(cellules.length);
        cell.dataset.dept = d.code;
        cell.setAttribute('aria-label', `${circo.nom}, ${etatCirco(s, circo, cible, partielles)}`);
        const ctrl = controleur(s.monde.influence[circo.id], cible);
        if (ctrl) {
          cell.style.background = FAMILLES.find((f) => f.id === ctrl).couleur;
          cell.classList.add('controlee');
        } else if (s.monde.influence[circo.id]) {
          cell.classList.add('contestee');
        }
        if (partielles.includes(circo.id)) cell.classList.add('partielle');
        cell.addEventListener('click', () => {
          rovingIdx = Number(cell.dataset.idx);
          majTabindex(cellules);
          renderCircoDetail(root, circo.id, { focusHeading: true });
        });
        cellules.push({ el: cell, circoId: circo.id });
        cells.appendChild(cell);
      }
      bloc.appendChild(cells);
      grille.appendChild(bloc);
    }
    section.appendChild(grille);
    carte.appendChild(section);
  }

  if (rovingIdx >= cellules.length) rovingIdx = 0;
  majTabindex(cellules);
  carte.addEventListener('keydown', (ev) => navigationClavier(ev, cellules));
}

function majTabindex(cellules) {
  cellules.forEach((c, i) => c.el.setAttribute('tabindex', i === rovingIdx ? '0' : '-1'));
}

function navigationClavier(ev, cellules) {
  const cible = ev.target.closest?.('.cell');
  if (!cible) return;
  const idx = Number(cible.dataset.idx);
  let suivant = null;
  switch (ev.key) {
    case 'ArrowRight': suivant = Math.min(idx + 1, cellules.length - 1); break;
    case 'ArrowLeft': suivant = Math.max(idx - 1, 0); break;
    case 'ArrowDown': { // première cellule du département suivant
      const dept = cible.dataset.dept;
      for (let i = idx + 1; i < cellules.length; i++) {
        if (cellules[i].el.dataset.dept !== dept) { suivant = i; break; }
      }
      break;
    }
    case 'ArrowUp': { // première cellule du département précédent
      const dept = cible.dataset.dept;
      let i = idx - 1;
      while (i >= 0 && cellules[i].el.dataset.dept === dept) i--;
      if (i >= 0) {
        const deptPrec = cellules[i].el.dataset.dept;
        while (i > 0 && cellules[i - 1].el.dataset.dept === deptPrec) i--;
        suivant = i;
      }
      break;
    }
    case 'Home': suivant = 0; break;
    case 'End': suivant = cellules.length - 1; break;
    default: return;
  }
  ev.preventDefault();
  if (suivant === null || suivant === idx) return;
  rovingIdx = suivant;
  majTabindex(cellules);
  cellules[suivant].el.focus();
}

function renderCircoDetail(root, circoId, { focusHeading = false, focusInvestir = false } = {}) {
  const s = load();
  const circo = CIRCOS.find((c) => c.id === circoId);
  const infl = s.monde.influence[circoId] || {};
  const cible = censureActive(s)?.cible ?? null;
  const ctrl = controleur(infl, cible);
  const enPartielle = partiellesDuJour().includes(circoId);
  const lignes = Object.entries(infl).sort((a, b) => b[1] - a[1]);
  const detail = root.querySelector('#circo-detail');
  detail.innerHTML = `
    <div class="panel">
      <h3 id="titre-circo" tabindex="-1">${circo.nom}</h3>
      ${enPartielle ? `<p class="partielles-bandeau">🔥 Élection partielle en cours aujourd’hui : chaque investissement vaut ${ECONOMIE.PARTIELLE_MULT} points d’influence.</p>` : ''}
      <p>${ctrl
        ? `Contrôlée par <strong>${FAMILLES.find((f) => f.id === ctrl).nom}</strong>.`
        : lignes.length ? 'Contestée — aucune guilde ne domine encore.' : 'Territoire vierge : aucune influence.'}</p>
      ${lignes.map(([g, v]) => {
        const f = FAMILLES.find((x) => x.id === g);
        return `<div class="affinite-row"><span class="pastille" style="background:${f.couleur}"></span>
          <span class="affinite-nom">${f.nom}</span><span class="affinite-score">${v} pt(s)</span></div>`;
      }).join('')}
      <button class="btn-primaire" id="btn-investir">Investir ${ECONOMIE.COUT_INFLUENCE} capital (+${enPartielle ? ECONOMIE.PARTIELLE_MULT : 1} influence)</button>
      <p class="hint">Chaque investissement déclenche un tour des guildes rivales : le scrutin uninominal
      récompense la concentration locale, pas la dispersion — c’est toute la logique du maillage territorial.</p>
    </div>`;
  detail.querySelector('#btn-investir').addEventListener('click', () => {
    const res = investir(circoId);
    if (!res.ok) { toast(res.err); return; }
    renderMap(root);
    // Re-rendu complet : on garde le focus sur le bouton pour permettre
    // les investissements répétés au clavier (Entrée, Entrée, …).
    renderCircoDetail(root, circoId, { focusInvestir: true });
  });
  if (focusHeading) detail.querySelector('#titre-circo').focus();
  if (focusInvestir) detail.querySelector('#btn-investir').focus();
  detail.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
}
