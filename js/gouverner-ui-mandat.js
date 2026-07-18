// Mode « Gouverner » — écran « mandat en cours » (E5, cf. gouverner-ui.js pour
// les écrans lancement/fin). Aucune règle de jeu ici : chaque bouton appelle le
// moteur pur (gouverner.js/assemblee.js) et se contente d'afficher son résultat.

import { load, update } from './store.js';
import { DEPARTEMENTS, FAMILLES } from './data.js';
import { finDeTour, humeurDepartement, ECONOMIE_GOUVERNER } from './gouverner.js';
import {
  deposerTexte, intentionsDeVote, negocier, voterTexte, engager493, voterCensure,
  dissoudre, referendum,
} from './assemblee.js';
import { PERSONAS, poidsSegments } from './personas.js';
import { dateDuTour, REFORMES, EVENEMENTS } from './mandat.js';
import { renderCarteFrance } from './carte-france.js';
import { ficheParId } from './fiches.js';
import { toast } from './guilds.js';

let selectionDept = null;      // persiste entre re-rendus (comme rovingIdx de carte-france.js)
let panneauReformes = false;   // affichage de la liste des réformes proposables

export function renderMandat(root, g, alFinDuTour, focaliserEntete = false) {
  const date = dateDuTour(g.tour);
  const guilde = FAMILLES.find((f) => f.id === g.familleId);

  // Une échéance électorale intermédiaire (européennes, sénatoriales,
  // municipales) vient de se résoudre au tour précédent : bannière + fiche.
  const echeanceRecente = g.derniereEcheance && g.derniereEcheance.tour === g.tour - 1 ? g.derniereEcheance : null;

  root.innerHTML = `
    <div class="panel">
      <h3 id="gvn-titre" tabindex="-1">🇫🇷 Gouverner — ${date.libelle}</h3>
      <p class="hint">Vous incarnez <strong style="color:${guilde.couleur}">${guilde.nom}</strong> —
      ${g.assemblee[g.familleId] || 0} sièges sur 577 à l’Assemblée (majorité relative).</p>
      <div class="gvn-jauges">
        ${jaugePopularite(g.jauges.popularite)}
        ${jaugeSolde(g.jauges.solde)}
      </div>
    </div>
    ${echeanceRecente ? `
    <div class="panel gvn-echeance" aria-live="polite">
      <h4>📅 Résultat d’une échéance électorale</h4>
      <p>${libelleEcheance(echeanceRecente)}</p>
      <button type="button" class="btn-secondaire" id="gvn-voir-fiche-echeance">📘 En savoir plus</button>
    </div>` : ''}
    <div class="panel">
      <h4>Carte de France — humeur des territoires</h4>
      <div id="gvn-carte"></div>
      <div id="gvn-dept-detail"></div>
    </div>
    <div class="panel" id="gvn-decision"></div>
    <div class="panel">
      <h4>Réactions citoyennes</h4>
      <div id="gvn-personas" class="gvn-personas" aria-live="polite"></div>
    </div>
    <div class="panel">
      <h4>Journal du mandat</h4>
      <ul class="gvn-journal">${[...g.journal].reverse().map((j) => `<li>${j}</li>`).join('') || '<li>Rien à signaler pour l’instant.</li>'}</ul>
    </div>`;

  if (focaliserEntete) root.querySelector('#gvn-titre').focus();
  const btnFicheEcheance = root.querySelector('#gvn-voir-fiche-echeance');
  if (btnFicheEcheance) btnFicheEcheance.addEventListener('click', () => consulterFiche(echeanceRecente.fiche));
  renderCarte(root, g);
  renderPersonas(root, g);
  renderDecision(root, g, alFinDuTour, !focaliserEntete);
}

// Libellé lisible du résultat d'une échéance électorale intermédiaire, pour
// la bannière ci-dessus (réutilisé nulle part ailleurs : un seul écran l'affiche).
function libelleEcheance(e) {
  if (e.type === 'europeennes') {
    return `🇪🇺 Élections européennes 2029 : score du gouvernement ${e.resultat.score} % (participation simulée ${e.resultat.participation} %)${e.resultat.malus ? ' — sanction dans les urnes.' : '.'}`;
  }
  if (e.type === 'senatoriales') {
    return `🏛️ Sénatoriales : le Sénat est désormais ${e.resultat.senatHostile ? 'hostile' : 'favorable'} (popularité ${e.resultat.popularite} % lors du renouvellement).`;
  }
  if (e.type === 'municipales') {
    return `🏘️ Municipales 2031 : ${e.resultat.deptsChocNegatif.length} département(s) sanctionné(s), ${e.resultat.deptsChocPositif.length} récompensé(s) dans leur ancrage local.`;
  }
  return '';
}

function jaugePopularite(valeur) {
  const pct = Math.max(0, Math.min(100, valeur));
  return `<div class="jauge" role="group" aria-label="Popularité : ${valeur} sur 100">
    <span class="jauge-label">Popularité</span>
    <span class="jauge-barre" aria-hidden="true"><span class="jauge-remplissage pos" style="width:${pct}%"></span></span>
    <span class="jauge-valeur">${valeur} %</span>
  </div>`;
}

function jaugeSolde(solde) {
  const pct = Math.max(0, Math.min(100, ((solde + 100) / 200) * 100));
  const signe = solde >= 0 ? 'pos' : 'neg';
  return `<div class="jauge" role="group" aria-label="Solde budgétaire : ${solde} milliards d’euros par an, ${solde >= 0 ? 'excédent' : 'déficit'}">
    <span class="jauge-label">Solde budgétaire</span>
    <span class="jauge-barre" aria-hidden="true"><span class="jauge-remplissage ${signe}" style="width:${pct}%"></span></span>
    <span class="jauge-valeur">${solde} Md€/an</span>
  </div>`;
}

// --- Carte de France + détail département -------------------------------------

function descriptionHumeur(h) {
  if (h >= 20) return 'très favorable';
  if (h >= 5) return 'plutôt favorable';
  if (h > -5) return 'neutre';
  if (h > -20) return 'plutôt défavorable';
  return 'très défavorable';
}

function renderCarte(root, g) {
  const el = root.querySelector('#gvn-carte');
  renderCarteFrance(el, {
    valeur: (code) => humeurDepartement(g, code),
    libelle: (code) => {
      const d = DEPARTEMENTS.find((x) => x.code === code);
      const h = humeurDepartement(g, code);
      return `${d ? d.nom : code} — humeur ${descriptionHumeur(h)} (${h > 0 ? '+' : ''}${h})`;
    },
    onSelect: (code) => { selectionDept = code; renderDeptDetail(root, g, true); },
    selection: selectionDept,
  });
  renderDeptDetail(root, g);
}

// `focaliser` : uniquement lors d'une sélection explicite — un re-rendu de tour
// ne doit pas voler le focus au reste de l'écran.
function renderDeptDetail(root, g, focaliser = false) {
  const el = root.querySelector('#gvn-dept-detail');
  if (!selectionDept) { el.innerHTML = ''; return; }
  const d = DEPARTEMENTS.find((x) => x.code === selectionDept);
  const h = humeurDepartement(g, selectionDept);
  const poids = poidsSegments(selectionDept);
  const top = [...PERSONAS].sort((a, b) => (poids[b.id] || 0) - (poids[a.id] || 0)).slice(0, 3);
  el.innerHTML = `
    <div class="panel">
      <h5 id="gvn-dept-titre" tabindex="-1">${d ? d.nom : selectionDept}</h5>
      <p>Humeur locale : <strong>${descriptionHumeur(h)}</strong> (${h > 0 ? '+' : ''}${h}, échelle -100 à +100).</p>
      <p class="hint">Personas les plus représentatifs de ce territoire :</p>
      ${top.map((p) => `<div class="affinite-row"><span aria-hidden="true">${p.emoji}</span>
        <span class="affinite-nom">${p.nom}</span><span class="affinite-desc">${p.segment}</span></div>`).join('')}
    </div>`;
  if (focaliser) el.querySelector('#gvn-dept-titre').focus();
}

// --- Réactions citoyennes -------------------------------------------------------

function renderPersonas(root, g) {
  const el = root.querySelector('#gvn-personas');
  el.innerHTML = PERSONAS.map((p) => {
    const etat = g.personas[p.id];
    const dernier = etat.recits[etat.recits.length - 1];
    return `<div class="gvn-persona">
      <span aria-hidden="true">${p.emoji}</span>
      <span class="gvn-persona-nom">${p.nom}</span>
      <span class="gvn-persona-humeur">${descriptionHumeur(etat.humeur)} (${etat.humeur > 0 ? '+' : ''}${etat.humeur})</span>
      ${dernier ? `<span class="gvn-persona-recit">${dernier}</span>` : ''}
    </div>`;
  }).join('');
}

// --- Décision du mois -----------------------------------------------------------

function renderDecision(root, g, alFinDuTour, focus = true) {
  const el = root.querySelector('#gvn-decision');
  if (g.evenementEnCours) renderEvenement(el, root, g, alFinDuTour);
  else renderAgenda(el, root, g, alFinDuTour);
  if (focus) {
    const titre = el.querySelector('h4');
    titre?.setAttribute('tabindex', '-1');
    titre?.focus();
  }
}

function renderEvenement(el, root, g, alFinDuTour) {
  const evt = EVENEMENTS.find((e) => e.id === g.evenementEnCours.id);
  if (!evt) { el.innerHTML = '<h4>Décision du mois</h4><p class="hint">Aucune décision notable.</p>'; return; }
  el.innerHTML = `
    <h4>🚨 ${evt.titre}</h4>
    <p>${evt.texte}</p>
    <div class="gvn-reponses">
      ${evt.reponses.map((r, i) => `<button type="button" class="btn-secondaire" data-reponse="${i}">${r.libelle}</button>`).join('')}
      <button type="button" class="btn-secondaire" id="gvn-ignorer-evt">Ne pas intervenir ce mois-ci</button>
    </div>`;
  el.querySelectorAll('[data-reponse]').forEach((b) => b.addEventListener('click', () => {
    const r = evt.reponses[Number(b.dataset.reponse)];
    const decision = { effets: r.effets, cout: r.cout, libelle: `${evt.titre} — ${r.libelle}` };
    // Choc local déterministe (dérivé du tour) : la crise touche un des
    // départements plausibles, l'ampleur du soulagement suit l'effort budgétaire
    // engagé — heuristique d'affichage, ne duplique aucun seuil du moteur.
    if (evt.local) {
      const dept = evt.deptsPossibles[g.tour % evt.deptsPossibles.length];
      decision.choc = { dept, montant: Math.round(-r.cout * 2) };
    }
    resoudre(root, g, decision, null, alFinDuTour);
  }));
  el.querySelector('#gvn-ignorer-evt').addEventListener('click', () => resoudre(root, g, undefined, null, alFinDuTour));
}

function renderAgenda(el, root, g, alFinDuTour) {
  if (g.enCours) { renderTexteEnCours(el, root, g, alFinDuTour); return; }
  el.innerHTML = `
    <h4>Agenda législatif</h4>
    <p class="hint">Aucun texte en discussion. Proposez une réforme, ou passez le mois.</p>
    <button type="button" class="btn-secondaire" id="gvn-toggle-reformes">${panneauReformes ? 'Masquer les réformes' : 'Proposer une réforme'}</button>
    ${panneauReformes ? `<div class="gvn-reformes">${REFORMES.map((r) => `
      <div class="gvn-reforme-item">
        <span>${r.icone} ${r.titre}</span>
        <span class="gvn-reforme-actions">
          <button type="button" class="btn-mini2" data-deposer="${r.id}">Déposer un texte</button>
          <button type="button" class="btn-mini2" data-referendum="${r.id}">Référendum</button>
        </span>
      </div>`).join('')}</div>` : ''}
    <p class="gvn-reponses">
      ${!g.dissolutionFaite ? '<button type="button" class="btn-secondaire" id="gvn-dissoudre">Dissoudre l’Assemblée (art. 12, usage unique)</button>' : ''}
      <button type="button" class="btn-primaire" id="gvn-passer">Passer le mois</button>
    </p>`;

  el.querySelector('#gvn-toggle-reformes').addEventListener('click', () => {
    panneauReformes = !panneauReformes;
    renderDecision(root, g, alFinDuTour);
  });
  el.querySelectorAll('[data-deposer]').forEach((b) => b.addEventListener('click', () => {
    try {
      update((s) => deposerTexte(s.monde.gouverner, b.dataset.deposer));
      panneauReformes = false;
      renderDecision(root, load().monde.gouverner, alFinDuTour);
    } catch (e) { toast(e.message); }
  }));
  el.querySelectorAll('[data-referendum]').forEach((b) => b.addEventListener('click', () => {
    try {
      let res;
      update((s) => { res = referendum(s.monde.gouverner, b.dataset.referendum); });
      resoudre(root, load().monde.gouverner, res.decision, res.fiche, alFinDuTour);
    } catch (e) { toast(e.message); }
  }));
  const btnDissoudre = el.querySelector('#gvn-dissoudre');
  if (btnDissoudre) btnDissoudre.addEventListener('click', () => {
    if (!confirm('Dissoudre l’Assemblée nationale ? Nouvelles élections législatives, usage unique par mandat.')) return;
    update((s) => dissoudre(s.monde.gouverner));
    renderDecision(root, load().monde.gouverner, alFinDuTour);
  });
  el.querySelector('#gvn-passer').addEventListener('click', () => resoudre(root, g, undefined, null, alFinDuTour));
}

function libellePosition(pos) {
  return pos === 'pour' ? 'Pour' : pos === 'contre' ? 'Contre' : 'Abstention';
}

function renderTexteEnCours(el, root, g, alFinDuTour) {
  const reforme = REFORMES.find((r) => r.id === g.enCours.reformeId);
  const votes = intentionsDeVote(g);
  const capital = load().joueur.capital;
  el.innerHTML = `
    <h4>Texte en discussion : ${reforme.icone} ${reforme.titre}</h4>
    <p class="hint">Intentions de vote projetées — <strong>${votes.pour}</strong> pour,
    <strong>${votes.contre}</strong> contre, ${votes.abstention} abstention(s) sur 577.</p>
    <div class="gvn-vote-table">${FAMILLES.map((f) => `
      <div class="gvn-vote-row">
        <span class="pastille" style="background:${f.couleur}"></span>
        <span>${f.nom}</span>
        <span class="gvn-vote-position gvn-vote-${votes.positions[f.id]}">${libellePosition(votes.positions[f.id])}</span>
        ${votes.positions[f.id] !== 'pour'
          ? `<button type="button" class="btn-mini2" data-negocier="${f.id}">Négocier (${ECONOMIE_GOUVERNER.COUT_NEGOCIER} capital)</button>`
          : ''}
      </div>`).join('')}</div>
    <p class="hint">Capital politique disponible : <strong>${capital}</strong>.</p>
    <div class="gvn-reponses">
      <button type="button" class="btn-primaire" id="gvn-voter">Mettre le texte au vote</button>
      <button type="button" class="btn-secondaire" id="gvn-493">Engager la responsabilité (49.3)</button>
    </div>`;

  el.querySelectorAll('[data-negocier]').forEach((b) => b.addEventListener('click', () => {
    try {
      update((s) => {
        const res = negocier(s.monde.gouverner, b.dataset.negocier, s.joueur.capital);
        s.joueur.capital = res.capital;
      });
      renderDecision(root, load().monde.gouverner, alFinDuTour);
    } catch (e) { toast(e.message); }
  }));
  el.querySelector('#gvn-voter').addEventListener('click', () => {
    let res;
    update((s) => { res = voterTexte(s.monde.gouverner); });
    resoudre(root, load().monde.gouverner, res.decision, res.fiche, alFinDuTour);
  });
  el.querySelector('#gvn-493').addEventListener('click', () => {
    let res;
    update((s) => {
      engager493(s.monde.gouverner);
      res = voterCensure(s.monde.gouverner);
    });
    resoudre(root, load().monde.gouverner, res.decision, res.fiche, alFinDuTour);
  });
}

// --- Résolution de la décision du mois -------------------------------------------

// Applique finDeTour, ré-affiche l'écran adapté (mandat ou fin de mandat) et
// ouvre la fiche pédagogique le cas échéant (récompense de 1re lecture gérée
// par consulterFiche, cf. plus bas).
function resoudre(root, g, decision, ficheId, alFinDuTour) {
  update((s) => { finDeTour(s.monde.gouverner, decision); });
  alFinDuTour();
  if (ficheId) consulterFiche(ficheId);
}

// Ouvre la fiche pédagogique `ficheId`, récompense sa première lecture (capital
// gagné par apprentissage, jamais autrement) et affiche la boîte de dialogue.
// Exporté : réutilisé par gouverner-ui.js (fiche du verdict 2032) et par la
// bannière d'échéance intermédiaire ci-dessus, sans dupliquer cette logique.
export function consulterFiche(ficheId) {
  let premiereFois = false;
  update((s) => {
    if (!s.monde.gouverner.fichesVues.includes(ficheId)) {
      premiereFois = true;
      s.monde.gouverner.fichesVues.push(ficheId);
      s.joueur.capital += ECONOMIE_GOUVERNER.RECOMP_FICHE;
    }
  });
  ouvrirFicheDialog(ficheId, premiereFois);
}

function ouvrirFicheDialog(ficheId, gagne) {
  const fiche = ficheParId(ficheId);
  if (!fiche) return;
  let dlg = document.getElementById('gvn-fiche-dialog');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'gvn-fiche-dialog';
    dlg.className = 'gvn-fiche-dialog';
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = `
    <h3 id="gvn-fiche-titre" tabindex="-1">📘 ${fiche.titre}</h3>
    ${fiche.article ? `<p class="hint">${fiche.article}</p>` : ''}
    <p>${fiche.texte}</p>
    <ul>${fiche.reperes.map((r) => `<li>${r}</li>`).join('')}</ul>
    ${gagne ? `<p class="victoire">+${ECONOMIE_GOUVERNER.RECOMP_FICHE} capital — première lecture de cette fiche.</p>` : ''}
    <button type="button" class="btn-primaire" id="gvn-fiche-fermer">Fermer</button>`;
  dlg.querySelector('#gvn-fiche-fermer').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove(), { once: true });
  dlg.showModal();
  dlg.querySelector('#gvn-fiche-titre').focus();
}
