# P02 — Garde-fous outillés en CI : vérificateur SW + pureté des modules

| | |
|---|---|
| **Phase** | A0 — Socle |
| **Durée estimée** | 2 h |
| **Dépendances** | aucune |
| **Constats d'audit traités** | PWA-01, TST-02 (docs/AUDIT.md §7, §5) |
| **Fichiers créés** | `tools/verifier-sw.mjs`, `tools/verifier-purete.mjs`, `tests/outillage.test.mjs` |
| **Fichiers modifiés** | `.github/workflows/tests.yml` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, ES modules natifs, zéro dépendance, zéro build. Lire **AGENTS.md à la racine** avant de commencer. Ce plan est autonome.

Deux conventions du dépôt ne sont **aujourd'hui vérifiées par rien** :
1. **Précache du service worker** (le « piège n° 1 ») : tout fichier sous `js/` ou `css/` doit figurer dans la liste `SHELL` de `sw.js`, sinon 404 hors ligne. Rien ne le contrôle — un fichier oublié passe la CI.
2. **Pureté des modules moteur** : `js/gouverner.js`, `js/assemblee.js`, `js/personas.js`, `js/mandat.js`, `js/fiches.js`, `js/data.js`, `js/affinity.js` ne doivent jamais toucher au DOM, à `store`, à `localStorage`. Rien ne le contrôle.

Ce plan outille ces deux règles pour que la CI les fasse respecter automatiquement. **C'est un plan de fondation : les plans suivants (P04, P05, P06…) créent des fichiers et s'appuient sur ce filet.**

## 2. Objectif

Après ce plan, `node tools/verifier-sw.mjs` échoue (code de sortie ≠ 0) si un fichier `js/*.js` ou `css/*.css` manque dans `SHELL` ; `node tools/verifier-purete.mjs` échoue si un module réputé pur importe un module impur ou référence une API navigateur interdite. Les deux tournent en CI à chaque push.

## 3. État actuel (ce que tu vas trouver)

- **`sw.js:4`** : `const CACHE = 'politiquest-v3';`. **`sw.js:5-31`** : `const SHELL = [ … ]` — tableau de chaînes `'./js/xxx.js'`, `'./css/style.css'`, `'./index.html'`, `'./manifest.webmanifest'`, `'./'`. Aujourd'hui complet (21 modules `js/` + le reste).
- **`.github/workflows/tests.yml`** : un seul job `tests` (Node 22), deux étapes — `node --test tests/*.test.mjs` puis `node tools/simulate.mjs 200`.
- Les modules purs n'ont **aucun** `import ... from './store.js'` ni usage de `document`/`localStorage`/`window`. C'est cet état qu'il faut verrouiller.

## 4. Étapes

1. Créer **`tools/verifier-sw.mjs`** (script Node, pas un test) :
   - Lister récursivement les fichiers `js/*.js` et `css/*.css` réellement présents (via `node:fs`).
   - Lire `sw.js`, extraire les chaînes du tableau `SHELL` (une regex sur `'./js/....js'` / `'./css/....css'` suffit — ne pas tenter d'évaluer le module).
   - Comparer : tout fichier présent mais absent de `SHELL` → afficher son chemin et `process.exit(1)`. Tout `SHELL` pointant vers un fichier absent → même traitement (précache mort).
   - En cas de succès : afficher `✓ SHELL complet (N fichiers)` et sortir 0.
   - **`js/geo.js` est inclus** dans la vérification (il est généré mais bien servi et précaché).
2. Créer **`tools/verifier-purete.mjs`** (script Node) :
   - Constante en tête : `const MODULES_PURS = ['gouverner', 'assemblee', 'personas', 'mandat', 'fiches', 'data', 'affinity'];` (alignée sur AGENTS.md règle 2 ; commenter que tout nouveau module désigné pur par un plan doit être ajouté ici).
   - Pour chaque module pur, lire le source et échouer (`exit 1`) s'il contient une référence à une API interdite : `document`, `localStorage`, `window`, `location`, ou un `import` depuis `./store.js`. Utiliser une regex sur des identifiants entiers (`\bdocument\b`) pour éviter les faux positifs dans les chaînes/commentaires — accepter le compromis, documenter que les mentions en commentaire sont tolérées si elles gênent (préférer un test sur `import`/usage réel ; au minimum bloquer `from './store.js'` et `localStorage.`/`document.`).
   - Succès : `✓ N modules purs vérifiés`.
3. Créer **`tests/outillage.test.mjs`** (`node:test`) : deux tests de fumée qui appellent la logique des vérificateurs sur l'arbre réel et assertent qu'ils passent (code 0) à l'état actuel du dépôt — pour que toute régression future casse aussi la suite de tests, pas seulement la CI. Exposer depuis chaque outil une fonction pure (`export function verifierSW()` renvoyant `{ ok, manquants }`) et garder l'`exit` dans un bloc `if (import.meta.url === ...)` d'exécution directe, afin que le test puisse importer la fonction sans déclencher `process.exit`.
4. Modifier **`.github/workflows/tests.yml`** : ajouter deux étapes après la simulation :
   ```yaml
   - name: Complétude du précache service worker
     run: node tools/verifier-sw.mjs
   - name: Pureté des modules moteur
     run: node tools/verifier-purete.mjs
   ```
5. Ajouter une entrée datée à `docs_architecture/01_memory_lessons.md` (append-only).
6. Cocher ce plan dans `docs/plans/README.md` et `docs/ROADMAP.md` §8.

## 5. Garde-fous spécifiques

- Les deux outils ne doivent dépendre que de `node:` (fs, path, url) — **zéro dépendance npm**.
- Ne pas modifier `sw.js` ni aucun module moteur : ce plan **outille** les règles, il ne corrige aucun code de production.
- Ne pas ajouter l'audit a11y (Playwright) à la CI : hors périmètre (décision mainteneur, cf. ROADMAP §9), il reste manuel.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 95 (93 + au moins 2 dans `outillage.test.mjs`).
- [ ] `node tools/verifier-sw.mjs` : sortie 0, affiche `✓ SHELL complet`.
- [ ] `node tools/verifier-purete.mjs` : sortie 0.
- [ ] Preuve négative SW : ajouter temporairement un fichier `js/zzz-temoin.js`, relancer `node tools/verifier-sw.mjs` → doit sortir ≠ 0 et nommer `js/zzz-temoin.js` ; supprimer le fichier témoin ensuite.
- [ ] Preuve négative pureté : ajouter temporairement `localStorage.getItem('x');` en tête de `js/data.js`, relancer → sortie ≠ 0 ; retirer la ligne ensuite.
- [ ] `git status` : seuls les fichiers listés (créés/modifiés) + les 3 fichiers de suivi apparaissent.

## 7. Hors périmètre (ne PAS faire)

- Corriger un éventuel manque dans `SHELL` (il est complet aujourd'hui) — l'outil constate, il ne réécrit pas `sw.js`.
- L'a11y en CI, le lint, la couverture — hors périmètre.

## 8. Finalisation

```
ci(garde-fous) : verificateurs SHELL du SW et purete des modules moteur en CI (P02)
```
