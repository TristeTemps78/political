# P17 — Scénarios de départ alternatifs du mandat

| | |
|---|---|
| **Phase** | C — Fonctionnalités (après la phase A) |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P06, P09 (moteur dédupliqué via `sieges.js`, fins de mandat corrigées) |
| **Constats d'audit traités** | aucun (nouvelle fonctionnalité) |
| **Fichiers créés** | éventuellement `js/scenarios.js`, `tests/scenarios.test.mjs` |
| **Fichiers modifiés** | `js/gouverner.js`, `js/gouverner-ui.js` (choix de départ), `sw.js` (si module ajouté) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P06 et P09**.

Aujourd'hui, un mandat démarre dans une configuration unique (majorité posée par `assembleeParDefaut`, aucune famille ≥ 289). Ce plan ajoute des **scénarios de départ** offrant des situations institutionnelles réalistes et contrastées : **majorité courte**, **coalition fragile**, **cohabitation**. Chacun change les conditions initiales (répartition des sièges, ligne du gouvernement) et donc la difficulté et la valeur pédagogique.

## 2. Objectif

Après ce plan, au lancement d'un mandat, le joueur peut choisir (ou tirer) un scénario de départ. Chaque scénario respecte les invariants (Σ 577, aucune famille ≥ 289 à l'init) et produit une partie jouable et équilibrée. Le scénario par défaut reproduit le comportement actuel.

## 3. État actuel (ce que tu vas trouver)

- **`js/gouverner.js`** : `creerPartie(...)` initialise le mandat ; `assembleeParDefaut(...)` répartit les 577 sièges (après P06, via `renormaliser577` de `js/sieges.js`). L'invariant « aucune famille ≥ 289 à l'init » est appliqué là.
- **`js/gouverner-ui.js`** : écran de lancement du mandat (choix de la famille du gouvernement, héritage — lignes autour de `renderLancement`/`LIBELLES_FIN`). C'est ici qu'un sélecteur de scénario s'insère.
- Après P09, les fins `'censure'`/`'demission'` sont distinctes — les scénarios plus fragiles (coalition, majorité courte) rendront ces fins plus probables : c'est voulu, mais à équilibrer.

## 4. Étapes

1. Concevoir 3 scénarios (+ le défaut), chacun paramétrant l'état initial :
   - **Majorité courte** : le camp du gouvernement dépasse de peu la majorité relative, marge étroite → 49.3 et négociations fréquents.
   - **Coalition fragile** : plusieurs familles alliées, aucune dominante → risque de rupture, censures plus probables.
   - **Cohabitation** : gouvernement d'une famille, Assemblée dominée par une famille opposée mais < 289 → blocages, navette tendue.
   Formaliser chacun comme un jeu de paramètres (répartition cible des sièges par famille, ligne du gouvernement, éventuels modificateurs d'humeur initiale), **respectant** Σ 577 et aucune famille ≥ 289.
2. Extraire ces scénarios dans `js/scenarios.js` (module **pur** de préférence : renvoie des configurations, ne mute rien) ; `creerPartie` accepte un scénario en paramètre et l'applique via `renormaliser577` (`sieges.js`).
3. UI (`gouverner-ui.js`) : ajouter un sélecteur de scénario accessible (clavier, `aria-*`) à l'écran de lancement, avec une courte description pédagogique de chaque scénario. Défaut = comportement actuel.
4. Si `js/scenarios.js` est créé : l'ajouter à `SHELL` + bump `CACHE`, et à `MODULES_PURS` s'il est pur.
5. Tests (`tests/scenarios.test.mjs`) : chaque scénario respecte Σ 577 et aucune famille ≥ 289 ; le scénario par défaut produit **exactement** l'état actuel (non-régression) ; une partie lancée sur chaque scénario se déroule sans erreur sur quelques tours simulés.
6. **Équilibrage** : `node tools/simulate-gouverner.mjs` sur chaque scénario — vérifier qu'aucun n'est injouable (réélection 0 % ou 100 %). Documenter les fréquences dans le commit ou `03_game_loop.md` si des constantes bougent (rester dans le périmètre : constantes seulement).
7. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Invariants (règle 6)** : Σ 577, majorité 289, aucune famille ≥ 289 à l'init — pour **tous** les scénarios. Le `throw` de chargement doit rester satisfait.
- **Déterminisme (règle 5)** : le scénario par défaut ne doit pas décaler les tirages des parties existantes (non-régression stricte). Les nouveaux scénarios sont seedés proprement.
- **Neutralité (règle 9)** : familles fictives ; les libellés de scénario décrivent des situations institutionnelles, pas des configurations partisanes réelles.
- **Accessibilité** : le sélecteur de scénario au clavier + ARIA (règle 8).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (+ tests scénarios).
- [ ] Le scénario par défaut produit un état initial **identique** à avant le plan (test de non-régression).
- [ ] `node tools/simulate-gouverner.mjs` : chaque scénario jouable, cibles globales non cassées.
- [ ] `node tools/verifier-sw.mjs` / `verifier-purete.mjs` : verts (avec `scenarios` si extrait).
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Le bilan de fin de mandat → plan **P18** (parallèle, même vague).
- Le partage de mandat rejouable → plan **P20** (dépend de ce plan).
- De nouvelles mécaniques institutionnelles (au-delà de la configuration initiale).

## 8. Finalisation

```
feat(gouverner) : scenarios de depart (majorite courte, coalition fragile, cohabitation) (P17)
```
