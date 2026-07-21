# P18 — Bilan de fin de mandat (statistiques moteur + écran accessible)

| | |
|---|---|
| **Phase** | C — Fonctionnalités (après la phase A) |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P06, P09 (moteur dédupliqué, fins de mandat correctes) |
| **Constats d'audit traités** | aucun (nouvelle fonctionnalité) |
| **Fichiers créés** | éventuellement `js/bilan.js`, `tests/bilan.test.mjs` |
| **Fichiers modifiés** | `js/gouverner.js` (agrégation de stats), `js/gouverner-ui.js` (écran de verdict/bilan), `css/style.css`, `sw.js` (si module ajouté) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P06 et P09**.

À la fin d'un mandat (réélu, battu, censuré, démission), le jeu affiche un verdict. Ce plan enrichit cette fin par un **bilan** : statistiques du mandat écoulé (réformes votées, 49.3 engagés, censures, popularité, participation, verdict des scrutins intermédiaires) présentées dans un écran accessible et pédagogique.

## 2. Objectif

Après ce plan, la fin d'un mandat affiche un bilan chiffré et lisible, calculé par une fonction **pure** à partir du journal/état du mandat. L'écran est accessible (clavier, ARIA, focus, contrastes light/dark) et n'expose aucune donnée hors du store local (invariant n° 1).

## 3. État actuel (ce que tu vas trouver)

- **`js/gouverner.js`** : l'état du mandat `g` accumule déjà des données au fil des tours — `journal` (via `journaliser`), `jauges.popularite`, `censures`, résultats des élections intermédiaires (européennes/sénatoriales/municipales), `fin` (`{ type, tour, verdict? }`). Repérer précisément quels compteurs existent déjà et lesquels manquent pour un bilan riche.
- **`js/gouverner-ui.js`** : `LIBELLES_FIN` (l. 100-104) + rendu du verdict de fin (`renderFin`/équivalent, autour de `g.fin`). C'est le point d'insertion du bilan.
- L'écran de verdict présidentiel 2032 et les écrans de mandat sont déjà audités a11y (zéro violation) — le nouvel écran doit tenir ce standard.

## 4. Étapes

1. Recenser les statistiques disponibles dans `g` en fin de mandat. Si des compteurs utiles manquent (ex. nombre de réformes adoptées vs rejetées, nombre de 49.3, participation moyenne aux scrutins), les **accumuler** dans le moteur au fil des tours — de façon **pure** et déterministe, sans changer les tirages ni l'équilibrage (ajouter des compteurs, ne pas modifier la logique existante).
2. Créer une fonction **pure** `calculerBilan(g)` (dans `js/bilan.js` ou une section de `gouverner.js`) : renvoie un objet de statistiques prêt à afficher (aucun DOM). Testable sous Node.
3. UI (`gouverner-ui.js`) : afficher le bilan à la fin du mandat, après/avec le libellé de `LIBELLES_FIN`. Présentation claire (chiffres clés, éventuellement une petite dataviz sobre en SVG inline — respecter le design system et l'a11y : `role`, `aria-label`, texte alternatif). Bouton pour relancer/retourner à la Boussole.
4. CSS : styles du bilan, cohérents avec le design system, testés **clair et sombre**.
5. Si `js/bilan.js` est créé : `SHELL` + bump `CACHE` + `MODULES_PURS` (il est pur).
6. Tests (`tests/bilan.test.mjs`) : `calculerBilan` sur un `g` de fin connu produit les bons agrégats ; robustesse sur un mandat interrompu tôt (censure au 1er tour) ; les compteurs ajoutés au moteur n'altèrent pas l'équilibrage (vérifier via simulation).
7. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Invariant n° 1** : le bilan lit le store local, ne transmet **rien** au réseau.
- **Accessibilité (règle 8)** : nouvel écran = même exigence (zéro violation axe-core) — clavier, focus après rendu, ARIA sur toute dataviz SVG, `prefers-reduced-motion`. Audit a11y manuel recommandé.
- **Déterminisme/équilibrage** : les compteurs ajoutés sont passifs (observation), ils ne doivent modifier ni les tirages ni les cibles d'équilibrage. Vérifier par simulation avant/après.
- Dataviz : si graphique, suivre le design system existant (pas de dépendance, SVG inline, contrastes AA).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (+ tests bilan).
- [ ] `node tools/simulate-gouverner.mjs` : cibles d'équilibrage **inchangées** (les compteurs sont passifs).
- [ ] `node tools/verifier-sw.mjs` / `verifier-purete.mjs` : verts.
- [ ] Preuve manuelle : terminer un mandat (chaque type de fin) → le bilan s'affiche, chiffres cohérents, navigable au clavier, correct en clair et sombre.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Les scénarios de départ → plan **P17** (parallèle).
- Le partage/rejeu de mandat → plan **P20** (qui réutilisera `calculerBilan`).
- Sauvegarder plusieurs bilans → plan **P19** (sauvegardes multiples).

## 8. Finalisation

```
feat(gouverner) : bilan de fin de mandat (stats pures + ecran accessible) (P18)
```
