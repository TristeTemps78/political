import './shims.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMIE, partiellesDuJour, controleur, tickIA, investir, rejoindreGuilde } from '../js/guilds.js';
import { allocationFamille, similarite, encoderDefi, decoderDefi } from '../js/duels.js';
import { load, update, eraseAll, SCHEMA_VERSION } from '../js/store.js';
import { CIRCOS, THEMES, FAMILLES } from '../js/data.js';

// btoa/atob n'existent pas sous Node par défaut dans tous les contextes ; Node ≥ 16 les fournit.
test('partielles : tirage déterministe, 4 circonscriptions valides, variantes selon la date', () => {
  const a = partiellesDuJour('2027-04-10');
  const b = partiellesDuJour('2027-04-10');
  const c = partiellesDuJour('2027-04-11');
  assert.deepEqual(a, b, 'même date → mêmes partielles (sans serveur, tous les joueurs voient pareil)');
  assert.equal(a.length, ECONOMIE.PARTIELLES_PAR_JOUR);
  const idsValides = new Set(CIRCOS.map((x) => x.id));
  for (const id of a) assert.ok(idsValides.has(id), `${id} inconnue`);
  assert.notDeepEqual(a, c, 'dates différentes → tirages différents');
});

test('partielles : l’investissement y vaut PARTIELLE_MULT points d’influence', () => {
  eraseAll();
  rejoindreGuilde('eco-sociale');
  update((s) => { s.joueur.capital = 100; });
  const partielle = partiellesDuJour()[0];
  const res = investir(partielle);
  assert.equal(res.ok, true);
  assert.equal(res.gain, ECONOMIE.PARTIELLE_MULT);
  assert.equal(load().monde.influence[partielle]['eco-sociale'], ECONOMIE.PARTIELLE_MULT);
});

test('duels : l’allocation canonique d’une famille somme au budget et est cohérente', () => {
  for (const f of FAMILLES) {
    for (const t of THEMES) {
      const alloc = allocationFamille(f, t);
      const total = Object.values(alloc).reduce((a, b) => a + b, 0);
      assert.equal(total, t.budget, `${f.id}/${t.id}`);
    }
  }
  // Cohérence idéologique : le souverainisme finance « Reprendre des compétences à l'UE »
  // davantage que « Approfondir » sur le thème Europe.
  const souv = FAMILLES.find((f) => f.id === 'souverainiste');
  const europe = THEMES.find((t) => t.id === 'europe');
  const alloc = allocationFamille(souv, europe);
  assert.ok(alloc.souverainete > alloc.federalisme,
    `souverainiste : souveraineté (${alloc.souverainete}) devrait dépasser fédéralisme (${alloc.federalisme})`);
});

test('duels : similarité bornée, réflexive et sensible', () => {
  const t = THEMES[0];
  const a = allocationFamille(FAMILLES[0], t);
  const b = allocationFamille(FAMILLES[5], t);
  assert.equal(similarite(a, a, t.budget), 1, 'identique → 1');
  const sim = similarite(a, b, t.budget);
  assert.ok(sim >= 0 && sim < 1, `familles opposées → [0,1) (obtenu ${sim})`);
});

test('défis entre amis : aller-retour d’encodage, rejet des codes invalides', () => {
  const t = THEMES[1];
  const alloc = allocationFamille(FAMILLES[2], t);
  const code = encoderDefi(t.id, alloc, 'Camille');
  const lu = decoderDefi(code);
  assert.equal(lu.theme.id, t.id);
  assert.deepEqual(lu.alloc, alloc);
  assert.equal(lu.pseudo, 'Camille');
  assert.equal(decoderDefi('n-importe-quoi'), null);
  // Triche : total ≠ budget → rejeté.
  const triche = encoderDefi(t.id, { ...alloc, [t.options[0].id]: alloc[t.options[0].id] + 5 }, null);
  assert.equal(decoderDefi(triche), null, 'un budget gonflé doit être rejeté');
});

test('censure : la guilde ciblée doit dominer la SOMME des oppositions', () => {
  const infl = { leader: 6, a: 3, b: 2 }; // leader 6 vs 5 : tient
  assert.equal(controleur(infl, 'leader'), 'leader');
  const infl2 = { leader: 6, a: 4, b: 2 }; // leader 6 vs 6 : tombe
  assert.equal(controleur(infl2, 'leader'), null);
  assert.equal(controleur(infl2, null), 'leader', 'hors censure, la règle classique s’applique');
  assert.equal(controleur(infl2, 'autre'), 'leader', 'la censure ne vise que sa cible');
});

test('censure : se déclenche quand le leader domine, se résout après CENSURE_DUREE ticks', () => {
  eraseAll();
  update((s) => {
    s.monde.seed = 777;
    s.joueur.guildeId = 'eco-sociale';
    // Construire un leader écrasant : 35 circos contrôlées par gauche-rupture.
    for (let i = 0; i < 35; i++) {
      s.monde.influence[CIRCOS[i].id] = { 'gauche-rupture': 20 };
    }
  });
  tickIA();
  const censure = load().monde.censure;
  assert.ok(censure?.active, 'la motion doit se déclencher');
  assert.equal(censure.cible, 'gauche-rupture');
  for (let i = 0; i < ECONOMIE.CENSURE_DUREE + 1 && load().monde.censure?.active; i++) tickIA();
  const apres = load().monde.censure;
  assert.equal(apres.active, false, 'l’épisode doit se terminer');
  assert.ok(typeof apres.finTick === 'number', 'le cooldown démarre');
});

test('migration de schéma v1 → v2', () => {
  const v1 = {
    version: 1,
    profil: { reponses: {}, axes: null, affinites: [] },
    joueur: { pseudo: null, guildeId: 'localiste', capital: 42, capitalTotal: 42, quizFaits: [], paris: [], consultationsJour: 0, jourConsultations: null },
    monde: { influence: { '075-01': { localiste: 3 } }, tick: 5, seed: 9 },
  };
  localStorage.setItem('politiquest2027.v1', JSON.stringify(v1));
  // Forcer un rechargement du module d'état : eraseAll réinitialise le cache…
  // mais efface aussi la clé. On passe par le chemin de migration directement :
  eraseAll();
  localStorage.setItem('politiquest2027.v1', JSON.stringify(v1));
  const s = load();
  assert.equal(s.version, SCHEMA_VERSION);
  assert.equal(s.joueur.capital, 42, 'les données v1 survivent');
  assert.deepEqual(s.joueur.duels, { jour: null, ia: 0, amis: 0 }, 'les nouveaux champs sont créés');
  assert.equal(s.monde.censure, null);
  assert.equal(s.monde.influence['075-01'].localiste, 3);
  eraseAll();
});

test('migration de schéma v2 → v3', () => {
  const v2 = {
    version: 2,
    profil: { reponses: {}, axes: null, affinites: [] },
    joueur: {
      pseudo: 'Test', guildeId: 'localiste', capital: 99, capitalTotal: 150, quizFaits: ['climat'], paris: [],
      consultationsJour: 2, jourConsultations: '2027-06-01',
      duels: { jour: '2027-06-01', ia: 1, amis: 0 },
    },
    monde: { influence: { '075-01': { localiste: 5 } }, tick: 12, seed: 42, censure: null },
  };
  eraseAll();
  localStorage.setItem('politiquest2027.v1', JSON.stringify(v2));
  const s = load();
  assert.equal(s.version, SCHEMA_VERSION);
  // Les données v2 survivent intégralement.
  assert.equal(s.joueur.capital, 99);
  assert.equal(s.joueur.pseudo, 'Test');
  assert.deepEqual(s.joueur.duels, { jour: '2027-06-01', ia: 1, amis: 0 });
  assert.equal(s.monde.tick, 12);
  assert.equal(s.monde.influence['075-01'].localiste, 5);
  // Le nouveau champ v3 est créé, aucune partie en cours par défaut.
  assert.equal(s.monde.gouverner, null);
  eraseAll();
});
