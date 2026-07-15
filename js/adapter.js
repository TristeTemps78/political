// Couche d'accès aux données parlementaires (cf. docs_architecture/02 §5).
// Le jeu ne dépend jamais directement d'une API : il parle à `DataAdapter`.

import { DEPUTES_DEMO, SCRUTINS_DEMO, CONSIGNES_DEMO, mulberry32 } from './data.js';

export class MockAdapter {
  constructor() {
    this.label = 'Données de démonstration (fictives)';
    this.isDemo = true;
  }

  async getDeputes() { return DEPUTES_DEMO; }

  async getScrutins() { return SCRUTINS_DEMO; }

  // Votes individuels : consigne du groupe, avec dissidences selon la loyauté
  // du député (déterministe par couple député/scrutin → graphe stable).
  async getVotes(scrutinId) {
    const consignes = CONSIGNES_DEMO[scrutinId] || {};
    const deputes = await this.getDeputes();
    return deputes.map((dep) => {
      const consigne = consignes[dep.groupe] || 'abstention';
      const r = mulberry32(hash(`${scrutinId}:${dep.id}`))();
      let position = consigne;
      if (r > dep.loyaute) {
        position = consigne === 'pour' ? (r > 0.9 ? 'contre' : 'abstention')
          : consigne === 'contre' ? (r > 0.9 ? 'pour' : 'abstention')
          : (r > 0.85 ? 'pour' : 'contre');
      }
      return { scrutinId, deputeId: dep.id, position };
    });
  }
}

// Phase 2 : adaptateur vers des JSON statiques pré-agrégés à partir de
// data.assemblee-nationale.fr (licence ouverte Etalab). Le client ne frappe
// jamais l'API source en direct — pipeline de build → fichiers versionnés.
export class RemoteAdapter {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.label = 'Assemblée nationale (open data)';
    this.isDemo = false;
    this.cache = new Map();
  }

  async fetchJson(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Adaptateur distant : HTTP ${res.status} sur ${path}`);
    const json = await res.json();
    this.cache.set(path, json);
    return json;
  }

  getDeputes() { return this.fetchJson('/deputes.json'); }
  getScrutins() { return this.fetchJson('/scrutins.json'); }
  getVotes(scrutinId) { return this.fetchJson(`/votes/${encodeURIComponent(scrutinId)}.json`); }
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const adapter = new MockAdapter();
