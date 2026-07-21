# P06 — Dédupliquer le moteur : `js/sieges.js` (journaliser, renormalisation 577)

| | |
|---|---|
| **Phase** | A — Consolidation, vague 1 |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P02 |
| **Constats d'audit traités** | STR-03 (docs/AUDIT.md §3) |
| **Fichiers créés** | `js/sieges.js`, `tests/sieges.test.mjs` |
| **Fichiers modifiés** | `js/gouverner.js`, `js/assemblee.js`, `sw.js` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome et touche le **moteur pur** — le déterminisme est critique (AGENTS.md règle 5) et les invariants de sièges (577 / majorité 289) sont sacrés (règle 6).

Deux morceaux de logique moteur sont dupliqués entre `js/gouverner.js` et `js/assemblee.js` :
1. `journaliser(g, texte)` — ajout d'une ligne au journal du mandat, **identique** dans les deux.
2. La **renormalisation des 577 sièges** — arrondi proportionnel + écrêtage de toute famille sous la majorité absolue (289) + redistribution de l'excédent — ~30 lignes quasi identiques (le commentaire `assemblee.js:83` le reconnaît explicitement : « même logique que gouverner.js »).

## 2. Objectif

Après ce plan, `journaliser` et la renormalisation 577 vivent dans **un seul** module pur `js/sieges.js`, réutilisé par `gouverner.js` et `assemblee.js`. Les résultats (répartition des sièges, contenu du journal, parties reproductibles) doivent être **strictement identiques** à avant.

## 3. État actuel (ce que tu vas trouver)

- **`js/gouverner.js`** :
  - `arrondi = (v) => Math.round(v * 10) / 10;` (l. 59) — utilitaire local (le laisser si spécifique à l'affichage des jauges).
  - `journaliser(g, texte)` (l. 121-124).
  - `assembleeParDefaut(...)` (autour de l. 133-169) : répartition des 577 sièges au prorata de poids, `Math.round((poids[i] / total) * CIRCOS.length)` (l. 143), puis **écrêtage sous 289 + redistribution** (l. 156 et suivantes). `CIRCOS` vient de `data.js` (577 circonscriptions).
- **`js/assemblee.js`** :
  - `journaliser(g, texte)` (l. 75-78) — identique.
  - `renormaliser577(comptage)` (l. 84-113) : `Math.round((Math.max(0, comptage[f.id] || 0) / total) * CIRCOS.length)` (l. 89) + écrêtage/redistribution. Le commentaire l. 83 note la duplication ; l. 118-121 : point d'entrée Conquête qui appelle `renormaliser577`.

## 4. Étapes

1. Créer **`js/sieges.js`** — module **PUR** :
   - `export function journaliser(g, texte)` — copie exacte de la version existante (même format d'entrée de journal : vérifier la structure `g.journal` et le format `{ tour, texte }` ou chaîne, selon l'existant).
   - `export function renormaliser577(comptage, familles, total577)` — factoriser la renormalisation. Paramétrer par la liste des familles et le total (577 = `CIRCOS.length`) pour ne pas importer `data.js` si ce n'est pas déjà le cas dans les deux appelants ; sinon importer `CIRCOS`/`FAMILLES` comme le fait déjà `assemblee.js`. **Reproduire à l'identique** : même ordre de parcours des familles, même `Math.round`, même seuil 289, même stratégie de redistribution de l'excédent (donner l'excédent aux mêmes familles, dans le même ordre) — c'est ce qui garantit le déterminisme.
2. Dans `js/assemblee.js` : remplacer `journaliser` et `renormaliser577` locaux par des imports depuis `./sieges.js`. Adapter les appels (`assemblee.js:121`).
3. Dans `js/gouverner.js` : remplacer `journaliser` et la renormalisation inline d'`assembleeParDefaut` par les imports de `./sieges.js`.
4. Ajouter `'./js/sieges.js'` à `SHELL` (`sw.js`) **et** bumper `CACHE`.
5. Ajouter `'sieges'` à `MODULES_PURS` dans `tools/verifier-purete.mjs`.
6. Créer **`tests/sieges.test.mjs`** : la somme renormalisée vaut **exactement 577** ; **aucune** famille ≥ 289 après renormalisation (invariant règle 6) ; entrée dégénérée (une famille à 100 % → écrêtée sous 289, excédent redistribué) ; `journaliser` ajoute une ligne sans muter les précédentes.
7. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Invariants sièges (règle 6)** : Σ = 577, aucune famille ≥ 289 à l'init. Les tests existants d'`assemblee`/`gouverner` doivent rester verts sans modification.
- **Déterminisme (règle 5)** : la redistribution de l'excédent doit suivre exactement le même ordre qu'avant. Si l'ordre change, les parties reproductibles et l'équilibrage divergent → échec.
- Modules purs : `sieges.js` ne touche ni DOM ni store (vérificateur P02).
- Ne pas toucher aux graines ni aux tirages aléatoires.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 93 (+ nouveaux). Les tests `assemblee`/`gouverner` existants passent **sans avoir été modifiés**.
- [ ] `node tools/simulate-gouverner.mjs` : sortie **identique** à avant le plan (comparer). Idem `node tools/simulate.mjs 200`.
- [ ] `node tools/verifier-purete.mjs` inclut `sieges` et passe.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Découper `finDeTour` (fonction longue) → plan **P10** (qui dépend de ce plan).
- La fin « censure » fantôme → plan **P09** (dépend de ce plan).
- Les scénarios de départ alternatifs → plan **P17** (dépend de ce plan).

## 8. Finalisation

```
refactor(moteur) : extrait js/sieges.js (journaliser, renormalisation 577) (P06)
```
