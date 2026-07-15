// Phase 3 — Défis prédictifs : parier son capital sur l'issue de scrutins.
// En mode démo la résolution est simulée (probabilité = cote) ; en phase 2,
// la résolution viendra du résultat réel du scrutin via l'adaptateur.

import { adapter } from './adapter.js';
import { load, update } from './store.js';
import { ECONOMIE, gagnerCapital, toast } from './guilds.js';
import { mulberry32 } from './data.js';

export async function renderPredictions(root) {
  const scrutins = await adapter.getScrutins();
  const s = load();

  root.innerHTML = `
    <div class="panel">
      <h3>Défis prédictifs sur les scrutins</h3>
      <p class="hint">Pariez ${ECONOMIE.PARI_MIN} à ${ECONOMIE.PARI_MAX} points de capital sur l’issue d’un scrutin.
      Gain : 2 × la mise si votre lecture du rapport de forces est juste.
      <strong>⚠️ ${adapter.label}</strong> — en phase 2, ces scrutins seront les scrutins solennels réels de l’Assemblée.</p>
      <div id="scrutins"></div>
    </div>`;

  const cont = root.querySelector('#scrutins');
  for (const sc of scrutins) {
    const pari = s.joueur.paris.find((p) => p.scrutinId === sc.id);
    const bloc = document.createElement('div');
    bloc.className = 'scrutin';
    bloc.innerHTML = `
      <h4>${sc.titre}</h4>
      <p>${sc.resume}</p>
      <p class="hint">Probabilité d’adoption estimée par la communauté : ${Math.round(sc.cote * 100)} %</p>
      ${sc.statut === 'clos'
        ? `<p><strong>Scrutin clos — ${sc.resultat === 'adopte' ? 'adopté' : 'rejeté'}.</strong></p>`
        : pari
          ? pari.resolu
            ? `<p>Pari résolu : vous aviez misé ${pari.mise} sur « ${pari.position === 'adopte' ? 'adopté' : 'rejeté'} » — ${pari.gagne ? '✅ gagné' : '❌ perdu'}.</p>`
            : `<p>Mise en cours : <strong>${pari.mise}</strong> sur « ${pari.position === 'adopte' ? 'adopté' : 'rejeté'} ».
               <button class="btn-secondaire" data-resoudre="${sc.id}">Simuler le vote (démo)</button></p>`
          : `<div class="pari-form">
              <input type="number" min="${ECONOMIE.PARI_MIN}" max="${ECONOMIE.PARI_MAX}" value="${ECONOMIE.PARI_MIN}" id="mise-${sc.id}" aria-label="Mise">
              <button class="btn-secondaire" data-pari="${sc.id}" data-pos="adopte">Sera adopté</button>
              <button class="btn-secondaire" data-pari="${sc.id}" data-pos="rejete">Sera rejeté</button>
            </div>`}`;
    cont.appendChild(bloc);
  }

  cont.querySelectorAll('[data-pari]').forEach((b) => b.addEventListener('click', () => {
    const scrutinId = b.dataset.pari;
    const mise = Math.max(ECONOMIE.PARI_MIN, Math.min(ECONOMIE.PARI_MAX,
      Number(root.querySelector(`#mise-${CSS.escape(scrutinId)}`).value) || ECONOMIE.PARI_MIN));
    if (load().joueur.capital < mise) { toast('Capital insuffisant pour cette mise.'); return; }
    update((st) => {
      st.joueur.capital -= mise;
      st.joueur.paris.push({ scrutinId, mise, position: b.dataset.pos, resolu: false, gagne: null });
    });
    renderPredictions(root);
  }));

  cont.querySelectorAll('[data-resoudre]').forEach((b) => b.addEventListener('click', async () => {
    const scrutinId = b.dataset.resoudre;
    const sc = (await adapter.getScrutins()).find((x) => x.id === scrutinId);
    const st = load();
    const pari = st.joueur.paris.find((p) => p.scrutinId === scrutinId && !p.resolu);
    if (!pari) return;
    const adopte = mulberry32(st.monde.seed + st.monde.tick + scrutinId.length * 31)() < sc.cote;
    const gagne = (adopte && pari.position === 'adopte') || (!adopte && pari.position === 'rejete');
    update((x) => {
      const p = x.joueur.paris.find((pp) => pp.scrutinId === scrutinId && !pp.resolu);
      p.resolu = true;
      p.gagne = gagne;
    });
    if (gagne) gagnerCapital(pari.mise * 2, 'prédiction exacte');
    else toast(`Le scrutin a été ${adopte ? 'adopté' : 'rejeté'} — mise perdue. Relisez le rapport de forces !`);
    renderPredictions(root);
  }));
}
