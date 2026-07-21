# Conventions pour agents — PolitiQuest 2027

Jeu civique éducatif sur les élections françaises 2027. **PWA statique en vanilla JS, ES modules natifs, zéro dépendance, zéro build, zéro `package.json`** — c'est un choix de conception assumé, ne pas introduire npm, bundler ou framework sans décision explicite du mainteneur.

**Boussole documentaire** : `docs/AUDIT.md` (constats) → `docs/ROADMAP.md` (phases, dépendances) → `docs/plans/P##-*.md` (travail à exécuter, un plan = une tâche autonome).

## Règles non négociables

1. **Français partout** : identifiants métier, commentaires, messages UI, commits, docs.
2. **Modules PURS** (jamais de DOM, `store`, `localStorage` ; testables sous Node) :
   `js/gouverner.js`, `js/assemblee.js`, `js/personas.js`, `js/mandat.js`, `js/fiches.js`, `js/data.js`, `js/affinity.js` — et tout nouveau module désigné pur par un plan (`outils.js`, `sieges.js`, `echappement.js`…).
3. **`js/geo.js` est GÉNÉRÉ** — ne jamais l'éditer à la main ; régénérer via `node tools/build-geo.mjs`.
4. **⚠ Piège n° 1 — service worker** : tout fichier ajouté ou renommé sous `js/` ou `css/` doit être ajouté à la liste `SHELL` de `sw.js` **et** la constante `CACHE` incrémentée (`politiquest-vN` → `vN+1`), sinon 404 hors ligne. En cas de conflit git sur `sw.js` : union des entrées `SHELL` + numéro de version le plus élevé + 1.
5. **Déterminisme** : PRNG `mulberry32` seedé. Ne jamais changer les graines existantes ni l'ordre des tirages aléatoires (les tests d'équilibrage et les parties reproductibles en dépendent).
6. **Invariants** : 577 circonscriptions (`throw` au chargement sinon), majorité absolue = 289, aucune famille ≥ 289 sièges à l'initialisation d'un mandat.
7. **Vie privée (invariant n° 1 du projet)** : le contenu du store local (réponses, axes, affinités) ne doit JAMAIS être transmis sur le réseau.
8. **Accessibilité** : navigation clavier complète (roving tabindex sur les grilles), `aria-*` corrects, respect de `prefers-reduced-motion`, gestion du focus après re-rendu. Cible : zéro violation axe-core.
9. **Neutralité politique** : aucun parti ni personnalité réels nommés dans le contenu de jeu ; familles politiques fictives ; règles détaillées en tête de `js/fiches.js`.
10. **Jamais moins de tests** : le nombre de tests ne doit jamais diminuer.

## Commandes de vérification

```
node --test tests/*.test.mjs      # suite complète (le glob est OBLIGATOIRE : `node --test tests/` échoue)
node tools/simulate.mjs 200       # équilibrage Conquête
node tools/simulate-gouverner.mjs # équilibrage du mandat Gouverner
node tools/verifier-sw.mjs        # complétude du précache SW (disponible après le plan P02)
node tools/verifier-purete.mjs    # pureté des modules moteur (disponible après le plan P02)
```

Audit a11y manuel (facultatif, nécessite `npm install playwright-core axe-core` hors dépôt + serveur statique) : `node tools/a11y-audit.mjs`.

## Rituels

- **`docs_architecture/01_memory_lessons.md` est un journal append-only** : ajouter une entrée datée à la fin de chaque plan (décisions, pièges rencontrés) ; ne jamais réécrire les entrées passées.
- **1 plan = 1 branche = 1 commit** conventionnel en français (ex. `refactor(outils) : factorise le cosinus (P05)`), après validation de tous les critères d'acceptation du plan.
- Ne jamais entamer un plan dont les dépendances (`docs/ROADMAP.md`) ne sont pas fusionnées.
- Cocher le plan terminé dans le tableau de suivi de `docs/plans/README.md`.
