# P11 — Tests de fumée des modules UI

| | |
|---|---|
| **Phase** | A — Consolidation, vague 2 |
| **Durée estimée** | 2-3 h |
| **Dépendances** | vague 1 (P04, P05, P06, P07 fusionnés — l'UI ne bouge plus sous les tests) |
| **Constats d'audit traités** | TST-01 (docs/AUDIT.md §5) |
| **Fichiers créés** | `tests/ui-fumee.test.mjs` (+ éventuels compléments à `tests/shims.mjs`) |
| **Fichiers modifiés** | `tests/shims.mjs` (si les doublures DOM doivent être étoffées) |
| **Fichiers interdits** | tout module `js/` de production (ce plan **n'ajoute que des tests**), `js/geo.js` |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome.

La suite (93 tests) couvre bien les modules purs mais **10 modules UI/DOM** n'ont **aucun** test : `app.js`, `adapter.js`, `graph.js`, `hemicycle.js`, `map.js`, `predictions.js`, `quiz.js`, `carte-france.js`, `gouverner-ui.js`, `gouverner-ui-mandat.js`. `tests/shims.mjs` (doublures `localStorage`/`document`) prouve que des **tests de fumée** Node sont possibles sans navigateur.

## 2. Objectif

Après ce plan, chaque module UI a au moins un **test de fumée** : il s'importe sans lever d'exception, et sa fonction de rendu principale, appelée avec un `root` factice et un store minimal, ne jette pas et écrit quelque chose dans `root`. Objectif : un filet de régression, pas une couverture exhaustive.

## 3. État actuel (ce que tu vas trouver)

- **`tests/shims.mjs`** : `localStorage` en mémoire, `document` minimal (`getElementById`, `createElement` renvoyant un faux nœud avec `classList`/`style`/`textContent`/`setAttribute`/`appendChild`, `body.appendChild`), `location.reload`, `resetStorage()`. **Pas** de `querySelector`/`querySelectorAll` complets, pas d'événements réels.
- Les modules UI exportent typiquement une fonction `renderXxx(root)` ou `renderXxx(root, ...)` ; certains sont `async` (`graph.js`, `predictions.js`). `adapter.js` expose `MockAdapter` (jamais rejeté) et `RemoteAdapter` (prospectif).

## 4. Étapes

1. **Évaluer `tests/shims.mjs`** : la plupart des rendus utilisent `root.innerHTML = ...` puis `root.querySelector(...)`. Le faux `document` actuel ne fournit pas de nœud gérant `innerHTML`/`querySelector`. Étoffer les doublures **a minima** pour permettre les tests de fumée :
   - Un faux élément gérant `innerHTML` (setter no-op ou stockage de chaîne), `querySelector`/`querySelectorAll` renvoyant des faux nœuds inertes, `addEventListener` no-op, `setAttribute`/`classList`/`focus`.
   - Garder les doublures **minimales et inertes** : le but est que le code s'exécute, pas de simuler un vrai DOM. Documenter que ce ne sont pas des tests d'intégration.
   - Ne pas casser les tests existants qui importent déjà `shims.mjs` (store, guilds) : **n'ajouter que**, ne pas modifier le comportement existant des doublures.
2. Créer **`tests/ui-fumee.test.mjs`** : pour chacun des 10 modules, un test qui
   - importe le module (échoue si l'import lève),
   - appelle sa fonction de rendu principale avec un `root` factice + un store initialisé par `defaults()` (via `resetStorage()` puis `load()`),
   - asserte qu'aucune exception n'est levée (pour les `async`, `await` + `assert.doesNotReject`).
   Pour `adapter.js` : tester que `MockAdapter.getDeputes()`/`getScrutins()`/`getVotes(id)` résolvent des tableaux ; ne pas tester `RemoteAdapter` (nécessiterait le réseau).
3. Si un module ne peut être testé de fumée sans vrai DOM (interaction lourde), documenter la limite en commentaire et couvrir au moins l'import + toute fonction pure exportée. **Ne jamais** modifier le module de production pour le rendre testable dans ce plan (hors périmètre) — le noter comme dette pour un plan futur.
4. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Ce plan ne touche aucun module de production** (`js/*` hors tests). Si un module refuse obstinément de s'exécuter sous shims, réduire l'ambition du test plutôt que modifier le code.
- Les doublures restent des **doublures** : pas de vraie simulation DOM, pas de dépendance (jsdom interdit — zéro dépendance).
- Ne pas faire diminuer le nombre de tests (règle 10) — ici il augmente nettement (+10 au moins).
- Les tests doivent être déterministes (pas de dépendance à l'horloge/réseau ; `MockAdapter` est déterministe).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 103 (93 + au moins 10).
- [ ] Chacun des 10 modules UI est importé par au moins un test qui s'exécute sans throw.
- [ ] `node tools/verifier-purete.mjs` : vert (aucun module pur n'a été rendu impur).
- [ ] `git status` : seuls `tests/ui-fumee.test.mjs`, éventuellement `tests/shims.mjs`, + les 2-3 fichiers de suivi (README/ROADMAP/lessons). **Aucun `js/*` de production modifié.**

## 7. Hors périmètre (ne PAS faire)

- Tests d'intégration navigateur / Playwright → l'a11y-audit manuel existe déjà, hors CI (décision mainteneur).
- Refactoriser un module pour le rendre plus testable → dette notée, pas traitée ici.
- Introduire jsdom ou toute dépendance de test → interdit (zéro dépendance).

## 8. Finalisation

```
test(ui) : tests de fumee des 10 modules UI via shims Node (P11)
```
