# Audit du code — PolitiQuest 2027

> Date : 19 juillet 2026 — commit de référence : `48d276c` (`48d276cc0a1bd22ce867ec8883dd96804e101cc2`).
> Les numéros de ligne sont valables à ce commit ; si le code a bougé, chercher par nom de symbole.

## 0. Résumé exécutif

Le projet est en bon état : 93 tests verts, CI fonctionnelle, séparation nette moteur pur / UI, accessibilité soignée. La dette est réelle mais localisée : **une faille XSS** (le seul point d'entrée de données non fiables du jeu), **un reset destructif** des données locales en cas de schéma inattendu, et une dette structurelle de croissance (module fourre-tout, duplications, fonctions longues) accumulée pendant la construction rapide du mode Gouverner.

| Catégorie | S1 Critique | S2 Majeur | S3 Modéré | S4 Mineur |
|---|---|---|---|---|
| Sécurité / robustesse | SEC-01, SEC-02 | SEC-03 | — | — |
| Dette structurelle | — | — | STR-01…05, STR-08 | STR-06, STR-07 |
| Performance | — | — | PERF-01 | — |
| Tests / CI | — | — | TST-01, TST-02 | TST-03 |
| Documentation | — | — | DOC-01 | DOC-02 |
| PWA | — | PWA-01 | — | — |

Chaque constat renvoie au plan qui le traite (`docs/plans/`) — table complète en §9.

## 1. Méthodologie et périmètre

Audité : les 21 modules `js/`, `index.html`, `sw.js`, `manifest.webmanifest`, `css/style.css`, `tests/`, `tools/`, `.github/workflows/tests.yml`, `docs_architecture/`. Lecture intégrale des fichiers de production, vérification manuelle des constats critiques, exécution de la suite de tests (93/93 verts au commit de référence).

Échelle de sévérité :
- **S1 Critique** — sécurité ou perte de données utilisateur.
- **S2 Majeur** — robustesse, bug avéré, piège grave pour contributeur.
- **S3 Modéré** — dette structurelle, duplication, performance latente.
- **S4 Mineur** — code mort, incohérence cosmétique, doc périmée.

## 2. Sécurité et robustesse

### SEC-01 — XSS via le pseudo des défis partagés [S1 Critique]
- **Où** : `js/duels.js:254` et `js/duels.js:269` (`${qui}` injecté via `innerHTML`), `js/duels.js:266` (passé à `toast()`), `js/duels.js:195` (injection d'attribut `value="${s.joueur.pseudo}"`).
- **Constat** : le pseudo provient du paramètre d'URL `?defi=` (base64url arbitraire). `decoderDefi` (`js/duels.js:54`) tronque à 30 caractères mais ne filtre ni `<` ni `"` ni `&`. Aucune fonction d'échappement HTML n'existe dans le projet.
- **Impact** : un lien de défi forgé exécute du HTML/JS arbitraire chez la personne qui l'ouvre. C'est le **seul** point du jeu où une donnée non fiable entre dans le rendu — tout le reste est statique.
- **Preuve** : encoder un défi dont `p` vaut `<img src=x onerror=alert(1)>` et ouvrir `index.html?defi=<code>`.
- **Résolution** : plan **P01**.

### SEC-02 — Réinitialisation destructive du store sur schéma inattendu [S1 Critique]
- **Où** : `js/store.js:35` (`migrer` retourne `null` si version ≠ 3), `js/store.js:52-56` (catch JSON corrompu → `defaults()` puis `save()` qui écrase).
- **Constat** : toute version de schéma inconnue (future, ou corrompue) ou tout JSON illisible efface **silencieusement** l'intégralité de la progression (profil, capital, mandat Gouverner en cours), sans copie de secours.
- **Impact** : perte totale de données utilisateur au premier incident de schéma — par exemple si l'utilisateur ouvre une version plus ancienne du site après une migration v4.
- **Résolution** : plan **P03**.

### SEC-03 — Appels async sans gestion d'erreur, aucun filet global [S2 Majeur]
- **Où** : `js/graph.js:23-24`, `js/predictions.js:11` et `:61` (`await adapter.getX()` sans try/catch) ; aucun `window.onerror` / `onunhandledrejection` dans `js/app.js`.
- **Constat** : inoffensif aujourd'hui (`MockAdapter` ne rejette jamais), mais `RemoteAdapter.fetchJson` (`js/adapter.js:49`) `throw` sur HTTP ≠ 200 : dès le branchement de données réelles, ces écrans casseront sans message. Aucun état de chargement/erreur prévu.
- **Résolution** : plan **P07**.

## 3. Dette structurelle

### STR-01 — `js/guilds.js` est un module fourre-tout [S3]
- **Où** : `js/guilds.js` — économie (`ECONOMIE`, l.8-40), partielles (l.45-57), capital, guildes, duels quotidiens, investissement, motion de censure + IA rivale (l.98-233), consultation, **et** deux utilitaires UI transverses : `prefersReducedMotion` (l.246) et `toast` (l.251-268).
- **Constat** : `toast`/`prefersReducedMotion` sont importés par `quiz.js`, `map.js`, `duels.js`, `predictions.js`, `gouverner-ui-mandat.js` — une util UI logée dans la logique de jeu, couplage inversé.
- **Résolution** : plan **P04**.

### STR-02 — Utilitaires purs dupliqués [S3]
- **Où** : cosinus / produit scalaire réimplémenté **4 fois** (`js/affinity.js:77-85`, `js/duels.js:14-24`, `js/personas.js:173-179`, `js/assemblee.js:65-73`) ; hash FNV-1a **2 fois** (`js/adapter.js:60-67`, `js/guilds.js:46-50`) ; `FAMILLES.find(f => f.id === x)` répété des dizaines de fois sans Map d'index (map, hemicycle, graph, quiz, guilds, gouverner-ui…).
- **Résolution** : plan **P05**.

### STR-03 — Duplication dans le moteur Gouverner [S3]
- **Où** : `journaliser()` identique dans `js/gouverner.js:121-124` et `js/assemblee.js:75-78` ; renormalisation des 577 sièges (~30 lignes quasi identiques : arrondi + écrêtage < 289 + redistribution) dans `js/gouverner.js:135-169` et `js/assemblee.js:84-113` (le commentaire `assemblee.js:83` le reconnaît).
- **Résolution** : plan **P06**.

### STR-04 — Navigation clavier roving-tabindex dupliquée [S3]
- **Où** : `js/map.js:120-159` et `js/carte-france.js:86-129` (mêmes `majTabindex`/`navigationClavier`, structure copiée), avec chacun son état module `rovingIdx` (`map.js:17`, `carte-france.js:15`).
- **Résolution** : plan **P04** (factorisation dans le même module d'utilitaires UI).

### STR-05 — Fonctions très longues [S3]
- **Où** : `finDeTour` ~100 lignes, 7 étapes numérotées en commentaires (`js/gouverner.js:217-317`) ; `tickIA` ~80 lignes mêlant IA rivale et cycle de vie de la censure (`js/guilds.js:154-233`) ; `renderMap` ~90 lignes (`js/map.js:31-118`).
- **Résolution** : plan **P10**.

### STR-06 — État mutable global de module épars [S4]
- **Où** : `rovingIdx` (`map.js:17`, `carte-france.js:15`), `selectionDept`/`panneauReformes` (`gouverner-ui-mandat.js:18-19`), `defiInitial` (`duels.js:62`), `toastTimer` (`guilds.js:250`), `ongletActif` (`app.js:38`).
- **Constat** : voulu (survie entre re-rendus) mais rend les composants non réentrants. **Accepté** en l'état — coût de correction supérieur au bénéfice tant qu'il n'y a qu'une instance de chaque composant. La part `rovingIdx` disparaît avec P04.

### STR-07 — Code mort et incohérences cosmétiques [S4]
- **Où** : re-export inutile `export { adapter }` (`js/hemicycle.js:108`, personne ne l'importe de là) ; classes CSS `gvn-vote-abstention` (utilisée `gouverner-ui-mandat.js:263`) et `gvn-echeance` (utilisée `gouverner-ui-mandat.js:40`) **jamais définies** dans `css/style.css`.
- **Résolution** : plan **P09**.

### STR-08 — Fin de mandat `"censure"` fantôme [S3]
- **Où** : `fin.type = "censure"` est documenté (`docs_architecture/02_data_schemas.md` §6) et a un libellé UI (`js/gouverner-ui.js`, `LIBELLES_FIN`), mais **aucun chemin du moteur ne le produit** : une 2ᵉ censure adoptée donne `"demission"`.
- **Impact** : code UI inatteignable, doc trompeuse pour tout agent qui étend les fins de mandat.
- **Résolution** : plan **P09** (faire produire réellement cette fin par le moteur, aligné sur le libellé existant).

## 4. Performance

### PERF-01 — Simulation de forces synchrone O(n²)×300 [S3]
- **Où** : `js/graph.js:56-81` — 300 itérations × n² paires, recalculées **à chaque render** de l'onglet, sur le thread principal.
- **Constat** : négligeable à 24 députés démo ; à 577 réels (prévu « phase 2 »), ≈ 10⁸ opérations bloquantes à chaque affichage. Aucune borne, aucun découpage par frame.
- **Résolution** : plan **P08**.

## 5. Tests et CI

### TST-01 — 10 modules sans aucun test [S3]
- **Où** : `app.js`, `adapter.js`, `graph.js`, `hemicycle.js`, `map.js`, `predictions.js`, `quiz.js`, `carte-france.js`, `gouverner-ui.js`, `gouverner-ui-mandat.js` — tous UI/DOM ou intégration.
- **Constat** : la suite (93 tests) couvre bien les modules purs (affinity, data, geo, guilds, fiches, assemblee, personas, gouverner + store/mandat/duels indirectement) mais aucun rendu. `tests/shims.mjs` (doublures `localStorage`/`document`) montre que des tests de fumée Node sont possibles sans navigateur.
- **Résolution** : plan **P11**.

### TST-02 — CI minimale : ni lint, ni a11y, ni garde-fous [S3]
- **Où** : `.github/workflows/tests.yml` — un seul job (Node 22) : `node --test tests/*.test.mjs` + `node tools/simulate.mjs 200`.
- **Constat** : `tools/a11y-audit.mjs` (Playwright + axe-core) existe mais n'est jamais lancé en CI ; rien ne vérifie la complétude de la liste `SHELL` du service worker ni la pureté des modules moteur (conventions non outillées).
- **Résolution** : plan **P02** (garde-fous SW + pureté en CI ; l'a11y en CI reste hors périmètre, exécution manuelle documentée).

### TST-03 — Piège d'invocation du runner [S4]
- **Constat** : `node --test tests/` échoue (résolution de modules) ; seul `node --test tests/*.test.mjs` fonctionne. Documenté dans `docs_architecture/01_memory_lessons.md:79`.
- **Résolution** : consigné dans `AGENTS.md` (aucun changement de code).

## 6. Documentation

### DOC-01 — `02_data_schemas.md` : §1 contredit §6 [S3]
- **Constat** : la §1 décrit encore le schéma `version: 1` (sans `joueur.duels`, `monde.censure`, `monde.gouverner`) alors que la §6 documente correctement `SCHEMA_VERSION = 3`. Trompeur pour tout agent qui touche au store.
- **Résolution** : plan **P12**.

### DOC-02 — `00_analyse_technique.md` périmé [S4]
- **Constat** : l'arbre d'architecture (§2) liste ~13 modules sur 21 et « 5 onglets » (6 réels) ; la §3 annonce « équilibrage par simulation de 10 000 parties » (réel : 200 en CI, 1 000 par défaut, 500 dans le guide). Les compteurs de tests de `01_memory_lessons.md` (17, 25) sont datés mais c'est un journal append-only : acceptable, ne pas réécrire l'historique.
- **Résolution** : plan **P12**.

## 7. PWA / Service worker

### PWA-01 — Précache et version maintenus à la main [S2 Majeur]
- **Où** : `sw.js:4` (`CACHE = 'politiquest-v3'`), `sw.js:5-31` (liste `SHELL`), stratégie cache-first pure (`sw.js:45-49`) sans runtime caching.
- **Constat** : la liste est **complète aujourd'hui** (les 21 js + css + html + manifest vérifiés un à un), mais tout nouveau fichier doit être ajouté à `SHELL` **et** `CACHE` incrémenté, sinon 404 hors ligne et clients bloqués sur l'ancienne version. C'est le piège n° 1 pour un agent externe — conséquence directe (assumée) du choix « zéro build ».
- **Résolution** : plan **P02** (vérificateur automatique en CI) ; règle rappelée dans `AGENTS.md`.

## 8. Ce qui est sain — à ne PAS « corriger »

Un agent externe ne doit pas « moderniser » ces choix : ils sont délibérés.

1. **Zéro dépendance runtime, zéro build, pas de `package.json`** : décision de conception (offline-first, auditable, pérenne), pas un oubli. Ne pas introduire npm/bundler/framework sans décision explicite du mainteneur.
2. **Moteur pur + déterminisme seedé** : `gouverner.js`, `assemblee.js`, `personas.js`, `mandat.js`, `fiches.js`, `data.js`, `affinity.js` ne touchent jamais DOM/store et sont testés sous Node. Le PRNG `mulberry32` et ses graines (`data.js:243` seed `20270415`, etc.) garantissent la reproductibilité — ne jamais changer graines ni ordre des tirages.
3. **Rendu `innerHTML` + re-rendu complet** : simple et suffisant à cette échelle ; ne pas remplacer par un framework ou un vDOM.
4. **Accessibilité** : point fort du projet (roving tabindex, `aria-*` fins, `prefers-reduced-motion`, gestion du focus après re-rendu, zéro violation axe-core) — toute modification d'UI doit la préserver.
5. **`RemoteAdapter` jamais instancié** (`js/adapter.js:38-58`) : code prospectif pour le branchement open-data (« phase 2 »), à conserver.
6. **`js/geo.js` généré** (`tools/build-geo.mjs`) : ne jamais éditer à la main, régénérer.
7. **Données démo étiquetées fictives** (`data.js:218`, hémicycle démo) : distinction volontaire réel/fictif, à maintenir.
8. **Invariants au chargement** : `throw` si `CIRCOS.length !== 577` (`data.js:132`), majorité absolue 289, aucune famille ≥ 289 à l'init — garde-fous voulus.

## 9. Table de correspondance constats → plans

| Constat | Sévérité | Plan | Phase |
|---|---|---|---|
| SEC-01 XSS défis | S1 | P01 | A0 |
| SEC-02 Reset destructif store | S1 | P03 | A0 |
| SEC-03 Async sans try/catch | S2 | P07 | A |
| PWA-01 Précache manuel | S2 | P02 (garde-fou) | A0 |
| STR-01 guilds.js fourre-tout | S3 | P04 | A |
| STR-02 Utilitaires purs dupliqués | S3 | P05 | A |
| STR-03 Duplication moteur | S3 | P06 | A |
| STR-04 Nav clavier dupliquée | S3 | P04 | A |
| STR-05 Fonctions longues | S3 | P10 | A |
| STR-08 Fin « censure » fantôme | S3 | P09 | A |
| PERF-01 Forces synchrones | S3 | P08 | A |
| TST-01 Modules UI non testés | S3 | P11 | A |
| TST-02 CI minimale | S3 | P02 | A0 |
| DOC-01 Schémas contradictoires | S3 | P12 | A |
| STR-06 État global épars | S4 | accepté (partiel : P04) | — |
| STR-07 Code mort / CSS manquantes | S4 | P09 | A |
| TST-03 Piège node --test | S4 | AGENTS.md | — |
| DOC-02 Analyse technique périmée | S4 | P12 | A |
