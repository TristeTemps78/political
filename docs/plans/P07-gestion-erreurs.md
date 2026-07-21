# P07 — Gestion d'erreurs globale + adaptateur

| | |
|---|---|
| **Phase** | A — Consolidation, vague 1 |
| **Durée estimée** | 1-2 h |
| **Dépendances** | P04 (utilise `toast` depuis `js/ui-utils.js`) |
| **Constats d'audit traités** | SEC-03 (docs/AUDIT.md §2) |
| **Fichiers créés** | (aucun ; éventuellement `tests/erreurs.test.mjs`) |
| **Fichiers modifiés** | `js/app.js`, `js/graph.js`, `js/predictions.js`, `sw.js` (seulement si un fichier est ajouté) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P04** : il consomme `toast` depuis `js/ui-utils.js` (ne pas l'importer de `guilds.js`).

Les écrans qui liront un jour des données réelles (`graph.js`, `predictions.js`) font des `await adapter.getX()` **sans try/catch**. Aujourd'hui inoffensif (`MockAdapter` ne rejette jamais), mais `RemoteAdapter.fetchJson` (`js/adapter.js:49`) `throw` sur HTTP ≠ 200 : dès le branchement open-data, ces écrans casseront en silence. Aucun filet global (`window.onerror` / `onunhandledrejection`) n'existe.

## 2. Objectif

Après ce plan : (1) chaque `await adapter.*` dans `graph.js`/`predictions.js` est protégé et affiche un état d'erreur lisible plutôt que de casser le rendu ; (2) un filet global dans `app.js` capture toute erreur/rejection non gérée et prévient l'utilisateur (toast) au lieu d'un écran figé silencieux.

## 3. État actuel (ce que tu vas trouver)

- **`js/graph.js:11`** : `export async function renderGraph(root)`. **`:23-24`** : `await Promise.all([adapter.getDeputes(), adapter.getScrutins()])` puis `await Promise.all(scrutins.map(sc => adapter.getVotes(sc.id)))` — sans try/catch. Import `adapter` l. 6.
- **`js/predictions.js:11` et `:61`** : `await adapter.getX()` sans try/catch.
- **`js/adapter.js:38-58`** : `RemoteAdapter` (jamais instancié aujourd'hui, code prospectif) ; `fetchJson` (l. 49) `throw` sur statut ≠ 200.
- **`js/app.js`** : point d'entrée, aucun `window.onerror`/`onunhandledrejection`.

## 4. Étapes

1. Dans `js/app.js`, installer un filet global (une seule fois, au démarrage) :
   ```js
   window.addEventListener('error', (e) => { console.error('Erreur non gérée', e.error || e.message); toast('Une erreur est survenue.'); });
   window.addEventListener('unhandledrejection', (e) => { console.error('Rejet non géré', e.reason); toast('Une action a échoué, réessayez.'); });
   ```
   Importer `toast` depuis `./ui-utils.js` (P04). Messages en français, sobres, sans détail technique à l'écran.
2. Dans `js/graph.js` : envelopper les `await adapter.*` dans un `try/catch`. En cas d'échec, rendre dans `root` un message d'erreur accessible (`role="alert"` / `aria-live`) proposant de réessayer, plutôt qu'un `throw` qui laisse l'onglet vide. Prévoir aussi l'état « chargement » si trivial (facultatif).
3. Dans `js/predictions.js` : même traitement pour les deux points d'`await` (l. 11 et 61) — état d'erreur lisible, pas de rendu cassé.
4. Ne **pas** modifier `MockAdapter` ni `RemoteAdapter` (le prospectif reste tel quel, cf. AUDIT §8) — on protège les **appelants**, on ne change pas l'adaptateur.
5. Si (et seulement si) un module utilitaire d'erreur est extrait, l'ajouter à `SHELL` + bump `CACHE` ; sinon ne pas toucher `sw.js`. Privilégier l'inline dans les 3 fichiers (pas de nouveau module nécessaire).
6. Tests (facultatif mais bienvenu) : un test qui, avec un faux adaptateur qui rejette, vérifie que `renderGraph` n'exécute pas de `throw` non capturé (nécessite `tests/shims.mjs` pour un `root` factice). Si trop coûteux en DOM, s'en tenir à une vérification manuelle documentée. **Ne pas faire diminuer le nombre de tests.**
7. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- Ne pas avaler les erreurs en silence : toujours `console.error` **et** un retour utilisateur.
- Accessibilité : les messages d'erreur d'onglet doivent être annoncés (`role="alert"`/`aria-live="assertive"`) et focusables si pertinents.
- `toast` vient de `ui-utils.js` (P04), jamais de `guilds.js`.
- Ne pas transformer les rendus en composants asynchrones fragiles : garder la logique de rendu, ajouter seulement le filet.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant.
- [ ] `node tools/verifier-sw.mjs` et `node tools/verifier-purete.mjs` : verts.
- [ ] Preuve manuelle : temporairement forcer `adapter.getDeputes` à `throw`, ouvrir l'onglet Graphe → un message d'erreur accessible s'affiche, aucune exception non capturée en console au niveau du rendu (le filet global la loggerait proprement). Rétablir.
- [ ] `grep -n "await adapter" js/graph.js js/predictions.js` : chaque occurrence est dans un `try` (revue manuelle).
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Rendre la simulation de forces non bloquante → plan **P08** (dépend de ce plan).
- Instancier `RemoteAdapter` ou brancher de vraies données open-data → hors périmètre (phase 2, décision mainteneur).

## 8. Finalisation

```
fix(robustesse) : filet d'erreurs global + try/catch sur les appels adaptateur (P07)
```
