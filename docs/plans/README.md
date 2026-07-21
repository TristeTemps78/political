# Plans d'exécution — index

Chaque fichier `P##-*.md` est une tâche **autonome** (1 à 3 h d'agent) : tout le nécessaire est dans le plan + `AGENTS.md` (racine). Ordre et dépendances : `docs/ROADMAP.md`. Constats d'origine : `docs/AUDIT.md`.

**Règles** : ne prendre un plan que si ses dépendances sont fusionnées ; ne toucher que les fichiers listés ; 1 plan = 1 branche = 1 commit ; cocher ici et dans `docs/ROADMAP.md` §8 une fois terminé.

## Phase A0 — Socle (en premier ; parallèles entre eux)

- [ ] [P01 — Corriger la faille XSS des défis partagés](P01-xss-defis-echappement.md)
- [ ] [P02 — Garde-fous outillés en CI (SW + pureté)](P02-garde-fous-ci-sw-purete.md)
- [ ] [P03 — Sauvegarde de secours du store](P03-secours-store.md)

## Phase A — Consolidation

Vague 1 (parallèles, après A0) :
- [ ] [P04 — Extraire js/ui-utils.js](P04-extraire-ui-utils.md)
- [ ] [P05 — Factoriser js/outils.js (cosinus, hash, index)](P05-outils-purs-factorisation.md)
- [ ] [P06 — Dédupliquer le moteur : js/sieges.js](P06-sieges-dedup-moteur.md)
- [ ] [P07 — Gestion d'erreurs globale (après P04)](P07-gestion-erreurs.md)
- [ ] [P12 — Mettre à jour docs_architecture](P12-maj-docs-architecture.md) *(indépendant, à tout moment)*

Vague 2 (après la vague 1) :
- [ ] [P08 — graph.js non bloquant](P08-graph-non-bloquant.md)
- [ ] [P09 — Nettoyage + fin « censure » réelle](P09-nettoyage-fin-censure.md)
- [ ] [P10 — Découper les fonctions longues](P10-decouper-fonctions-longues.md)
- [ ] [P11 — Tests de fumée des modules UI](P11-tests-fumee-ui.md)

## Phase B — Contenu (parallèle à la phase A dès A0 finie)

- [ ] [P13 — Nouveaux événements de mandat](P13-nouveaux-evenements-mandat.md)
- [ ] [P14 — Nouvelles fiches pédagogiques](P14-nouvelles-fiches.md)
- [ ] [P15 — Nouveaux personas (après P05)](P15-nouveaux-personas.md)
- [ ] [P16 — Campagne d'équilibrage Gouverner (après P13)](P16-equilibrage-gouverner.md)

## Phase C — Fonctionnalités (après la phase A)

- [ ] [P17 — Scénarios de départ alternatifs](P17-scenarios-depart.md)
- [ ] [P18 — Bilan de fin de mandat](P18-bilan-fin-mandat.md)
- [ ] [P19 — Sauvegardes multiples](P19-sauvegardes-multiples.md)
- [ ] [P20 — Défi de mandat partagé](P20-defi-mandat-partage.md)
