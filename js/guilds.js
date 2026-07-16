// Capital politique, guildes et simulation de conquête.
// Toutes les constantes d'économie sont justifiées dans docs_architecture/03_game_loop.md.

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
};

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

// Investissement du joueur : -COUT_INFLUENCE capital → +1 influence pour sa guilde.
export function investir(circoId) {
  const s = load();
  if (!s.joueur.guildeId) return { ok: false, err: 'Rejoignez d’abord une guilde (onglet Profil).' };
  if (s.joueur.capital < ECONOMIE.COUT_INFLUENCE) return { ok: false, err: 'Capital insuffisant — complétez des quiz ou des prédictions.' };
  update((st) => {
    st.joueur.capital -= ECONOMIE.COUT_INFLUENCE;
    const cell = (st.monde.influence[circoId] ||= {});
    cell[st.joueur.guildeId] = (cell[st.joueur.guildeId] || 0) + 1;
  });
  tickIA();
  return { ok: true };
}

// Guildes rivales : les familles non choisies jouent un budget borné à chaque tick,
// via un PRNG ensemencé (parties reproductibles — cf. docs_architecture/03).
export function tickIA() {
  update((s) => {
    const joueurGuilde = s.joueur.guildeId;
    const rng = mulberry32(s.monde.seed + s.monde.tick * 7919);
    s.monde.tick += 1;
    const scores = comptageSieges(s);
    const avanceJoueur = joueurGuilde ? (scores[joueurGuilde] || 0) : 0;
    for (const f of FAMILLES) {
      if (f.id === joueurGuilde) continue;
      const retard = Math.max(0, avanceJoueur - (scores[f.id] || 0));
      const budget = Math.round(
        ECONOMIE.IA_BUDGET_TICK * Math.min(ECONOMIE.IA_RUBBER_BAND_MAX, 1 + retard / 20)
      );
      for (let i = 0; i < budget; i++) {
        const circo = CIRCOS[Math.floor(rng() * CIRCOS.length)];
        const cell = (s.monde.influence[circo.id] ||= {});
        cell[f.id] = (cell[f.id] || 0) + 1;
      }
    }
  });
}

// Contrôle : influence ≥ SEUIL_CONTROLE ET strictement majoritaire sur la circo.
export function controleur(influenceCirco) {
  if (!influenceCirco) return null;
  let best = null;
  let bestVal = 0;
  let exAequo = false;
  for (const [guilde, val] of Object.entries(influenceCirco)) {
    if (val > bestVal) { best = guilde; bestVal = val; exAequo = false; }
    else if (val === bestVal) exAequo = true;
  }
  return bestVal >= ECONOMIE.SEUIL_CONTROLE && !exAequo ? best : null;
}

export function comptageSieges(s = load()) {
  const sieges = {};
  for (const circo of CIRCOS) {
    const g = controleur(s.monde.influence[circo.id]);
    if (g) sieges[g] = (sieges[g] || 0) + 1;
  }
  return sieges;
}

export function majoriteAtteinte(s = load()) {
  const sieges = comptageSieges(s);
  for (const [g, n] of Object.entries(sieges)) if (n >= MAJORITE_ABSOLUE) return g;
  return null;
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
