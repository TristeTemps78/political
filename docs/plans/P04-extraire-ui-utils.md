# P04 — Extraire `js/ui-utils.js` (toast, reduced-motion, roving-tabindex)

| | |
|---|---|
| **Phase** | A — Consolidation, vague 1 |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P02 (les vérificateurs CI doivent exister ; ce plan ajoute un fichier au SHELL) |
| **Constats d'audit traités** | STR-01, STR-04 (docs/AUDIT.md §3) |
| **Fichiers créés** | `js/ui-utils.js`, `tests/ui-utils.test.mjs` |
| **Fichiers modifiés** | `js/guilds.js`, `js/map.js`, `js/carte-france.js`, `js/quiz.js`, `js/duels.js`, `js/predictions.js`, `js/gouverner-ui-mandat.js`, `js/app.js`, `sw.js` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome.

`js/guilds.js` est un module de **logique de jeu** (économie, guildes, duels, censure, IA rivale) mais héberge aussi deux **utilitaires UI transverses** — `toast()` et `prefersReducedMotion()` — importés par 6 autres modules. C'est un couplage inversé : une util UI logée dans la logique métier. En parallèle, la navigation clavier « roving tabindex » est **dupliquée** presque à l'identique entre `js/map.js` et `js/carte-france.js`.

## 2. Objectif

Créer un module `js/ui-utils.js` regroupant les utilitaires UI transverses. Après ce plan, `toast`/`prefersReducedMotion` et un helper unique de roving-tabindex vivent dans `ui-utils.js` ; `guilds.js` ne contient plus que de la logique de jeu ; `map.js` et `carte-france.js` partagent le même helper de navigation clavier.

## 3. État actuel (ce que tu vas trouver)

- **`js/guilds.js:246`** : `export function prefersReducedMotion()`. **`js/guilds.js:250-268`** : `let toastTimer = null;` + `export function toast(msg)` (écrit `el.textContent = msg`, gère un timer et `prefers-reduced-motion`).
- **Importateurs actuels** (à rediriger vers `./ui-utils.js`) :
  - `js/app.js:5` : `import { rejoindreGuilde, toast } from './guilds.js';`
  - `js/duels.js:10` : `import { ECONOMIE, gagnerCapital, duelsDuJour, toast } from './guilds.js';`
  - `js/gouverner-ui-mandat.js:16` : `import { toast } from './guilds.js';`
  - `js/map.js:8` : `import { …, toast, prefersReducedMotion, … } from './guilds.js';`
  - `js/quiz.js:7` : `import { ECONOMIE, gagnerCapital, prefersReducedMotion } from './guilds.js';`
  - `js/predictions.js:7` : `import { ECONOMIE, gagnerCapital, toast } from './guilds.js';`
  (les autres imports de `guilds.js` — `ECONOMIE`, `gagnerCapital`, `investir`, etc. — **restent** vers `guilds.js`.)
- **Roving tabindex dupliqué** : `js/map.js:120-159` et `js/carte-france.js:86-129` — mêmes `majTabindex` / `navigationClavier`, chacun avec son état module `rovingIdx` (`map.js:17`, `carte-france.js:15`).

## 4. Étapes

1. Créer **`js/ui-utils.js`** :
   - Déplacer `prefersReducedMotion` et `toast` (+ son `toastTimer` de portée module) depuis `guilds.js`, **inchangés** (mêmes signatures, même comportement `textContent`).
   - Ajouter un helper de roving-tabindex générique. Étudier les deux implémentations existantes et extraire la forme commune, par ex. :
     ```js
     // Gère un roving tabindex sur une liste d'éléments focusables (grille/carte).
     // Renvoie { onKeydown, setActif, actif } ; l'état d'index est encapsulé ici.
     export function creerRovingTabindex(getElements, { orientation = 'both' } = {}) { … }
     ```
     Conserver **exactement** le comportement clavier actuel (flèches, Home/End, focus après re-rendu, respect de `prefers-reduced-motion` là où il s'applique). Si les deux usages divergent trop pour un helper unique propre, extraire au minimum `majTabindex(elements, idx)` (fonction pure de mise à jour d'attribut) et laisser chaque module gérer sa navigation — **ne pas dégrader l'accessibilité pour forcer la factorisation**.
2. Dans `js/guilds.js` : supprimer `prefersReducedMotion`, `toast`, `toastTimer`. Vérifier qu'aucun autre code de `guilds.js` n'appelle `toast` en interne (si oui, importer depuis `./ui-utils.js`).
3. Rediriger les imports des 6 modules importateurs : retirer `toast`/`prefersReducedMotion` de la ligne `from './guilds.js'` et ajouter `import { toast, prefersReducedMotion } from './ui-utils.js';` (n'importer que ce que le module utilise).
4. Dans `js/map.js` et `js/carte-france.js` : remplacer la navigation dupliquée par le helper de `ui-utils.js`. Retirer les états `rovingIdx` devenus inutiles (constat STR-06 partiellement résorbé).
5. Ajouter `'./js/ui-utils.js'` à `SHELL` (`sw.js`) **et** incrémenter `CACHE` (`politiquest-vN` → `vN+1`).
6. Créer **`tests/ui-utils.test.mjs`** : tester la partie **pure** extractible du helper (ex. `majTabindex` : à partir d'une liste de faux éléments avec `setAttribute`, l'index actif reçoit `tabindex=0`, les autres `-1`). `toast`/`prefersReducedMotion` touchent le DOM → tester via `tests/shims.mjs` ou couvrir seulement la logique pure. **Ne pas faire diminuer le nombre de tests.**
7. Mettre à jour `MODULES_PURS` dans `tools/verifier-purete.mjs` **seulement si** `ui-utils.js` est conçu pur (il touche le DOM via `toast` → il **n'est pas** pur ; ne pas l'y ajouter).
8. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- Accessibilité (AGENTS.md règle 8) : la navigation clavier des deux cartes doit rester **identique** après refactor — vérifier flèches, Home/End, focus. Audit a11y manuel recommandé si disponible.
- `toast()` doit garder `textContent` (jamais `innerHTML`) — c'est ce qui neutralise l'XSS côté messages.
- Ne pas changer la signature publique de `toast`/`prefersReducedMotion` (6 appelants).
- Le service worker : ne pas oublier le double geste SHELL + bump CACHE (piège n° 1).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 93 (idéalement > 93).
- [ ] `node tools/verifier-sw.mjs` et `node tools/verifier-purete.mjs` : verts.
- [ ] `grep -rn "from './guilds.js'" js/ | grep -E "toast|prefersReducedMotion"` : **aucun** résultat.
- [ ] `grep -c "rovingIdx" js/map.js js/carte-france.js` : 0 (ou justifié dans le commit si un état résiduel est conservé).
- [ ] `node tools/simulate.mjs 200` : sans erreur.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Factoriser les utilitaires **purs** (cosinus, hash, index FAMILLES) → plan **P05** (fichier `js/outils.js`, indépendant).
- Découper `renderMap` (fonction longue) → plan **P10**.
- La gestion d'erreurs globale → plan **P07** (qui dépend de ce plan).

## 8. Finalisation

```
refactor(ui) : extrait js/ui-utils.js (toast, reduced-motion, roving-tabindex) (P04)
```
