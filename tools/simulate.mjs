// Simulation d'équilibrage — exécute le VRAI code du jeu (store + guilds) sous
// Node via les doublures de tests/shims.mjs. Valide les cibles fixées dans
// docs_architecture/03_game_loop.md. Usage : node tools/simulate.mjs [nbParties]

import '../tests/shims.mjs';
import { load, update, eraseAll } from '../js/store.js';
import { ECONOMIE, investir, controleur, comptageSieges, rejoindreGuilde } from '../js/guilds.js';
import { CIRCOS, THEMES, MAJORITE_ABSOLUE, mulberry32 } from '../js/data.js';

const N = Number(process.argv[2]) || 1000;

function nouvellePartie(seed, capital) {
  eraseAll();
  update((s) => {
    s.monde.seed = seed;
    s.joueur.capital = capital;
  });
  rejoindreGuilde('eco-sociale');
}

// Stratégie joueur : concentration locale — on investit sur une circonscription
// jusqu'à la contrôler, puis on passe à la suivante (la leçon du scrutin
// uninominal que le jeu veut enseigner).
function jouerGlouton(rng) {
  const ordre = [...CIRCOS].sort(() => rng() - 0.5);
  let cible = 0;
  let invests = 0;
  let investsPremiere = null;
  while (load().joueur.capital >= ECONOMIE.COUT_INFLUENCE && cible < ordre.length) {
    const circo = ordre[cible];
    const res = investir(circo.id);
    if (!res.ok) break;
    invests += 1;
    const s = load();
    if (controleur(s.monde.influence[circo.id]) === 'eco-sociale') {
      if (investsPremiere === null) investsPremiere = invests;
      cible += 1;
    }
  }
  const sieges = comptageSieges(load());
  return { investsPremiere, sieges: sieges['eco-sociale'] || 0, invests };
}

console.log(`Simulation sur ${N} parties (stratégie gloutonne, guilde eco-sociale)\n`);

// --- Cible 1 : premier contrôle rapide -------------------------------------
// Capital de départ : 105 = 30 initial + 3 thèmes de quiz (~5 minutes de jeu).
let sommesP = 0, maxP = 0, echecs = 0;
for (let i = 0; i < N; i++) {
  nouvellePartie(1000 + i, 105);
  const { investsPremiere } = jouerGlouton(mulberry32(i));
  if (investsPremiere === null) echecs += 1;
  else { sommesP += investsPremiere; maxP = Math.max(maxP, investsPremiere); }
}
const moyP = sommesP / (N - echecs);
console.log('Cible 1 — première circonscription contrôlée (capital 105, soit ~3 quiz) :');
console.log(`  investissements nécessaires : moyenne ${moyP.toFixed(2)}, max ${maxP}, échecs ${echecs}/${N}`);
console.log(`  coût moyen : ${(moyP * ECONOMIE.COUT_INFLUENCE).toFixed(0)} capital → atteignable en <10 min de jeu : ${moyP * ECONOMIE.COUT_INFLUENCE <= 105 && echecs === 0 ? 'OUI ✅' : 'NON ❌'}\n`);

// --- Cible 2 : plafond solo << 289 ------------------------------------------
// Joueur très assidu : 2000 capital ≈ profil complet + ~1 mois de consultations
// et de paris gagnants quotidiens.
const nCeil = Math.max(50, Math.floor(N / 5));
let sommeS = 0, maxS = 0;
for (let i = 0; i < nCeil; i++) {
  nouvellePartie(9000 + i, 2000);
  const { sieges } = jouerGlouton(mulberry32(5000 + i));
  sommeS += sieges;
  maxS = Math.max(maxS, sieges);
}
const moyS = sommeS / nCeil;
console.log(`Cible 2 — plafond solo (capital 2000, ${nCeil} parties) :`);
console.log(`  sièges contrôlés : moyenne ${moyS.toFixed(1)}, max ${maxS} / ${MAJORITE_ABSOLUE} requis`);
console.log(`  la majorité absolue exige la coopération de guilde : ${maxS < MAJORITE_ABSOLUE ? 'OUI ✅' : 'NON ❌'}`);
console.log(`  plafond solo dans la zone visée (~40) : ${maxS <= 60 ? 'OUI ✅' : 'À RÉGLER ⚠️'}\n`);

// --- Rappel : l'équité inter-familles est testée dans tests/affinity.test.mjs.
console.log(`Constantes actives : coût influence ${ECONOMIE.COUT_INFLUENCE}, seuil contrôle ${ECONOMIE.SEUIL_CONTROLE}, budget IA/tick ${ECONOMIE.IA_BUDGET_TICK} × 6 guildes, ${THEMES.length} thèmes × ${ECONOMIE.QUIZ_THEME} + ${ECONOMIE.PROFIL_COMPLET} bonus.`);
