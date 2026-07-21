# P12 — Remettre à jour `docs_architecture` (schémas et analyse technique)

| | |
|---|---|
| **Phase** | A — Consolidation (indépendant, à tout moment après A0) |
| **Durée estimée** | 1 h |
| **Dépendances** | aucune |
| **Constats d'audit traités** | DOC-01, DOC-02 (docs/AUDIT.md §6) |
| **Fichiers créés** | (aucun) |
| **Fichiers modifiés** | `docs_architecture/00_analyse_technique.md`, `docs_architecture/02_data_schemas.md` |
| **Fichiers interdits** | `docs_architecture/01_memory_lessons.md` (append-only : on **ajoute** l'entrée de fin, on ne réécrit jamais l'historique), tout fichier de code |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est **purement documentaire** — aucun code, aucun test modifié.

Deux docs d'architecture sont périmées et **trompeuses pour un agent** qui reprend le code :
- `02_data_schemas.md` : la §1 décrit encore `SCHEMA_VERSION = 1` alors que la §6 documente correctement la v3 → contradiction interne.
- `00_analyse_technique.md` : arbre d'architecture partiel, « 5 onglets » (6 réels), « équilibrage par simulation de 10 000 parties » (réel : 200 en CI, 1 000 par défaut).

## 2. Objectif

Après ce plan, `00` et `02` décrivent l'état **réel** du code au commit courant, sans contradiction interne. Un agent qui les lit ne sera pas induit en erreur sur le schéma du store, le nombre d'onglets/modules, ou les chiffres d'équilibrage.

## 3. État actuel (ce que tu vas trouver)

- **`02_data_schemas.md:5`** : « JSON versionné (`SCHEMA_VERSION = 1`) » — **faux**, c'est 3. La §1 (structure du store) omet `joueur.duels`, `monde.censure`, `monde.gouverner`. La **§6** (l. 163-164) est correcte : `SCHEMA_VERSION = 3`, migrations v1→v2 (ajoute `joueur.duels`, `monde.censure`), v2→v3 (ajoute `monde.gouverner`).
- **`00_analyse_technique.md:42`** : « Coquille applicative (**5 onglets**) » — réel : **6** (Boussole/Quiz, Carte, Assemblée/Hémicycle, Graphe, Prédictions/Duels, Gouverner — vérifier la liste exacte dans `index.html`/`app.js`). L'arbre (§2) liste ~13 modules sur **21** réels (`ls js/`).
- **`00_analyse_technique.md:71`** : « équilibrage par simulation de **10 000 parties** » — réel : `simulate.mjs 200` en CI, 1 000 par défaut, 500 dans le guide de test.

## 4. Étapes

1. **`02_data_schemas.md`** :
   - Corriger la §1 : `SCHEMA_VERSION = 3` et décrire la structure **réelle** du store telle que `defaults()` la produit (`js/store.js`) — inclure `joueur.duels`, `monde.censure`, `monde.gouverner`. Source de vérité = le code, pas l'ancienne doc.
   - S'assurer que §1 et §6 concordent (mêmes champs, même version). Ne pas dupliquer : §1 = structure, §6 = migrations.
   - Vérifier la section fin de mandat (§6) après P09 : si P09 a rendu `'censure'` réellement produite, la doc doit refléter la sémantique finale (censure = renversé par une motion ; démission = usure). Si P09 n'est pas encore fusionné, décrire l'état courant et noter la nuance.
2. **`00_analyse_technique.md`** :
   - Corriger « 5 onglets » → nombre réel (vérifier dans `index.html`).
   - Compléter l'arbre d'architecture (§2) : lister les **21** modules `js/` réels (les nommer, une ligne chacun) ou renvoyer explicitement à `ls js/` en indiquant que la liste fait foi.
   - Corriger « 10 000 parties » → chiffres réels (200 CI / 1 000 défaut / 500 guide). Reformuler pour ne pas re-périmer : « simulation d'équilibrage (200 parties en CI, jusqu'à 1 000 en local) ».
3. **Ne pas** réécrire `01_memory_lessons.md` (append-only) : seulement ajouter l'entrée datée de fin de plan. Ses compteurs de tests datés (17, 25…) restent tels quels — c'est un journal historique, pas une doc de référence.
4. Cocher ce plan dans `docs/plans/README.md` et `docs/ROADMAP.md` §8.

## 5. Garde-fous spécifiques

- **Source de vérité = le code**, pas les docs entre elles. Vérifier chaque chiffre par `grep`/`ls` avant de l'écrire.
- Ne rien inventer sur des fonctionnalités futures : décrire l'existant.
- Français, ton et format cohérents avec le reste de `docs_architecture/`.
- Ne toucher à aucun fichier de code ni de test.

## 6. Critères d'acceptation

- [ ] `grep -n "SCHEMA_VERSION = 1" docs_architecture/02_data_schemas.md` : **aucun** résultat.
- [ ] `grep -n "5 onglets\|10 000\|10000" docs_architecture/00_analyse_technique.md` : **aucun** résultat.
- [ ] `02_data_schemas.md` §1 mentionne `joueur.duels`, `monde.censure`, `monde.gouverner`.
- [ ] `node --test tests/*.test.mjs` : toujours 93+ verts (aucun code touché — sanity check).
- [ ] `git status` : seuls `docs_architecture/00_*.md`, `docs_architecture/02_*.md`, `01_memory_lessons.md` (entrée ajoutée) + `docs/plans/README.md`, `docs/ROADMAP.md`.

## 7. Hors périmètre (ne PAS faire)

- Réécrire `01_memory_lessons.md` ou « corriger » ses compteurs datés.
- Documenter des fonctionnalités non encore implémentées (P13-P20).
- Toute modification de code.

## 8. Finalisation

```
docs(architecture) : aligne 00 et 02 sur le schema v3 reel et les vrais chiffres (P12)
```
