# P13 — 8-10 nouveaux événements de mandat

| | |
|---|---|
| **Phase** | B — Contenu (parallèle à la phase A dès A0 finie) |
| **Durée estimée** | 2-3 h |
| **Dépendances** | A0 (P01, P02, P03 fusionnés) |
| **Constats d'audit traités** | aucun (plan de contenu) |
| **Fichiers créés** | (aucun ; extension d'un fichier existant) |
| **Fichiers modifiés** | `js/mandat.js`, `tests/gouverner.test.mjs` (ou fichier de tests dédié aux événements) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. Il **enrichit le contenu** du mode Gouverner sans toucher au moteur.

Les événements de mandat (crises, arbitrages, opportunités présentés au joueur au fil des 60 mois de mandat) sont définis dans `js/mandat.js` (module **pur**). Ce plan en ajoute 8 à 10, cohérents avec les mécaniques existantes et **strictement neutres** politiquement (aucun parti/personnalité réel).

## 2. Objectif

Après ce plan, le mandat propose 8-10 événements de plus, chacun avec un ancrage pédagogique (institution/mécanique réelle) et des effets équilibrés validés par simulation. La variété des parties augmente sans casser l'équilibrage existant.

## 3. État actuel (ce que tu vas trouver)

- **`js/mandat.js`** : module pur listant les événements existants (lire la structure exacte : identifiant, libellé/description, conditions de déclenchement, choix proposés, effets sur les jauges/axes, éventuelle fiche « Le saviez-vous ? » associée). **Reproduire fidèlement ce schéma** pour les nouveaux événements — ne pas inventer un format parallèle.
- Les effets s'expriment sur les axes/jauges du mode Gouverner (voir `js/gouverner.js`, `ECONOMIE_GOUVERNER`, et `js/personas.js` pour les réactions). Les fiches pédagogiques sont dans `js/fiches.js`.
- Déterminisme : le tirage des événements est seedé (PRNG `mulberry32`). **Ne pas** changer les graines existantes ; ajouter des événements ne doit pas décaler l'ordre de tirage des parties déjà reproductibles au point de casser les tests — vérifier (voir garde-fous).

## 4. Étapes

1. Lire intégralement `js/mandat.js` et repérer le format exact d'un événement + comment la liste est consommée par le moteur (`gouverner.js`/`finDeTour`).
2. Concevoir 8-10 événements couvrant des thèmes institutionnels variés **non déjà traités** : navette parlementaire, motion de censure, 49.3, référendum art. 11, dissolution, cohabitation, Conseil constitutionnel, budget/LFI, Sénat, collectivités, Europe, etc. Chacun :
   - ancré sur une **mécanique/institution réelle** (valeur pédagogique), idéalement relié à une fiche existante de `js/fiches.js` (ou en proposer une nouvelle **seulement** si P14 ne la couvre pas — sinon laisser à P14).
   - **neutre** : familles politiques fictives uniquement, aucun nom réel (AGENTS.md règle 9 ; règles détaillées en tête de `js/fiches.js`).
   - avec des choix aux effets **contrastés** mais bornés (rester dans les ordres de grandeur des événements existants).
3. Insérer les événements dans la structure existante de `js/mandat.js`.
4. Ajouter/étendre les **tests de forme** (`node:test`, module pur → sans shims) : chaque événement a un id unique, des effets dans les bornes attendues, des choix bien formés, une éventuelle fiche référencée qui **existe** dans `js/fiches.js`. Réutiliser le style des tests existants de `mandat`/`gouverner`.
5. **Valider par simulation** : `node tools/simulate-gouverner.mjs` doit tourner sans erreur et sans faire dériver les cibles d'équilibrage (P16 fera l'équilibrage fin ; ici, ne pas casser l'existant).
6. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Neutralité politique (règle 9)** : relire chaque texte. Aucun parti, aucune personnalité, aucun slogan réel. En cas de doute, reformuler en termes de familles fictives et de mécaniques institutionnelles.
- **Déterminisme (règle 5)** : ne pas modifier les graines ni la logique de tirage. Si l'ajout d'événements décale l'ordre et casse un test d'équilibrage reproductible, **préférer** ajouter les événements de façon à ne pas perturber les scénarios de test existants (ex. en fin de liste), et documenter.
- Rester dans `js/mandat.js` : ne pas modifier le moteur (`gouverner.js`) — c'est du contenu, pas de la mécanique.
- Modules purs : `mandat.js` reste pur (vérificateur P02).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (+ tests de forme des nouveaux événements).
- [ ] `node tools/simulate-gouverner.mjs` : sans erreur, cibles d'équilibrage tenues.
- [ ] `node tools/verifier-purete.mjs` : vert.
- [ ] 8 à 10 nouveaux événements ajoutés, chacun avec id unique (revue) ; toute fiche référencée existe dans `js/fiches.js`.
- [ ] Relecture neutralité : aucun nom réel (grep manuel sur les nouveaux textes).
- [ ] `git status` : seuls `js/mandat.js`, le fichier de tests + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- L'équilibrage chiffré fin sur ≥ 1 000 mandats → plan **P16** (dépend de ce plan).
- Les nouvelles fiches pédagogiques → plan **P14** (parallèle).
- Modifier le moteur ou les personas.

## 8. Finalisation

```
feat(contenu) : ajoute 8-10 evenements de mandat neutres et pedagogiques (P13)
```
