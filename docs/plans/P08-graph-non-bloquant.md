# P08 — Simulation de forces non bloquante dans `graph.js`

| | |
|---|---|
| **Phase** | A — Consolidation, vague 2 |
| **Durée estimée** | 2 h |
| **Dépendances** | P07 (graph.js déjà protégé par try/catch) |
| **Constats d'audit traités** | PERF-01 (docs/AUDIT.md §4) |
| **Fichiers créés** | éventuellement `js/forces.js`, `tests/forces.test.mjs` |
| **Fichiers modifiés** | `js/graph.js`, `sw.js` (si un module est extrait) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P07** (graph.js est déjà enveloppé de gestion d'erreurs).

L'onglet Graphe simule un placement de nœuds par forces (répulsion globale O(n²) + ressorts sur les arêtes), **300 itérations**, **synchrones**, **recalculées à chaque render**, sur le thread principal. Négligeable à 24 députés démo ; à 577 réels (« phase 2 »), ≈ 10⁸ opérations bloquantes par affichage → l'onglet gèle.

## 2. Objectif

Après ce plan, le calcul de forces ne bloque plus l'UI de façon perceptible : il est **borné** et/ou **découpé par frames** (ou déplacé hors du thread de rendu), avec un placement final visuellement équivalent à l'échelle démo. Aucun changement fonctionnel visible à 24 nœuds.

## 3. État actuel (ce que tu vas trouver)

Dans `js/graph.js` (vérifié au commit `48d276c`) :
- `export async function renderGraph(root)` (l. 11) ; import `adapter` (l. 6).
- Construction des arêtes par accord de vote (l. 28-47), avec double boucle `for i / for j>i` (l. 35-46) sur `deputes`.
- **Simulation** (l. 48-84) : `for (let iter = 0; iter < 300; iter++)` (l. 56) contenant une double boucle nœuds×nœuds (répulsion, l. 57-66) puis une boucle sur les arêtes (ressorts, l. 67-74) puis intégration (l. 75+).
- Projection des positions dans le SVG ensuite (l. 86-100).

## 4. Étapes (choisir UNE stratégie, la plus simple qui tient l'objectif)

**Stratégie A — bornes + découpage par `requestAnimationFrame` (recommandée)** :
1. Extraire le calcul dans une fonction pure `js/forces.js` : `export function simuler(nodes, edges, { iterations, ... })` qui exécute **un** pas (ou un petit lot de pas) et renvoie l'état mis à jour — sans toucher au DOM.
2. Dans `graph.js`, piloter la simulation par `requestAnimationFrame` : quelques itérations par frame, jusqu'à `iterations` ou convergence (déplacement max < ε), puis rendu final. Permet à l'UI de respirer.
3. **Borner selon la taille** : au-delà d'un seuil de nœuds (ex. > 120), réduire le nombre d'itérations et/ou approximer la répulsion (grille/quadtree simple, ou répulsion uniquement entre voisins) — l'important est de supprimer le O(n²)×300 synchrone. À l'échelle démo, garder le comportement actuel.
4. Respecter `prefersReducedMotion()` (depuis `ui-utils.js`, cf. P04) : si actif, faire un placement direct sans animation frame-par-frame perceptible.

**Stratégie B — Web Worker** : déplacer `simuler` dans un worker et poster le résultat. Plus robuste à 577 nœuds mais ajoute un fichier worker au SHELL et de la complexité de cycle de vie ; **ne la retenir que si A ne suffit pas** — à discuter dans le commit.

Dans les deux cas :
5. Ne pas recalculer la simulation si l'onglet est re-rendu sans changement de données (mémoriser les positions).
6. Si un module `js/forces.js` est extrait : l'ajouter à `SHELL` + bump `CACHE`, et à `MODULES_PURS` (il est pur).
7. Tests `tests/forces.test.mjs` : `simuler` est pure et déterministe → vérifier qu'à graphe fixe, N pas produisent des positions bornées (pas de NaN, pas d'explosion) et stables entre deux exécutions.
8. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Accessibilité** : respecter `prefers-reduced-motion` (pas d'animation qui tourne indéfiniment). Le graphe reste navigable au clavier comme avant.
- Ne pas régresser le rendu à l'échelle démo (24 nœuds) : placement visuellement équivalent.
- `js/forces.js` (si extrait) reste **pur** — pas de `document`, pas de `requestAnimationFrame` **dans** le module pur (le rAF vit dans `graph.js`).
- Déterminisme : si des tirages aléatoires initialisent les positions, conserver la graine/l'ordre.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant.
- [ ] `node tools/verifier-sw.mjs` / `verifier-purete.mjs` : verts (avec `forces` si extrait).
- [ ] Preuve manuelle : ouvrir l'onglet Graphe → placement correct, aucune saccade perceptible ; activer `prefers-reduced-motion` (DevTools) → pas d'animation continue.
- [ ] (Si outillage) mesurer que le rendu n'exécute plus 300 itérations synchrones d'un bloc à > 120 nœuds (revue de code : la boucle `for iter<300` synchrone a disparu).
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Brancher les 577 députés réels (données open-data) → phase 2, décision mainteneur.
- Changer l'esthétique du graphe (couleurs, tailles) — seul le **coût** de calcul est visé.

## 8. Finalisation

```
perf(graphe) : simulation de forces bornee et non bloquante (P08)
```
