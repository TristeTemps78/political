// Capital politique, guildes, partielles éclair, motion de censure et
// simulation de conquête. Toutes les constantes d'économie sont justifiées
// dans docs_architecture/03_game_loop.md.

import { CIRCOS, FAMILLES, MAJORITE_ABSOLUE, mulberry32 } from './data.js';
import { load, update } from './store.js';

export const ECONOMIE = {
  QUIZ_THEME: 25,          // 1re complétion d'un thème
  PROFIL_COMPLET: 50,      // bonus 6/6 thèmes
  PARI_MIN: 5,
  PARI_MAX: 50,
  COUT_INFLUENCE: 10,      // capital pour +1 influence sur une circo
  SEUIL_CONTROLE: 5,       // influence minimale pour contrôler une circo
  CONSULTATION: 1,         // fiche député consultée
  CONSULTATIONS_MAX_JOUR: 15,
  IA_BUDGET_TICK: 3,       // points d'influence par guilde IA et par tick
  IA_RUBBER_BAND_MAX: 1.5,

  // Élections partielles éclair (rendez-vous quotidien)
  PARTIELLES_PAR_JOUR: 4,
  PARTIELLE_MULT: 2,       // influence doublée sur une partielle en cours

  // Duels de débat
  DUEL_IA_MAX_JOUR: 3,     // entraînements « pensez comme l'adversaire » par jour
  DUEL_IA_RECOMP_FORTE: 20, // similarité ≥ 0,8
  DUEL_IA_RECOMP_FAIBLE: 8, // similarité ≥ 0,6
  DEFI_AMI_MISE: 10,
  DEFI_AMI_GAIN: 20,       // prédiction exacte : mise rendue + 10 net
  DEFI_AMI_MAX_JOUR: 5,

  // Motion de censure (mécanique de fin de partie)
  CENSURE_SEUIL_SIEGES: 30,  // déclenchée quand le leader atteint ce nombre de sièges…
  CENSURE_PART_MIN: 0.4,     // …et détient ≥ 40 % des circonscriptions contrôlées
  CENSURE_DUREE: 20,         // durée de l'épisode, en ticks
  CENSURE_COOLDOWN: 40,      // ticks avant qu'une nouvelle motion soit possible
  CENSURE_MARGE_SUCCES: 5,   // la motion « aboutit » si le leader perd ≥ 5 sièges
  CENSURE_RECOMP_DEFENSE: 30, // le joueur ciblé survit à la motion
  CENSURE_RECOMP_COALITION: 20, // le joueur (non ciblé) voit la motion aboutir
};

// --- Élections partielles éclair ---------------------------------------------
// Tirage déterministe seedé par la date : tout le monde voit les mêmes
// partielles le même jour, sans serveur.
export function partiellesDuJour(dateStr = new Date().toISOString().slice(0, 10)) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = mulberry32(h >>> 0);
  const ids = new Set();
  while (ids.size < ECONOMIE.PARTIELLES_PAR_JOUR) {
    ids.add(CIRCOS[Math.floor(rng() * CIRCOS.length)].id);
  }
  return [...ids];
}

export function gagnerCapital(montant, raison) {
  update((s) => {
    s.joueur.capital += montant;
    s.joueur.capitalTotal += montant;
  });
  toast(`+${montant} capital politique — ${raison}`);
}

export function rejoindreGuilde(familleId) {
  update((s) => { s.joueur.guildeId = familleId; });
}

// Compteurs quotidiens de duels (remis à zéro au changement de jour).
export function duelsDuJour() {
  const jour = new Date().toISOString().slice(0, 10);
  const s = load();
  if (s.joueur.duels.jour !== jour) {
    update((st) => { st.joueur.duels = { jour, ia: 0, amis: 0 }; });
  }
  return load().joueur.duels;
}

// Investissement du joueur : -COUT_INFLUENCE capital → +1 influence
// (+PARTIELLE_MULT si la circonscription est en élection partielle).
export function investir(circoId) {
  const s = load();
  if (!s.joueur.guildeId) return { ok: false, err: 'Rejoignez d’abord une guilde (onglet Profil).' };
  if (s.joueur.capital < ECONOMIE.COUT_INFLUENCE) return { ok: false, err: 'Capital insuffisant — complétez des quiz, duels ou prédictions.' };
  const gain = partiellesDuJour().includes(circoId) ? ECONOMIE.PARTIELLE_MULT : 1;
  update((st) => {
    st.joueur.capital -= ECONOMIE.COUT_INFLUENCE;
    const cell = (st.monde.influence[circoId] ||= {});
    cell[st.joueur.guildeId] = (cell[st.joueur.guildeId] || 0) + gain;
  });
  tickIA();
  return { ok: true, gain };
}

// --- Motion de censure --------------------------------------------------------
export function censureActive(s = load()) {
  return s.monde.censure?.active ? s.monde.censure : null;
}

// Contrôle : influence ≥ SEUIL_CONTROLE ET strictement majoritaire.
// Pendant une motion de censure, la guilde CIBLÉE doit dominer la SOMME des
// influences adverses (la coalition additionne ses voix contre elle).
export function controleur(influenceCirco, censureCible = null) {
  if (!influenceCirco) return null;
  let best = null;
  let bestVal = 0;
  let exAequo = false;
  let total = 0;
  for (const [guilde, val] of Object.entries(influenceCirco)) {
    total += val;
    if (val > bestVal) { best = guilde; bestVal = val; exAequo = false; }
    else if (val === bestVal) exAequo = true;
  }
  if (bestVal < ECONOMIE.SEUIL_CONTROLE || exAequo) return null;
  if (censureCible && best === censureCible && bestVal <= total - bestVal) return null;
  return best;
}

export function comptageSieges(s = load()) {
  const cible = s.monde.censure?.active ? s.monde.censure.cible : null;
  const sieges = {};
  for (const circo of CIRCOS) {
    const g = controleur(s.monde.influence[circo.id], cible);
    if (g) sieges[g] = (sieges[g] || 0) + 1;
  }
  return sieges;
}

export function majoriteAtteinte(s = load()) {
  const sieges = comptageSieges(s);
  for (const [g, n] of Object.entries(sieges)) if (n >= MAJORITE_ABSOLUE) return g;
  return null;
}

// Circonscriptions tenues par `guilde` triées par marge croissante (les plus fragiles d'abord).
function circosFragiles(s, guilde) {
  const cible = s.monde.censure?.active ? s.monde.censure.cible : null;
  const out = [];
  for (const circo of CIRCOS) {
    const infl = s.monde.influence[circo.id];
    if (controleur(infl, cible) !== guilde) continue;
    const val = infl[guilde];
    const autres = Object.entries(infl).reduce((t, [g, v]) => t + (g === guilde ? 0 : v), 0);
    out.push({ id: circo.id, marge: val - autres });
  }
  return out.sort((a, b) => a.marge - b.marge);
}

// Guildes rivales : les familles non choisies jouent un budget borné à chaque tick,
// via un PRNG ensemencé (parties reproductibles — cf. docs_architecture/03).
// Gère aussi le cycle de vie de la motion de censure.
export function tickIA() {
  let evenement = null;
  update((s) => {
    const joueurGuilde = s.joueur.guildeId;
    const rng = mulberry32(s.monde.seed + s.monde.tick * 7919);
    s.monde.tick += 1;
    const scores = comptageSieges(s);
    const avanceJoueur = joueurGuilde ? (scores[joueurGuilde] || 0) : 0;
    const censure = s.monde.censure;
    const partielles = partiellesDuJour();

    for (const f of FAMILLES) {
      if (f.id === joueurGuilde) continue;
      const retard = Math.max(0, avanceJoueur - (scores[f.id] || 0));
      const budget = Math.round(
        ECONOMIE.IA_BUDGET_TICK * Math.min(ECONOMIE.IA_RUBBER_BAND_MAX, 1 + retard / 20)
      );
      for (let i = 0; i < budget; i++) {
        let circoId = null;
        if (censure?.active && f.id !== censure.cible) {
          // Coalition : attaquer les circonscriptions les plus fragiles du leader.
          const fragiles = circosFragiles(s, censure.cible);
          if (fragiles.length) circoId = fragiles[Math.floor(rng() * Math.min(5, fragiles.length))].id;
        } else if (censure?.active && f.id === censure.cible) {
          // La cible défend ses marges.
          const fragiles = circosFragiles(s, f.id);
          if (fragiles.length) circoId = fragiles[Math.floor(rng() * Math.min(3, fragiles.length))].id;
        } else if (i === 0 && rng() < 0.5) {
          // Hors censure : la moitié des guildes disputent les partielles du jour.
          circoId = partielles[Math.floor(rng() * partielles.length)];
        }
        if (!circoId) circoId = CIRCOS[Math.floor(rng() * CIRCOS.length)].id;
        const cell = (s.monde.influence[circoId] ||= {});
        const gain = partielles.includes(circoId) ? ECONOMIE.PARTIELLE_MULT : 1;
        cell[f.id] = (cell[f.id] || 0) + gain;
      }
    }

    // --- Cycle de vie de la motion de censure ---
    if (censure?.active) {
      censure.restant -= 1;
      if (censure.restant <= 0) {
        const siegesFin = comptageSieges(s)[censure.cible] || 0;
        const aboutie = siegesFin <= censure.siegesDebut - ECONOMIE.CENSURE_MARGE_SUCCES;
        const nomCible = FAMILLES.find((x) => x.id === censure.cible).nom;
        if (aboutie) {
          evenement = { msg: `🏛️ Motion de censure ABOUTIE contre ${nomCible} (${censure.siegesDebut} → ${siegesFin} sièges).` };
          if (joueurGuilde && joueurGuilde !== censure.cible) {
            evenement.recompense = [ECONOMIE.CENSURE_RECOMP_COALITION, 'coalition victorieuse'];
          }
        } else {
          evenement = { msg: `🏛️ Motion de censure REJETÉE — ${nomCible} conserve sa majorité (${siegesFin} sièges).` };
          if (joueurGuilde === censure.cible) {
            evenement.recompense = [ECONOMIE.CENSURE_RECOMP_DEFENSE, 'majorité défendue'];
          }
        }
        s.monde.censure = { active: false, finTick: s.monde.tick };
      }
    } else {
      const finTick = s.monde.censure?.finTick ?? -Infinity;
      if (s.monde.tick >= finTick + ECONOMIE.CENSURE_COOLDOWN) {
        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        const [leader, n] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] || [null, 0];
        if (leader && n >= ECONOMIE.CENSURE_SEUIL_SIEGES && n / total >= ECONOMIE.CENSURE_PART_MIN) {
          s.monde.censure = { active: true, cible: leader, restant: ECONOMIE.CENSURE_DUREE, siegesDebut: n };
          const nomCible = FAMILLES.find((x) => x.id === leader).nom;
          evenement = {
            msg: leader === joueurGuilde
              ? `⚠️ MOTION DE CENSURE contre votre guilde ! Les oppositions se coalisent pendant ${ECONOMIE.CENSURE_DUREE} tours — défendez vos marges.`
              : `🏛️ Motion de censure déposée contre ${nomCible} — la coalition attaque ses circonscriptions fragiles.`,
          };
        }
      }
    }
  });
  if (evenement) {
    toast(evenement.msg);
    if (evenement.recompense) gagnerCapital(...evenement.recompense);
  }
}

export function consulterDepute() {
  const s = load();
  const jour = new Date().toISOString().slice(0, 10);
  if (s.joueur.jourConsultations !== jour) {
    update((st) => { st.joueur.jourConsultations = jour; st.joueur.consultationsJour = 0; });
  }
  if (load().joueur.consultationsJour >= ECONOMIE.CONSULTATIONS_MAX_JOUR) return;
  update((st) => { st.joueur.consultationsJour += 1; });
  gagnerCapital(ECONOMIE.CONSULTATION, 'exploration de l’hémicycle');
}

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status'); // annoncé par les lecteurs d'écran
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    // Vider le texte une fois le fondu terminé : un toast masqué ne doit rien
    // laisser dans l'arbre d'accessibilité (texte périmé pour les lecteurs d'écran).
    setTimeout(() => { if (!el.classList.contains('visible')) el.textContent = ''; }, 300);
  }, 2600);
}
