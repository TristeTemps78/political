# Roadmap — PolitiQuest 2027

> Établie le 19 juillet 2026 au commit `48d276c`, à partir de `docs/AUDIT.md`.
> Périmètre choisi : **consolidation/qualité**, **contenu de jeu**, **nouvelles fonctionnalités**.

## 0. Comment utiliser cette roadmap (agent externe)

1. Lire `AGENTS.md` (racine) — conventions non négociables.
2. Choisir un plan dans `docs/plans/` dont **toutes les dépendances sont fusionnées** (tableau §8).
3. Exécuter le plan tel quel : 1 plan = 1 branche = 1 commit ; ne toucher que les fichiers listés par le plan.
4. Valider les critères d'acceptation (commandes copiables), ajouter l'entrée `01_memory_lessons.md`, cocher le suivi (§8 et `docs/plans/README.md`).

## 1. Vue d'ensemble

```
Phase A0 — Socle (P01, P02, P03 : parallèles entre eux)
   │
   ├────────────► Phase B — Contenu (P13, P14, P15*, P16)     * P15 attend P05
   │
   ▼
Phase A — Consolidation
   vague 1 : P04, P05, P06, P07 (P07 après P04) + P12 (indépendant)
   vague 2 : P08, P09, P10, P11
   │
   ▼
Phase C — Fonctionnalités (P17, P18 parallèles → P19, P20)
```

Principe : la **sécurité et les garde-fous outillés d'abord** (A0) — chaque plan ultérieur exécuté par un agent externe bénéficie du filet. Le **contenu (B) ne dépend pas de la consolidation (A)** : fichiers quasi disjoints, les deux phases peuvent avancer en parallèle dès A0 finie.

## 2. Phase A0 — Socle (à faire en premier)

| Plan | Titre | Durée | Dép. |
|---|---|---|---|
| P01 | Corriger la faille XSS des défis partagés (SEC-01) | 1-2 h | — |
| P02 | Garde-fous outillés en CI : vérificateur SW + pureté (PWA-01, TST-02) | 2 h | — |
| P03 | Sauvegarde de secours du store avant réinitialisation (SEC-02) | 1-2 h | — |

Les trois sont parallélisables (fichiers disjoints, sauf collision triviale sur `sw.js`/`tests.yml` — voir §6).
**Fin de phase** : plus aucun constat S1 ouvert ; `verifier-sw.mjs` et `verifier-purete.mjs` verts en CI.

## 3. Phase A — Consolidation

**Vague 1** (parallèle, après A0) :

| Plan | Titre | Durée | Dép. |
|---|---|---|---|
| P04 | Extraire `js/ui-utils.js` (toast, reduced-motion, roving-tabindex) (STR-01, STR-04) | 2-3 h | P02 |
| P05 | Factoriser `js/outils.js` : cosinus, FNV-1a, index FAMILLES (STR-02) | 2-3 h | P02 |
| P06 | Dédupliquer le moteur : `js/sieges.js` (journaliser, renormalisation 577) (STR-03) | 2-3 h | P02 |
| P07 | Gestion d'erreurs globale + adaptateur (SEC-03) | 1-2 h | P04 |
| P12 | Remettre à jour `docs_architecture` (DOC-01, DOC-02) | 1 h | — |

**Vague 2** (après la vague 1) :

| Plan | Titre | Durée | Dép. |
|---|---|---|---|
| P08 | Simulation de forces non bloquante dans `graph.js` (PERF-01) | 2 h | P07 |
| P09 | Nettoyage : code mort, CSS manquantes, fin « censure » réelle (STR-07, STR-08) | 2 h | P06 |
| P10 | Découper `finDeTour` / `tickIA` / `renderMap` (STR-05) | 2-3 h | P04, P06, P09 |
| P11 | Tests de fumée des modules UI (TST-01) | 2-3 h | vague 1 |

**Fin de phase** : tous les constats S2/S3 de l'audit fermés (hors « acceptés » §9 de l'audit) ; aucune nouvelle duplication ; `node tools/simulate-gouverner.mjs` sans régression.

## 4. Phase B — Contenu (parallèle à la phase A dès A0 finie)

| Plan | Titre | Durée | Dép. |
|---|---|---|---|
| P13 | 8-10 nouveaux événements de mandat (`mandat.js`), validés par simulation | 2-3 h | A0 |
| P14 | 6-8 nouvelles fiches pédagogiques (neutralité stricte) | 1-2 h | A0 |
| P15 | 3-4 nouveaux personas (zones vides de l'espace des axes) | 1-2 h | P05 |
| P16 | Campagne d'équilibrage Gouverner : cibles chiffrées sur ≥ 1 000 mandats | 2-3 h | P13 |

**Fin de phase** : neutralité politique vérifiée (règles de `fiches.js`) ; équilibrage validé par simulation ≥ 500 mandats ; tests de forme sur tout nouveau contenu.

## 5. Phase C — Fonctionnalités (après la phase A)

| Plan | Titre | Durée | Dép. |
|---|---|---|---|
| P17 | Scénarios de départ alternatifs du mandat (majorité courte, coalition fragile, cohabitation) | 2-3 h | P06, P09 |
| P18 | Bilan de fin de mandat (statistiques moteur + écran accessible) | 2-3 h | P06, P09 |
| P19 | Sauvegardes multiples (schéma v4, 3 emplacements, migration testée) | 3 h | P03, P12 |
| P20 | Défi de mandat partagé (`?mandat=`, rejouer la même partie, comparer les bilans) | 3 h | P01, P17, P18 |

**Fin de phase** : audit a11y manuel zéro violation sur les nouveaux écrans ; toute migration de schéma testée v(n)→v(n+1).

En réserve (pas de plan) : mode « historien » — rejouer le journal d'un mandat tour par tour (> 3 h, à découper si retenu).

## 6. Collisions de fichiers connues

- **`sw.js`** : touché par P01, P04, P05, P06, P17, P20 (ajout à `SHELL` + bump `CACHE`). Conflit trivial — résolution : union des entrées, version la plus haute + 1 (règle dans `AGENTS.md`).
- **`.github/workflows/tests.yml`** : P02 (seul) — pas de conflit si P02 passe en premier.
- **`js/guilds.js`** : P04 → P05 → P10, dans cet ordre.
- **`js/gouverner.js`** : P06 → P09 → P10 → (P17, P18), dans cet ordre.
- **`js/graph.js`** : P07 → P08, dans cet ordre.
- **`js/duels.js`** : P01 → P05 → P20, dans cet ordre.
- **`js/store.js`** : P03 → P19.

## 7. Definition of Done (commune à tous les plans)

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant le plan (93 au départ).
- [ ] `node tools/simulate.mjs 200` : sans erreur.
- [ ] `node tools/verifier-sw.mjs` et `node tools/verifier-purete.mjs` : verts (dès P02 fusionné).
- [ ] `git status` : aucun fichier modifié hors des listes « créés/modifiés » du plan.
- [ ] Entrée datée ajoutée à `docs_architecture/01_memory_lessons.md`.
- [ ] Commit unique conventionnel en français, référençant le plan (ex. `(P05)`).

## 8. Suivi

| Plan | État | Commit | Date |
|---|---|---|---|
| P01 | à faire | | |
| P02 | à faire | | |
| P03 | à faire | | |
| P04 | à faire | | |
| P05 | à faire | | |
| P06 | à faire | | |
| P07 | à faire | | |
| P08 | à faire | | |
| P09 | à faire | | |
| P10 | à faire | | |
| P11 | à faire | | |
| P12 | à faire | | |
| P13 | à faire | | |
| P14 | à faire | | |
| P15 | à faire | | |
| P16 | à faire | | |
| P17 | à faire | | |
| P18 | à faire | | |
| P19 | à faire | | |
| P20 | à faire | | |

## 9. Hors périmètre (assumé, ne pas entreprendre sans décision du mainteneur)

- Publication / déploiement / hébergement (GitHub Pages, icônes PWA finales, Lighthouse).
- Backend multijoueur (`RemoteAdapter` reste prospectif).
- `package.json` / dépendances runtime / bundler / framework.
- Réécriture du rendu (`innerHTML` + re-rendu complet est le pattern retenu).
