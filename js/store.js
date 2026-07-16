// Persistance locale — Privacy by Design.
// INVARIANT N°1 DU PROJET : le contenu de ce store (réponses, axes, affinités)
// ne doit JAMAIS être transmis sur le réseau. Cf. docs_architecture/01.

const KEY = 'politiquest2027.v1';
export const SCHEMA_VERSION = 2;

function defaults() {
  return {
    version: SCHEMA_VERSION,
    profil: { reponses: {}, axes: null, affinites: [] },
    joueur: {
      pseudo: null, guildeId: null, capital: 30, capitalTotal: 30, quizFaits: [], paris: [],
      consultationsJour: 0, jourConsultations: null,
      duels: { jour: null, ia: 0, amis: 0 }, // compteurs quotidiens des duels
    },
    monde: { influence: {}, tick: 0, seed: (Date.now() % 100000) + 7, censure: null },
  };
}

// Migrations de schéma : chaque version se transforme vers la suivante.
function migrer(parsed) {
  if (parsed.version === 1) {
    parsed.joueur.duels = { jour: null, ia: 0, amis: 0 };
    parsed.monde.censure = null;
    parsed.version = 2;
  }
  return parsed.version === SCHEMA_VERSION ? parsed : null;
}

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const migre = migrer(JSON.parse(raw));
      if (migre) {
        state = migre;
        save();
        return state;
      }
    }
  } catch (e) {
    console.warn('Store illisible, réinitialisation.', e);
  }
  state = defaults();
  save();
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Sauvegarde locale impossible (quota ?).', e);
  }
}

export function update(fn) {
  fn(load());
  save();
  document.dispatchEvent(new CustomEvent('pq:state', { detail: load() }));
}

// RGPD — droit d'accès : export intégral des données locales.
export function exportData() {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'politiquest2027-mes-donnees.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// RGPD — droit à l'effacement : suppression totale et immédiate.
export function eraseAll() {
  localStorage.removeItem(KEY);
  state = null;
  location.reload();
}
