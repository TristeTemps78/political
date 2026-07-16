// Duels de débat — deux modes, 100 % hors ligne :
// 1. Entraînement « Pensez comme l'adversaire » : allouer un budget COMME le
//    ferait une famille rivale (effet Protée : gagner = comprendre l'autre).
// 2. Défi entre amis : un code/lien encode les arbitrages d'un joueur ; l'autre
//    doit prédire sa politique la plus financée. Aucune donnée ne transite par
//    un serveur — le code est le message.

import { THEMES, FAMILLES } from './data.js';
import { load, update } from './store.js';
import { ECONOMIE, gagnerCapital, duelsDuJour, toast } from './guilds.js';

// Allocation canonique d'une famille sur un thème : utilité de chaque option
// (produit scalaire vecteur famille × effets), répartition softmax déterministe.
export function allocationFamille(famille, theme) {
  const utils = theme.options.map((o) =>
    Object.entries(o.effets).reduce((s, [axe, v]) => s + (famille.vecteur[axe] || 0) * v, 0));
  const exp = utils.map((u) => Math.exp(u * 2));
  const tot = exp.reduce((a, b) => a + b, 0);
  const alloc = theme.options.map((_, i) => Math.floor((theme.budget * exp[i]) / tot));
  let reste = theme.budget - alloc.reduce((a, b) => a + b, 0);
  const ordre = utils.map((u, i) => [u, i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; reste > 0; k = (k + 1) % ordre.length, reste--) alloc[ordre[k][1]] += 1;
  return Object.fromEntries(theme.options.map((o, i) => [o.id, alloc[i]]));
}

// Similarité entre deux allocations ∈ [0,1] : 1 − distance L1 normalisée.
export function similarite(a, b, budget) {
  const cles = new Set([...Object.keys(a), ...Object.keys(b)]);
  let diff = 0;
  for (const k of cles) diff += Math.abs((a[k] || 0) - (b[k] || 0));
  return 1 - diff / (2 * budget);
}

// --- Encodage des défis entre amis (base64url d'un JSON compact) -------------
export function encoderDefi(themeId, alloc, pseudo) {
  const json = JSON.stringify({ v: 1, t: themeId, a: alloc, p: pseudo || null });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decoderDefi(code) {
  try {
    const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
    const d = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (d.v !== 1) return null;
    const theme = THEMES.find((t) => t.id === d.t);
    if (!theme) return null;
    let total = 0;
    for (const opt of theme.options) {
      const pts = d.a[opt.id];
      if (!Number.isInteger(pts) || pts < 0) return null;
      total += pts;
    }
    if (total !== theme.budget) return null;
    return { theme, alloc: d.a, pseudo: typeof d.p === 'string' ? d.p.slice(0, 30) : null };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------

let defiInitial = null; // code arrivé par l'URL (?defi=…)
export function setDefiInitial(code) { defiInitial = code; }

export function renderDuels(root) {
  const duels = duelsDuJour();
  root.innerHTML = `
    <div class="panel">
      <h3>⚔️ Duels de débat</h3>
      <div class="cards">
        <button class="card" id="duel-ia">
          <span class="theme-icone" aria-hidden="true">🎭</span>
          <span class="theme-titre">Pensez comme l’adversaire</span>
          <span class="theme-etat">Incarnez une famille rivale — jusqu’à +${ECONOMIE.DUEL_IA_RECOMP_FORTE} capital (${ECONOMIE.DUEL_IA_MAX_JOUR - duels.ia}/${ECONOMIE.DUEL_IA_MAX_JOUR} restants aujourd’hui)</span>
        </button>
        <button class="card" id="duel-creer">
          <span class="theme-icone" aria-hidden="true">📤</span>
          <span class="theme-titre">Défier un ami</span>
          <span class="theme-etat">Générez un lien : saura-t-il prédire vos arbitrages ?</span>
        </button>
        <button class="card" id="duel-relever">
          <span class="theme-icone" aria-hidden="true">📥</span>
          <span class="theme-titre">Relever un défi</span>
          <span class="theme-etat">Misez ${ECONOMIE.DEFI_AMI_MISE}, gagnez ${ECONOMIE.DEFI_AMI_GAIN} si vous lisez bien votre ami (${ECONOMIE.DEFI_AMI_MAX_JOUR - duels.amis}/${ECONOMIE.DEFI_AMI_MAX_JOUR} aujourd’hui)</span>
        </button>
      </div>
      <div id="duel-zone"></div>
    </div>`;
  root.querySelector('#duel-ia').addEventListener('click', () => renderDuelIA(root));
  root.querySelector('#duel-creer').addEventListener('click', () => renderCreerDefi(root));
  root.querySelector('#duel-relever').addEventListener('click', () => renderReleverDefi(root));
  if (defiInitial) {
    const code = defiInitial;
    defiInitial = null;
    renderReleverDefi(root, code);
  }
}

// --- Mode 1 : pensez comme l'adversaire ---------------------------------------
function renderDuelIA(root) {
  const zone = root.querySelector('#duel-zone');
  if (duelsDuJour().ia >= ECONOMIE.DUEL_IA_MAX_JOUR) {
    zone.innerHTML = '<p class="hint">Limite quotidienne atteinte — revenez demain (l’économie du jeu récompense l’apprentissage, pas le farm).</p>';
    return;
  }
  const s = load();
  const rivales = FAMILLES.filter((f) => f.id !== s.joueur.guildeId);
  zone.innerHTML = `
    <h4 id="duel-titre" tabindex="-1">Choisissez qui incarner, et sur quel thème</h4>
    <div class="pari-form">
      <select id="duel-famille" aria-label="Famille à incarner">
        ${rivales.map((f) => `<option value="${f.id}">${f.nom}</option>`).join('')}
      </select>
      <select id="duel-theme" aria-label="Thème du duel">
        ${THEMES.map((t) => `<option value="${t.id}">${t.icone} ${t.titre}</option>`).join('')}
      </select>
      <button class="btn-secondaire" id="duel-go">Commencer</button>
    </div>`;
  zone.querySelector('#duel-titre').focus();
  zone.querySelector('#duel-go').addEventListener('click', () => {
    const famille = FAMILLES.find((f) => f.id === zone.querySelector('#duel-famille').value);
    const theme = THEMES.find((t) => t.id === zone.querySelector('#duel-theme').value);
    jouerDuelIA(root, famille, theme);
  });
}

function jouerDuelIA(root, famille, theme) {
  const zone = root.querySelector('#duel-zone');
  const alloc = Object.fromEntries(theme.options.map((o) => [o.id, 0]));

  const draw = () => {
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    const reste = theme.budget - total;
    zone.innerHTML = `
      <h4 id="duel-titre" tabindex="-1">🎭 Vous êtes « ${famille.nom} » — ${theme.titre}</h4>
      <p class="hint">${famille.description}</p>
      <p class="hint">Répartissez les ${theme.budget} points comme CETTE famille le ferait. Reste : <strong>${reste}</strong>.</p>
      ${theme.options.map((o) => `
        <div class="alloc-row">
          <span class="alloc-libelle">${o.libelle}</span>
          <span class="alloc-controls">
            <button class="btn-mini" data-m="${o.id}" aria-label="Retirer un point — ${o.libelle} (${alloc[o.id]})" ${alloc[o.id] === 0 ? 'disabled' : ''}>−</button>
            <span class="alloc-val" aria-hidden="true">${alloc[o.id]}</span>
            <button class="btn-mini" data-p="${o.id}" aria-label="Ajouter un point — ${o.libelle} (${alloc[o.id]})" ${reste === 0 ? 'disabled' : ''}>+</button>
          </span>
        </div>`).join('')}
      <button class="btn-primaire" id="duel-valider" ${reste !== 0 ? 'disabled' : ''}>Confronter ma lecture</button>`;
    zone.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { alloc[b.dataset.p] += 1; draw(); }));
    zone.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { alloc[b.dataset.m] -= 1; draw(); }));
    zone.querySelector('#duel-valider').addEventListener('click', valider);
  };

  const valider = () => {
    const canonique = allocationFamille(famille, theme);
    const sim = similarite(alloc, canonique, theme.budget);
    update((st) => { st.joueur.duels.ia += 1; });
    let recompense = 0;
    if (sim >= 0.8) recompense = ECONOMIE.DUEL_IA_RECOMP_FORTE;
    else if (sim >= 0.6) recompense = ECONOMIE.DUEL_IA_RECOMP_FAIBLE;
    if (recompense) gagnerCapital(recompense, `lecture de ${famille.nom} : ${Math.round(sim * 100)} %`);
    zone.innerHTML = `
      <h4 id="duel-titre" tabindex="-1">${sim >= 0.8 ? '🏆' : sim >= 0.6 ? '👍' : '📚'} Similarité : ${Math.round(sim * 100)} %
        ${recompense ? `(+${recompense} capital)` : '(aucun gain sous 60 %)'}</h4>
      <p class="hint">Ce que « ${famille.nom} » aurait fait, et pourquoi :</p>
      ${theme.options.map((o) => `
        <div class="alloc-row">
          <span class="alloc-libelle">${o.libelle}</span>
          <span class="affinite-score">vous : ${alloc[o.id]} — la famille : ${canonique[o.id]}</span>
        </div>`).join('')}
      <p class="perspective hint">Comprendre pourquoi des citoyens sincères arbitrent ainsi est exactement la
      compétence que ce duel exerce. ${famille.description}</p>
      <button class="btn-secondaire" id="duel-retour">Retour aux duels</button>`;
    zone.querySelector('#duel-titre').focus();
    zone.querySelector('#duel-retour').addEventListener('click', () => renderDuels(root));
  };

  draw();
  zone.querySelector('#duel-titre').focus();
}

// --- Mode 2 : créer un défi ----------------------------------------------------
function renderCreerDefi(root) {
  const zone = root.querySelector('#duel-zone');
  const s = load();
  const faits = THEMES.filter((t) => s.joueur.quizFaits.includes(t.id));
  if (!faits.length) {
    zone.innerHTML = '<p class="hint">Complétez d’abord au moins un thème de la Boussole : le défi porte sur VOS arbitrages réels.</p>';
    return;
  }
  zone.innerHTML = `
    <h4 id="duel-titre" tabindex="-1">📤 Défier un ami</h4>
    <p class="hint">Le lien contient uniquement le thème, vos ${faits[0].budget} points et votre pseudo —
    rien d’autre, aucun serveur. Votre ami devra prédire votre politique la plus financée.</p>
    <div class="pari-form">
      <input type="text" id="duel-pseudo" maxlength="30" placeholder="Votre pseudo" value="${s.joueur.pseudo || ''}" aria-label="Votre pseudo">
      <select id="duel-theme-ami" aria-label="Thème du défi">
        ${faits.map((t) => `<option value="${t.id}">${t.icone} ${t.titre}</option>`).join('')}
      </select>
      <button class="btn-secondaire" id="duel-generer">Générer le lien</button>
    </div>
    <div id="duel-code"></div>`;
  zone.querySelector('#duel-titre').focus();
  zone.querySelector('#duel-generer').addEventListener('click', () => {
    const pseudo = zone.querySelector('#duel-pseudo').value.trim() || null;
    if (pseudo) update((st) => { st.joueur.pseudo = pseudo; });
    const themeId = zone.querySelector('#duel-theme-ami').value;
    const code = encoderDefi(themeId, load().profil.reponses[themeId], pseudo);
    const url = `${location.origin}${location.pathname}?defi=${code}`;
    zone.querySelector('#duel-code').innerHTML = `
      <p><strong>Envoyez ce lien à votre ami :</strong></p>
      <textarea readonly rows="3" style="width:100%" aria-label="Lien du défi">${url}</textarea>
      <button class="btn-secondaire" id="duel-copier">Copier le lien</button>`;
    zone.querySelector('#duel-copier').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('Lien copié !'); }
      catch { zone.querySelector('textarea').select(); toast('Sélectionné — copiez avec Ctrl+C'); }
    });
  });
}

// --- Mode 2 : relever un défi ---------------------------------------------------
function renderReleverDefi(root, codePrefill = null) {
  const zone = root.querySelector('#duel-zone');
  zone.innerHTML = `
    <h4 id="duel-titre" tabindex="-1">📥 Relever un défi</h4>
    <textarea id="duel-entree" rows="3" style="width:100%" placeholder="Collez ici le lien ou le code reçu"
      aria-label="Lien ou code du défi">${codePrefill || ''}</textarea>
    <button class="btn-secondaire" id="duel-lire">Ouvrir le défi</button>
    <div id="duel-jeu"></div>`;
  zone.querySelector('#duel-titre').focus();
  const lire = () => {
    const brut = zone.querySelector('#duel-entree').value;
    const code = brut.includes('defi=') ? brut.split('defi=')[1].split(/[&\s]/)[0] : brut;
    const defi = decoderDefi(code);
    if (!defi) { toast('Code invalide ou corrompu.'); return; }
    jouerDefi(root, defi);
  };
  zone.querySelector('#duel-lire').addEventListener('click', lire);
  if (codePrefill) lire();
}

function jouerDefi(root, defi) {
  const zone = root.querySelector('#duel-jeu') || root.querySelector('#duel-zone');
  if (duelsDuJour().amis >= ECONOMIE.DEFI_AMI_MAX_JOUR) {
    zone.innerHTML = '<p class="hint">Limite quotidienne de défis atteinte — revenez demain.</p>';
    return;
  }
  if (load().joueur.capital < ECONOMIE.DEFI_AMI_MISE) {
    zone.innerHTML = `<p class="hint">Il faut ${ECONOMIE.DEFI_AMI_MISE} de capital pour miser — complétez un thème de la Boussole d’abord.</p>`;
    return;
  }
  const qui = defi.pseudo || 'Votre adversaire';
  zone.innerHTML = `
    <h4 id="duel-q" tabindex="-1">${defi.theme.icone} ${defi.theme.titre}</h4>
    <p><strong>${qui}</strong> a réparti ${defi.theme.budget} points sur ce thème.
    Mise : <strong>${ECONOMIE.DEFI_AMI_MISE} capital</strong>. Quelle politique a-t-il le PLUS financée ?</p>
    ${defi.theme.options.map((o) => `<button class="btn-secondaire" data-devine="${o.id}" style="display:block;width:100%;margin:0.3rem 0">${o.libelle}</button>`).join('')}`;
  zone.querySelector('#duel-q').focus();
  zone.querySelectorAll('[data-devine]').forEach((b) => b.addEventListener('click', () => {
    const max = Math.max(...Object.values(defi.alloc));
    const gagnants = defi.theme.options.filter((o) => defi.alloc[o.id] === max).map((o) => o.id);
    const bon = gagnants.includes(b.dataset.devine);
    update((st) => {
      st.joueur.capital -= ECONOMIE.DEFI_AMI_MISE;
      st.joueur.duels.amis += 1;
    });
    if (bon) gagnerCapital(ECONOMIE.DEFI_AMI_GAIN, `vous avez bien lu ${qui}`);
    zone.innerHTML = `
      <h4 id="duel-q" tabindex="-1">${bon ? `🏆 Exact ! +${ECONOMIE.DEFI_AMI_GAIN - ECONOMIE.DEFI_AMI_MISE} net` : `❌ Perdu — mise de ${ECONOMIE.DEFI_AMI_MISE} engloutie`}</h4>
      <p class="hint">Les arbitrages réels de ${qui} :</p>
      ${defi.theme.options.map((o) => `
        <div class="alloc-row">
          <span class="alloc-libelle">${o.libelle}</span>
          <span class="affinite-score">${defi.alloc[o.id]} pt(s)</span>
        </div>`).join('')}
      <p class="hint">À votre tour : créez un défi retour sur le thème de votre choix.</p>
      <button class="btn-secondaire" id="duel-revanche">Créer mon défi retour</button>`;
    zone.querySelector('#duel-q').focus();
    zone.querySelector('#duel-revanche').addEventListener('click', () => renderCreerDefi(root));
  }));
}
