# P10 — Découper `finDeTour` / `tickIA` / `renderMap`

| | |
|---|---|
| **Phase** | A — Consolidation, vague 2 |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P04, P06, P09 (UI utils extraits, moteur dédupliqué, fins de mandat corrigées) |
| **Constats d'audit traités** | STR-05 (docs/AUDIT.md §3) |
| **Fichiers créés** | (aucun) |
| **Fichiers modifiés** | `js/gouverner.js`, `js/guilds.js`, `js/map.js` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P04, P06, P09** (pour ne pas entrer en collision sur `gouverner.js`/`guilds.js`/`map.js`).

Trois fonctions sont trop longues pour être relues d'un coup :
- `finDeTour` (~100 lignes, 7 étapes numérotées en commentaires) dans `js/gouverner.js`.
- `tickIA` (~80 lignes) dans `js/guilds.js`, mêlant IA rivale et cycle de vie de la censure.
- `renderMap` (~90 lignes) dans `js/map.js`.

C'est un plan de **lisibilité** : découper en fonctions nommées **sans changer le comportement** (refactor pur, iso-fonctionnel).

## 2. Objectif

Après ce plan, chacune des trois fonctions est réduite à un orchestrateur court appelant des sous-fonctions au nom explicite. Aucun changement de comportement observable : mêmes sorties moteur, mêmes rendus, mêmes tirages.

## 3. État actuel (ce que tu vas trouver)

- **`js/gouverner.js:217-317`** : `export function finDeTour(g, decision = DECISION_VIDE)` — 7 étapes commentées (`// 1.` … `// 7.`), incluant : application des décisions, mise à jour des jauges/humeurs (l. 270), élections intermédiaires (européennes l. 328, sénatoriales l. 352, municipales l. 376), opposition/censure spontanée (l. 284-292), verdict. Les commentaires numérotés balisent déjà les futures sous-fonctions.
- **`js/guilds.js`** : `tickIA` (~l. 154-233) — IA rivale (investissements) + cycle de vie de la motion de censure (déclenchement, vote, résolution).
- **`js/map.js:31-118`** : `renderMap` — construction du SVG départemental, légende, interactions, injection.

## 4. Étapes

1. **`finDeTour`** (`gouverner.js`) : extraire chaque étape numérotée en fonction interne pure recevant `g` (et éventuellement `rng`/`decision`) et mutant/retournant l'état — ex. `appliquerDecision(g, decision)`, `majJauges(g)`, `el900sIntermediaires(g)` (ou une par scrutin : `europeennes(g)`, `senatoriales(g)`, `municipales(g)`), `oppositionEtCensure(g)`, `calculerVerdict(g)`. `finDeTour` devient l'orchestrateur qui les appelle **dans le même ordre**. **Préserver l'ordre exact des appels au RNG** (déterminisme).
2. **`tickIA`** (`guilds.js`) : séparer nettement `piloterIARivale(...)` et `cycleCensure(...)` (déclenchement / vote / résolution). `tickIA` orchestre. Attention à l'état module de la censure — ne pas changer sa sémantique.
3. **`renderMap`** (`map.js`) : extraire `construireSVG(...)`, `construireLegende(...)`, `brancherInteractions(...)` (ou découpage équivalent). Utiliser le roving-tabindex de `ui-utils.js` déjà en place (P04). Le rendu final doit être identique (même DOM, mêmes classes, même a11y).
4. Ne créer **aucun** nouveau fichier ni toucher `sw.js` : ce sont des découpages internes.
5. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Refactor iso-fonctionnel strict** : aucune sortie ne doit changer. Le meilleur juge est la non-régression des tests + simulations (voir critères).
- **Déterminisme (règle 5)** : l'ordre des tirages aléatoires dans `finDeTour`/`tickIA` doit être **rigoureusement** préservé — extraire du code, pas le réordonner. Toute inversion casse les parties reproductibles et l'équilibrage.
- **Accessibilité** : `renderMap` doit produire exactement le même DOM accessible (roving tabindex, `aria-*`, focus). Audit a11y manuel recommandé si disponible.
- Ne pas profiter du découpage pour « améliorer » la logique (hors périmètre) : correction du comportement = autres plans.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests **inchangé ou supérieur** (les tests existants passent sans modification).
- [ ] `node tools/simulate.mjs 200` **et** `node tools/simulate-gouverner.mjs` : sorties **identiques** à avant le plan (preuve d'iso-fonctionnalité — comparer).
- [ ] `node tools/verifier-purete.mjs` : vert (`gouverner` reste pur).
- [ ] Revue : `finDeTour`, `tickIA`, `renderMap` font chacune < ~30 lignes d'orchestration.
- [ ] `git status` : seuls `js/gouverner.js`, `js/guilds.js`, `js/map.js` + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Modifier la mécanique de censure, d'élections ou de rendu (seule la **structure** change).
- Extraire de nouveaux modules (ce plan reste intra-fichier ; les extractions de modules sont P04/P05/P06).

## 8. Finalisation

```
refactor(lisibilite) : decoupe finDeTour, tickIA et renderMap en sous-fonctions (P10)
```
