# P01 — Corriger la faille XSS des défis partagés

| | |
|---|---|
| **Phase** | A0 — Socle |
| **Durée estimée** | 1-2 h |
| **Dépendances** | aucune |
| **Constats d'audit traités** | SEC-01 (docs/AUDIT.md §2) |
| **Fichiers créés** | `js/echappement.js`, `tests/echappement.test.mjs` |
| **Fichiers modifiés** | `js/duels.js`, `sw.js` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, ES modules natifs, zéro dépendance, zéro build. Lire **AGENTS.md à la racine** avant de commencer (conventions non négociables : français, modules purs, bump du service worker, déterminisme seedé). Ce plan est autonome : tout le nécessaire est ici ou dans AGENTS.md.

Le jeu est **100 % hors ligne** sauf un seul mécanisme : les « défis entre amis » (`js/duels.js`) encodent l'état d'un joueur (thème, allocation, pseudo) en base64url dans une URL (`?defi=…`). Quand un ami ouvre ce lien, `decoderDefi` décode le pseudo et l'injecte dans le DOM via `innerHTML`. Un pseudo forgé contenant du HTML/JS s'exécute alors chez la victime — c'est le seul point d'entrée de données non fiables de tout le jeu.

## 2. Objectif

Après ce plan, aucune donnée provenant d'un défi partagé (pseudo, ou toute future donnée utilisateur affichée) ne peut plus injecter de HTML/JS dans la page : le pseudo s'affiche toujours comme texte littéral, quel que soit son contenu.

## 3. État actuel (ce que tu vas trouver)

Vérifié directement dans `js/duels.js` au commit `48d276c` :

- **`js/duels.js:40-58`** — `decoderDefi(code)` : décode le base64url, valide la structure (`d.v === 1`, thème existant, allocation cohérente avec le budget), et tronque le pseudo à 30 caractères (`d.p.slice(0, 30)`) — **mais ne filtre ni `<`, ni `"`, ni `&`**. Aucune fonction d'échappement HTML n'existe dans le projet.
- **`js/duels.js:195`** — injection d'attribut, dans `renderCreerDefi` (le pseudo affiché ici est celui du JOUEUR LOCAL, pas encore un risque XSS envers un tiers, mais reste un point d'échappement à corriger par cohérence et parce que l'audit le cite explicitement) :
  ```js
  <input type="text" id="duel-pseudo" maxlength="30" placeholder="Votre pseudo" value="${s.joueur.pseudo || ''}" aria-label="Votre pseudo">
  ```
  Un pseudo contenant un `"` casse l'attribut et permet d'injecter n'importe quel attribut/HTML supplémentaire sur le `<input>`.
- **`js/duels.js:251`** — dans `jouerDefi(root, defi)`, point d'entrée de la donnée non fiable :
  ```js
  const qui = defi.pseudo || 'Votre adversaire';
  ```
  `defi.pseudo` vient de `decoderDefi`, donc **entièrement contrôlé par l'auteur du lien**.
- **`js/duels.js:254`** — `qui` injecté via `innerHTML` :
  ```js
  <p><strong>${qui}</strong> a réparti ${defi.theme.budget} points sur ce thème.
  ```
- **`js/duels.js:269`** — même chose, second usage :
  ```js
  <p class="hint">Les arbitrages réels de ${qui} :</p>
  ```
- **`js/duels.js:266`** — `qui` est aussi passé dans le message de `gagnerCapital(ECONOMIE.DEFI_AMI_GAIN, \`vous avez bien lu ${qui}\`)` (`js/guilds.js:59-65`), qui appelle en interne `toast(...)` (`js/guilds.js:251-268`). **Vérification faite sur `js/guilds.js:259`** : `toast()` écrit le message via `el.textContent = msg`, qui échappe déjà automatiquement le HTML — ce chemin n'est **pas exploitable** en pratique. Il n'a donc pas besoin d'un traitement séparé : le corriger à la source (étape 4.3 ci-dessous) suffit à le neutraliser aussi, sans changement dans `guilds.js`.

Aucun fichier `js/echappement.js` n'existe. `sw.js:4` porte `CACHE = 'politiquest-v3'` et `sw.js:5-31` la liste `SHELL` (21 entrées `js/*.js` + `css/style.css` + `index.html` + `manifest.webmanifest`), sans `js/echappement.js`.

## 4. Étapes

1. Créer **`js/echappement.js`** — module **PUR** (aucun DOM, aucun `store`, testable sous Node), avec deux exports :
   - `echapperHTML(texte)` : remplace `&`, `<`, `>`, `"`, `'` respectivement par `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;` (dans cet ordre — **`&` en premier**, sinon les entités déjà produites seraient elles-mêmes ré-échappées). Gérer les entrées non-string (`null`, `undefined`, `number`) en les convertissant d'abord en chaîne (`String(texte)`), pour que les appelants n'aient pas à vérifier le type.
   - `echapperAttribut(texte)` : même traitement que `echapperHTML` (un attribut entre guillemets doubles n'a besoin de voir `"` échappé, mais échapper aussi `<`/`>`/`'` par cohérence et défense en profondeur ne change rien au rendu et évite une deuxième fonction à maintenir séparément — c'est un simple alias ou une implémentation identique, au choix de l'agent).
2. Dans **`js/duels.js`** :
   - Ajouter `import { echapperHTML, echapperAttribut } from './echappement.js';` en tête de fichier (après la ligne 10).
   - **Ligne 195** : remplacer `value="${s.joueur.pseudo || ''}"` par `value="${echapperAttribut(s.joueur.pseudo || '')}"`.
   - **Ligne 251** : échapper **une seule fois, à la source**, pour que tous les usages en aval (254, 266, 269) soient protégés automatiquement sans dupliquer l'appel :
     ```js
     const qui = echapperHTML(defi.pseudo || 'Votre adversaire');
     ```
   - Ne rien changer d'autre aux lignes 254, 266, 269 : elles utilisent déjà `qui`, désormais échappé.
3. Ajouter `./js/echappement.js` à la liste `SHELL` de `sw.js` (n'importe où dans la liste `js/*`, ex. juste après `'./js/duels.js',` ligne 21) **et** incrémenter `CACHE` de `'politiquest-v3'` à `'politiquest-v4'` (`sw.js:4`).
4. Créer **`tests/echappement.test.mjs`** (`node:test` + `node:assert/strict`) : le module est pur, donc **aucun import de `tests/shims.mjs` n'est nécessaire** (pas de DOM/localStorage en jeu). Couvrir au minimum :
   - `echapperHTML` transforme chacun des 5 caractères `&`, `<`, `>`, `"`, `'` individuellement.
   - Le payload de preuve de l'audit : `echapperHTML('<img src=x onerror=alert(1)>')` ne contient ni `<` ni `>` en sortie.
   - Un texte sans caractère spécial est retourné inchangé.
   - `echapperAttribut` neutralise un pseudo contenant `" onmouseover="alert(1)` (le `"` doit être échappé).
   - Ordre correct : `echapperHTML('&lt;')` doit donner `&amp;lt;` (le `&` d'origine est échappé, pas ré-interprété) — vérifie que `&` est bien traité en premier.
5. Ajouter une entrée datée à `docs_architecture/01_memory_lessons.md` (append-only : ajouter à la fin, ne jamais réécrire l'existant) résumant la correction et le piège du `&` à échapper en premier.
6. Cocher ce plan dans `docs/plans/README.md` et `docs/ROADMAP.md` §8.

## 5. Garde-fous spécifiques

- `js/echappement.js` doit rester un module **PUR** au sens d'AGENTS.md règle 2 : testable sous Node sans aucun shim.
- Ne pas modifier `decoderDefi` (la troncature à 30 caractères et la validation de structure sont hors périmètre de ce plan — seul l'échappement à l'affichage est corrigé).
- Ne pas introduire de dépendance npm (aucune bibliothèque d'échappement externe — la fonction est triviale et doit rester interne).
- Ne toucher à aucun autre point du fichier `js/duels.js` que les 3 lignes listées à l'étape 4.2.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 98 (93 + au moins 5 nouveaux dans `echappement.test.mjs`).
- [ ] `node tools/simulate.mjs 200` : sans erreur.
- [ ] `git status` : seuls `js/echappement.js`, `tests/echappement.test.mjs`, `js/duels.js`, `sw.js` (et `docs/plans/README.md`, `docs/ROADMAP.md`, `docs_architecture/01_memory_lessons.md`) apparaissent modifiés/créés.
- [ ] Preuve manuelle du payload XSS : encoder un défi dont le pseudo vaut `<img src=x onerror=alert(1)>` (via `encoderDefi('...', {...}, '<img src=x onerror=alert(1)>')` dans une console Node ou un petit script temporaire important `js/duels.js`), servir le dossier (`npx serve .` ou équivalent statique), ouvrir `index.html?defi=<code_obtenu>`, aller relever le défi : le pseudo doit s'afficher **littéralement** comme texte (`<img src=x onerror=alert(1)>` visible à l'écran), **aucune alerte ne doit se déclencher**.
- [ ] `grep -n "value=\"\${s.joueur.pseudo" js/duels.js` renvoie une ligne contenant `echapperAttribut(`.
- [ ] `grep -n "const qui = " js/duels.js` renvoie une ligne contenant `echapperHTML(`.

## 7. Hors périmètre (ne PAS faire)

- Le reset destructif du store sur schéma inattendu (SEC-02) → plan **P03**.
- La gestion d'erreurs globale et des appels async (SEC-03) → plan **P07**.
- La factorisation d'autres utilitaires (`ui-utils.js`, `outils.js`) → plans **P04**/**P05**, indépendants.
- Le futur défi de mandat partagé (`?mandat=`, plan **P20**) devra réutiliser `js/echappement.js` — ne pas l'anticiper ici.

## 8. Finalisation

Message de commit suggéré :
```
fix(securite) : echappe le pseudo des defis partages contre l'injection HTML (P01)
```
