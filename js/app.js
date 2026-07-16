// Amorçage de PolitiQuest 2027 : routage par onglets et barre de statut.

import { THEMES, FAMILLES } from './data.js';
import { load, update, exportData, eraseAll } from './store.js';
import { rejoindreGuilde, toast } from './guilds.js';
import { renderQuiz } from './quiz.js';
import { renderMap } from './map.js';
import { renderHemicycle } from './hemicycle.js';
import { renderGraph } from './graph.js';
import { renderPredictions } from './predictions.js';
import { renderDuels, setDefiInitial } from './duels.js';

function renderDefis(root) {
  root.innerHTML = '<div id="zone-duels"></div><div id="zone-predictions"></div>';
  renderDuels(root.querySelector('#zone-duels'));
  renderPredictions(root.querySelector('#zone-predictions'));
}

const ONGLETS = [
  { id: 'quiz', nom: 'Boussole', icone: '🧭', render: renderQuiz },
  { id: 'carte', nom: 'Conquête', icone: '🗺️', render: renderMap },
  { id: 'hemicycle', nom: 'Hémicycle', icone: '🏛️', render: (r) => renderHemicycle(r) },
  { id: 'alliances', nom: 'Alliances', icone: '🕸️', render: renderGraph },
  { id: 'defis', nom: 'Défis', icone: '🎯', render: renderDefis },
  { id: 'profil', nom: 'Profil', icone: '👤', render: renderProfil },
];

let ongletActif = 'quiz';

function renderStatus() {
  const s = load();
  const guilde = s.joueur.guildeId ? FAMILLES.find((f) => f.id === s.joueur.guildeId) : null;
  document.getElementById('statut').innerHTML = `
    <span class="statut-capital" title="Capital politique">⚡ ${s.joueur.capital}</span>
    <span class="statut-guilde">${guilde
      ? `<span class="pastille" style="background:${guilde.couleur}"></span>${guilde.nom}`
      : 'Sans guilde'}</span>
    <span class="statut-quiz">🧭 ${s.joueur.quizFaits.length}/${THEMES.length}</span>`;
}

function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = ONGLETS.map((o) =>
    `<button class="nav-btn ${o.id === ongletActif ? 'actif' : ''}" data-onglet="${o.id}"
      ${o.id === ongletActif ? 'aria-current="page"' : ''}>
      <span class="nav-icone" aria-hidden="true">${o.icone}</span><span class="nav-nom">${o.nom}</span>
    </button>`).join('');
  nav.querySelectorAll('[data-onglet]').forEach((b) =>
    b.addEventListener('click', () => afficher(b.dataset.onglet)));
}

function afficher(id) {
  ongletActif = id;
  renderNav();
  const main = document.getElementById('contenu');
  main.innerHTML = '';
  ONGLETS.find((o) => o.id === id).render(main);
}

function renderProfil(root) {
  const s = load();
  root.innerHTML = `
    <div class="panel">
      <h3>Votre guilde</h3>
      <p class="hint">La guilde est la famille idéologique pour laquelle vous conquérez des circonscriptions.
      Vous pouvez jouer votre affinité… ou incarner une perspective adverse pour la comprendre de l’intérieur (effet Protée assumé).</p>
      <div class="cards">${FAMILLES.map((f) => `
        <button class="card guilde-card ${s.joueur.guildeId === f.id ? 'done' : ''}" data-guilde="${f.id}">
          <span class="pastille grande" style="background:${f.couleur}"></span>
          <span class="theme-titre">${f.nom}</span>
          <span class="affinite-desc">${f.description}</span>
        </button>`).join('')}</div>
    </div>
    <div class="panel">
      <h3>Vos données (RGPD)</h3>
      <p class="hint">Tout — réponses, boussole, affinités, partie — est stocké uniquement sur cet appareil
      (<code>localStorage</code>). Aucune donnée d’opinion ne transite par le réseau. Le moteur d’affinité
      est en clair dans <code>js/affinity.js</code>.</p>
      <button class="btn-secondaire" id="btn-export">Exporter mes données (JSON)</button>
      <button class="btn-danger" id="btn-effacer">Tout effacer définitivement</button>
    </div>
    <div class="panel">
      <h3>À propos</h3>
      <p class="hint">PolitiQuest 2027 — prototype civique et pédagogique. Les députés, scrutins et
      compositions affichés hors du mode « virtuel » sont des <strong>données fictives de démonstration</strong> ;
      l’intégration de l’open data réel de l’Assemblée nationale est décrite dans
      <code>docs_architecture/</code>. Ce jeu ne soutient aucun parti et ne collecte rien.</p>
    </div>`;

  root.querySelectorAll('[data-guilde]').forEach((b) => b.addEventListener('click', () => {
    rejoindreGuilde(b.dataset.guilde);
    toast(`Vous avez rejoint « ${FAMILLES.find((f) => f.id === b.dataset.guilde).nom} »`);
    renderProfil(root);
  }));
  root.querySelector('#btn-export').addEventListener('click', exportData);
  root.querySelector('#btn-effacer').addEventListener('click', () => {
    if (confirm('Effacer définitivement toutes vos données locales ?')) eraseAll();
  });
}

document.addEventListener('pq:state', renderStatus);

function init() {
  load();
  renderStatus();
  renderNav();
  // Un défi reçu par lien (?defi=…) ouvre directement l'onglet Défis.
  const codeDefi = new URLSearchParams(location.search).get('defi');
  if (codeDefi) {
    setDefiInitial(codeDefi);
    history.replaceState(null, '', location.pathname); // ne pas garder le code dans l'URL
    afficher('defis');
  } else {
    afficher('quiz');
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
