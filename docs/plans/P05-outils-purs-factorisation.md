# P05 — Factoriser `js/outils.js` : cosinus, FNV-1a, index FAMILLES

| | |
|---|---|
| **Phase** | A — Consolidation, vague 1 |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P02 |
| **Constats d'audit traités** | STR-02 (docs/AUDIT.md §3) |
| **Fichiers créés** | `js/outils.js`, `tests/outils.test.mjs` |
| **Fichiers modifiés** | `js/affinity.js`, `js/duels.js`, `js/personas.js`, `js/assemblee.js`, `js/adapter.js`, `js/guilds.js`, `sw.js` (+ tout module remplaçant un `FAMILLES.find` par l'index) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome.

Trois calculs **purs** sont réimplémentés en plusieurs exemplaires : le cosinus / produit scalaire (4 fois), le hash FNV-1a (2 fois), et la recherche `FAMILLES.find(f => f.id === x)` (des dizaines de fois, sans index). Ce plan les centralise dans un module pur `js/outils.js`.

## 2. Objectif

Après ce plan, il existe **une** implémentation de chaque utilitaire pur, testée, réutilisée partout. Les résultats numériques doivent être **bit-à-bit identiques** à l'existant (déterminisme, AGENTS.md règle 5).

## 3. État actuel (ce que tu vas trouver)

- **Cosinus / produit scalaire normalisé**, 4 variantes :
  - `js/affinity.js:77-85` (similarité cosinus sur `AXES`).
  - `js/duels.js:14-24` (produit scalaire vecteur famille × effets, contexte softmax).
  - `js/personas.js:173-179` (produit scalaire vecteur persona × direction normalisée des effets, sur `AXES_GOUVERNER`).
  - `js/assemblee.js:65-73` (`function cosinus(a, b)` sur les 4 axes).
  Attention : ces variantes opèrent sur des **jeux d'axes différents** (`AXES` vs `AXES_GOUVERNER`) et certaines normalisent un seul vecteur. Le helper doit être paramétrable, ex. `cosinus(a, b, axes)` et `produitScalaireNormalise(vecteur, effets, axes)`.
- **Hash FNV-1a**, 2 variantes : `js/adapter.js:60-67` (`function hash(str)`) et `js/guilds.js:46-50`. Vérifier qu'elles produisent la **même** valeur (même offset/prime) avant de fusionner — sinon documenter et garder deux fonctions nommées distinctement.
- **`FAMILLES.find(f => f.id === x)`** : répété dans `map.js`, `hemicycle.js`, `graph.js`, `quiz.js`, `guilds.js`, `gouverner-ui*.js`… `FAMILLES` est défini dans `js/data.js`.

## 4. Étapes

1. Créer **`js/outils.js`** — module **PUR** (aucun DOM/store, testable sous Node) :
   - `produitScalaire(a, b, axes)`, `norme(v, axes)`, `cosinus(a, b, axes)` — factoriser les 4 variantes. Chaque fonction prend explicitement la liste d'axes pour rester agnostique de `AXES`/`AXES_GOUVERNER`.
   - `hashFNV1a(str)` — une seule implémentation FNV-1a 32 bits (aligner sur celle d'`adapter.js` après vérification d'égalité avec celle de `guilds.js`).
   - `indexFamilles(familles)` → renvoie une `Map` `id → famille` ; et un helper `familleParId(index, id)` (ou exposer directement la Map). **Ne pas** importer `data.js` dans `outils.js` (garder `outils.js` sans dépendance vers les données) : la fonction reçoit `FAMILLES` en argument, ou chaque module construit son index une fois à partir de `FAMILLES` importé.
2. Remplacer les 4 cosinus par un appel à `outils.js`, en passant le bon jeu d'axes. **Vérifier l'égalité numérique** (voir critères) avant de committer.
3. Remplacer les 2 hash par `hashFNV1a`. Ce hash sert au déterminisme de `adapter.js` (`mulberry32(hash(...))`) — **toute** différence de valeur changerait des tirages : vérifier l'identité stricte.
4. Introduire l'index FAMILLES là où c'est simple et sûr : au minimum dans les modules purs (`assemblee.js`, `personas.js`) et dans 1-2 modules UI à fort usage (`hemicycle.js`, `map.js`). Ne pas tout convertir d'un coup si le risque dépasse le bénéfice — prioriser lisibilité et non-régression.
5. Ajouter `'./js/outils.js'` à `SHELL` (`sw.js`) **et** bumper `CACHE`.
6. Ajouter `'outils'` à `MODULES_PURS` dans `tools/verifier-purete.mjs` (il est pur par conception).
7. Créer **`tests/outils.test.mjs`** : cosinus de vecteurs colinéaires = 1, orthogonaux = 0, vecteur nul = 0 (comportement de repli) ; `hashFNV1a` sur une chaîne connue = valeur attendue (copier une valeur produite par l'ancienne implémentation) ; `indexFamilles` retrouve chaque famille par id, `undefined` pour un id inconnu.
8. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Déterminisme (AGENTS.md règle 5)** : le hash alimente un PRNG seedé ; une valeur différente casse la reproductibilité des parties et les tests d'équilibrage. Vérifier l'identité stricte avant/après.
- Ne pas changer les graines ni l'ordre des tirages.
- `js/outils.js` doit rester **pur** (le vérificateur P02 doit passer).
- Ne pas importer `data.js` dans `outils.js` (éviter un cycle et garder la pureté modulaire).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 93 (+ nouveaux).
- [ ] `node tools/simulate.mjs 200` **et** `node tools/simulate-gouverner.mjs` : résultats **identiques** à avant le plan (l'équilibrage ne bouge pas d'un chiffre — c'est la preuve que cosinus/hash sont bit-à-bit équivalents). Comparer les sorties.
- [ ] `node tools/verifier-purete.mjs` inclut `outils` et passe.
- [ ] `grep -rn "Math.sqrt" js/affinity.js js/duels.js js/personas.js js/assemblee.js` : plus aucune réimplémentation locale du cosinus (ou justifié).
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Les utilitaires **UI** (toast, roving) → plan **P04**.
- La déduplication du **moteur** (journaliser, renormalisation 577) → plan **P06**.
- Les nouveaux personas qui réutiliseront `outils.js` → plan **P15** (dépend de ce plan).

## 8. Finalisation

```
refactor(outils) : factorise cosinus, FNV-1a et l'index FAMILLES dans js/outils.js (P05)
```
