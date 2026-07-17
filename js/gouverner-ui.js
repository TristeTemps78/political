// Mode « Gouverner » — rendu de l'onglet (E5). Trois écrans : lancement,
// mandat en cours, fin de mandat. Ce module ne calcule AUCUNE règle de jeu :
// il consomme js/gouverner.js et js/assemblee.js comme seule source de vérité
// et se contente d'afficher, de collecter les choix du joueur et de rappeler
// finDeTour()/save(). Le détail du tour (carte, décision du mois, personas)
// vit dans js/gouverner-ui-mandat.js (découpe en 2 fichiers, cf. plan E5).

import { FAMILLES } from './data.js';
import { load, update } from './store.js';
import { creerPartie } from './gouverner.js';
import { composerAssemblee } from './assemblee.js';
import { comptageSieges } from './guilds.js';
import { dateDuTour } from './mandat.js';
import { renderMandat } from './gouverner-ui-mandat.js';

// Borne du dérivé de seed au lancement : reproductible dans la partie une
// fois créée (stocké dans g.seed), mais différent d'une partie à l'autre.
const BORNE_SEED = 100000;

export function renderGouverner(root) {
  const s = load();
  const g = s.monde.gouverner;
  if (!g) return renderLancement(root);
  if (g.fin) return renderFinMandat(root, g);
  return renderMandat(root, g, () => renderGouverner(root), true);
}

// --- Écran 1 : lancement -----------------------------------------------------

function renderLancement(root) {
  const s = load();
  if (s.joueur.quizFaits.length === 0) {
    root.innerHTML = `
      <div class="panel">
        <h3 id="gvn-titre" tabindex="-1">🇫🇷 Gouverner — un mandat de 2027 à 2032</h3>
        <p>Incarnez une famille politique à l’Assemblée nationale et gouvernez la France, mois après
        mois, de juin 2027 à mai 2032 : votes, négociations, crises, 49.3, motion de censure,
        dissolution, référendum — jusqu’au verdict des urnes.</p>
        <p class="alerte">Complétez d’abord un thème de la Boussole 🧭 pour débloquer ce mode :
        votre famille de départ et vos repères politiques en dépendent.</p>
        <button type="button" class="btn-primaire" id="gvn-vers-boussole">Aller à la Boussole</button>
      </div>`;
    root.querySelector('#gvn-titre').focus();
    root.querySelector('#gvn-vers-boussole').addEventListener('click', () => {
      document.querySelector('[data-onglet="quiz"]')?.click();
    });
    return;
  }

  let choix = s.joueur.guildeId || s.profil.affinites?.[0]?.familleId || FAMILLES[0].id;
  let heriter = false;

  const dessiner = () => {
    root.innerHTML = `
      <div class="panel">
        <h3 id="gvn-titre" tabindex="-1">🇫🇷 Gouverner — un mandat de 2027 à 2032</h3>
        <p>Incarnez une famille politique à l’Assemblée nationale et gouvernez la France, mois après
        mois, de juin 2027 à mai 2032 : votes, négociations, crises, 49.3, motion de censure,
        dissolution, référendum — jusqu’au verdict des urnes. Chaque mécanisme institutionnel est
        accompagné d’une fiche « Le saviez-vous ? ».</p>
        <h4>Famille politique incarnée</h4>
        <div class="cards">${FAMILLES.map((f) => `
          <button type="button" class="card guilde-card ${choix === f.id ? 'done' : ''}"
            data-famille="${f.id}" aria-pressed="${choix === f.id}">
            <span class="pastille grande" style="background:${f.couleur}"></span>
            <span class="theme-titre">${f.nom}</span>
            <span class="affinite-desc">${f.description}</span>
          </button>`).join('')}</div>
        <label class="gvn-heritage">
          <input type="checkbox" id="gvn-heritage" ${heriter ? 'checked' : ''}>
          Hériter du rapport de force de la carte Conquête (sinon, l’Assemblée de départ est générée
          par défaut, sans majorité absolue).
        </label>
        <button type="button" class="btn-primaire" id="gvn-lancer">Lancer le mandat</button>
      </div>`;
    root.querySelector('#gvn-titre').focus();
    root.querySelectorAll('[data-famille]').forEach((b) => b.addEventListener('click', () => {
      choix = b.dataset.famille;
      dessiner();
    }));
    root.querySelector('#gvn-heritage').addEventListener('change', (ev) => { heriter = ev.target.checked; });
    root.querySelector('#gvn-lancer').addEventListener('click', () => lancerPartie(root, choix, heriter));
  };
  dessiner();
}

function lancerPartie(root, familleId, heriter) {
  update((s) => {
    const options = heriter ? { sieges: comptageSieges(s) } : {};
    const assemblee = composerAssemblee(familleId, options);
    const seed = s.monde.seed + (Date.now() % BORNE_SEED);
    s.monde.gouverner = creerPartie({ seed, familleId, assemblee });
  });
  renderGouverner(root);
}

// --- Écran 3 : fin de mandat --------------------------------------------------

const LIBELLES_FIN = {
  reelu: { titre: '🎉 Réélu(e) !', texte: 'Les Français vous ont reconduit pour un nouveau mandat.' },
  battu: { titre: '🗳️ Battu(e) aux urnes', texte: 'Votre mandat s’achève sur un verdict électoral défavorable.' },
  censure: { titre: '⚠️ Renversé(e) par une motion de censure', texte: 'L’Assemblée a retiré sa confiance à votre gouvernement.' },
  demission: { titre: '📉 Démission du gouvernement', texte: 'Deux motions de censure adoptées ont eu raison de votre mandat.' },
};

function renderFinMandat(root, g) {
  const info = LIBELLES_FIN[g.fin.type] || { titre: 'Fin de mandat', texte: '' };
  const date = dateDuTour(Math.min(g.fin.tour, 59));
  root.innerHTML = `
    <div class="panel">
      <h3 id="gvn-titre" tabindex="-1">${info.titre}</h3>
      <p>${info.texte} (${date.libelle})</p>
      <div class="cards gvn-stats">
        <div class="card"><span class="theme-titre">${g.x493}</span><span class="theme-etat">usage(s) du 49.3</span></div>
        <div class="card"><span class="theme-titre">${g.censures}</span><span class="theme-etat">motion(s) de censure adoptée(s)</span></div>
        <div class="card"><span class="theme-titre">${g.dissolutionFaite ? 'Oui' : 'Non'}</span><span class="theme-etat">dissolution prononcée</span></div>
        <div class="card"><span class="theme-titre">${g.referendumsFaits}</span><span class="theme-etat">référendum(s) organisé(s)</span></div>
      </div>
      <h4>Résumé du mandat</h4>
      <ul class="gvn-journal">${[...g.journal].reverse().map((j) => `<li>${j}</li>`).join('') || '<li>Aucun événement notable.</li>'}</ul>
      <button type="button" class="btn-primaire" id="gvn-nouvelle-partie">Nouvelle partie</button>
    </div>`;
  root.querySelector('#gvn-titre').focus();
  root.querySelector('#gvn-nouvelle-partie').addEventListener('click', () => {
    if (!confirm('Démarrer un nouveau mandat ? Le bilan de la partie actuelle sera définitivement perdu.')) return;
    update((s) => { s.monde.gouverner = null; });
    renderGouverner(root);
  });
}
