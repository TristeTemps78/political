// Phase 1 — Apprentissage systémique par allocation budgétaire.
// Pas de swipe binaire : chaque thème impose un arbitrage sous contrainte.

import { THEMES, FAMILLES } from './data.js';
import { AXES, computeAxes, computeAffinites } from './affinity.js';
import { load, update } from './store.js';
import { ECONOMIE, gagnerCapital } from './guilds.js';

export function renderQuiz(root) {
  const s = load();
  root.innerHTML = `
    <div class="privacy-note">🔒 Vos réponses et votre profil restent sur cet appareil. Rien n’est envoyé sur le réseau.</div>
    <div id="quiz-list"></div>
    <div id="quiz-detail"></div>
    <div id="quiz-result"></div>`;
  renderList(root.querySelector('#quiz-list'), root);
  if (s.profil.axes) renderResult(root.querySelector('#quiz-result'));
}

function renderList(el, root) {
  const s = load();
  el.innerHTML = `<div class="cards">${THEMES.map((t) => {
    const fait = s.joueur.quizFaits.includes(t.id);
    return `<button class="card theme-card ${fait ? 'done' : ''}" data-theme="${t.id}">
      <span class="theme-icone">${t.icone}</span>
      <span class="theme-titre">${t.titre}</span>
      <span class="theme-etat">${fait ? '✓ complété — modifiable' : `+${ECONOMIE.QUIZ_THEME} capital`}</span>
    </button>`;
  }).join('')}</div>`;
  el.querySelectorAll('[data-theme]').forEach((btn) =>
    btn.addEventListener('click', () => renderTheme(root, btn.dataset.theme)));
}

function renderTheme(root, themeId) {
  const theme = THEMES.find((t) => t.id === themeId);
  const s = load();
  const alloc = { ...(s.profil.reponses[themeId] || Object.fromEntries(theme.options.map((o) => [o.id, 0]))) };
  const detail = root.querySelector('#quiz-detail');

  const draw = () => {
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    const reste = theme.budget - total;
    detail.innerHTML = `
      <div class="panel">
        <h3>${theme.icone} ${theme.titre}</h3>
        <p class="contexte">${theme.contexte}</p>
        <p class="budget-restant ${reste === 0 ? 'ok' : ''}">Budget restant : <strong>${reste}</strong> / ${theme.budget} points</p>
        ${theme.options.map((o) => `
          <div class="alloc-row">
            <span class="alloc-libelle">${o.libelle}</span>
            <span class="alloc-controls">
              <button class="btn-mini" data-moins="${o.id}" aria-label="Retirer un point">−</button>
              <span class="alloc-val">${alloc[o.id]}</span>
              <button class="btn-mini" data-plus="${o.id}" aria-label="Ajouter un point">+</button>
            </span>
            <span class="alloc-bar"><span style="width:${(alloc[o.id] / theme.budget) * 100}%"></span></span>
          </div>`).join('')}
        <button class="btn-primaire" id="valider-theme" ${reste !== 0 ? 'disabled' : ''}>
          ${reste === 0 ? 'Valider mes arbitrages' : `Allouez encore ${reste} point${reste > 1 ? 's' : ''}`}
        </button>
      </div>`;
    detail.querySelectorAll('[data-plus]').forEach((b) => b.addEventListener('click', () => {
      if (Object.values(alloc).reduce((a, c) => a + c, 0) < theme.budget) { alloc[b.dataset.plus] += 1; draw(); }
    }));
    detail.querySelectorAll('[data-moins]').forEach((b) => b.addEventListener('click', () => {
      if (alloc[b.dataset.moins] > 0) { alloc[b.dataset.moins] -= 1; draw(); }
    }));
    detail.querySelector('#valider-theme').addEventListener('click', () => valider(root, themeId, alloc));
  };
  draw();
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function valider(root, themeId, alloc) {
  const premiereFois = !load().joueur.quizFaits.includes(themeId);
  update((s) => {
    s.profil.reponses[themeId] = alloc;
    if (premiereFois) s.joueur.quizFaits.push(themeId);
    s.profil.axes = computeAxes(s.profil.reponses);
    s.profil.affinites = computeAffinites(s.profil.axes);
  });
  if (premiereFois) {
    gagnerCapital(ECONOMIE.QUIZ_THEME, 'thème complété');
    if (load().joueur.quizFaits.length === THEMES.length) {
      gagnerCapital(ECONOMIE.PROFIL_COMPLET, 'profil complet 6/6 !');
    }
  }
  root.querySelector('#quiz-detail').innerHTML = '';
  renderList(root.querySelector('#quiz-list'), root);
  renderResult(root.querySelector('#quiz-result'));
}

function renderResult(el) {
  const s = load();
  if (!s.profil.axes) return;
  const top = s.profil.affinites.slice(0, 3)
    .map((a) => ({ ...a, famille: FAMILLES.find((f) => f.id === a.familleId) }));
  const adverse = s.profil.affinites[s.profil.affinites.length - 1];
  const familleAdverse = FAMILLES.find((f) => f.id === adverse.familleId);

  el.innerHTML = `
    <div class="panel">
      <h3>Votre boussole (${s.joueur.quizFaits.length}/${THEMES.length} thèmes)</h3>
      ${AXES.map((a) => {
        const v = s.profil.axes[a.id];
        return `<div class="axe-row">
          <span class="axe-pole">${a.gauche}</span>
          <span class="axe-track"><span class="axe-dot" style="left:${((v + 1) / 2) * 100}%"></span></span>
          <span class="axe-pole droit">${a.droite}</span>
        </div>`;
      }).join('')}
      <h4>Familles les plus proches</h4>
      ${top.map((a) => `
        <div class="affinite-row">
          <span class="pastille" style="background:${a.famille.couleur}"></span>
          <span class="affinite-nom">${a.famille.nom}</span>
          <span class="affinite-bar"><span style="width:${Math.round(a.score * 100)}%;background:${a.famille.couleur}"></span></span>
          <span class="affinite-score">${Math.round(a.score * 100)} %</span>
        </div>
        <p class="affinite-desc">${a.famille.description}</p>`).join('')}
      <div class="perspective">
        <h4>Comprendre la perspective adverse</h4>
        <p>Votre famille la plus éloignée est <strong>${familleAdverse.nom}</strong> : ${familleAdverse.description}
        Comprendre pourquoi des citoyens sincères défendent cette vision est la compétence
        démocratique que ce jeu cherche à exercer — vos adversaires sur la carte la défendront.</p>
      </div>
    </div>`;
}
