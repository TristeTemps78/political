# P09 — Nettoyage : code mort, CSS manquantes, fin « censure » réelle

| | |
|---|---|
| **Phase** | A — Consolidation, vague 2 |
| **Durée estimée** | 2 h |
| **Dépendances** | P06 (moteur dédupliqué : la fin de mandat passe par `sieges.js`/`gouverner.js` refactorés) |
| **Constats d'audit traités** | STR-07, STR-08 (docs/AUDIT.md §3) |
| **Fichiers créés** | (aucun) |
| **Fichiers modifiés** | `js/gouverner.js`, `js/hemicycle.js`, `css/style.css`, `tests/gouverner.test.mjs` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P06**.

Trois nettoyages ciblés :
1. **Code mort** : re-export inutile dans `hemicycle.js`.
2. **CSS manquantes** : des classes utilisées par l'UI Gouverner ne sont **pas définies** dans `css/style.css`.
3. **Fin de mandat « censure » fantôme** : le type `fin.type = 'censure'` est **documenté** et a un **libellé UI**, mais **aucun chemin du moteur ne le produit** — une 2ᵉ censure adoptée donne `'demission'`. Code UI inatteignable, doc trompeuse.

## 2. Objectif

Après ce plan : plus de re-export mort ; les classes CSS référencées existent (ou les références mortes sont supprimées) ; le moteur **produit réellement** une fin `'censure'` cohérente avec le libellé existant, distincte de `'demission'`, et un test la couvre.

## 3. État actuel (ce que tu vas trouver)

- **STR-07 code mort** : `js/hemicycle.js:108` — `export { adapter };` re-exporté depuis `hemicycle.js` alors que personne ne l'importe de là (les consommateurs importent `adapter` depuis `./adapter.js`).
- **STR-07 CSS manquantes** : `css/style.css` ne définit **pas** `gvn-echeance` (utilisée `js/gouverner-ui-mandat.js:40`, `<div class="panel gvn-echeance" aria-live="polite">`) ni `gvn-vote-abstention` (utilisée dans le rendu des votes de `gouverner-ui-mandat.js`). Vérifier par `grep`.
- **STR-08 fin « censure »** :
  - `js/gouverner.js:190` : commentaire du champ `fin` — `{ type: 'reelu'|'battu'|'censure'|'demission', tour, verdict? }`.
  - `js/gouverner.js:284-292` : censure spontanée — incrémente `g.censures` et, à `>= CENSURES_AVANT_DEMISSION`, pose `g.fin = { type: 'demission', tour: g.tour }`. **Aucune** branche ne pose `type: 'censure'`.
  - `js/gouverner-ui.js:100-104` : `LIBELLES_FIN` contient `censure` (« ⚠️ Renversé(e) par une motion de censure ») **et** `demission` (« Deux motions de censure adoptées… »). Le libellé `censure` est donc **inatteignable**.
  - La distinction voulue (voir libellés) : `censure` = renversé par **une** motion (perte de confiance immédiate), `demission` = **usure** (deux motions cumulées). Confirmer cette sémantique en lisant `assemblee.js` (mécanique complète de censure à 289) et `LIBELLES_FIN`.

## 4. Étapes

1. **hemicycle.js** : supprimer `export { adapter };` (l. 108). Vérifier par `grep -rn "from './hemicycle.js'"` qu'aucun module n'importait `adapter` de là (sinon rediriger l'import vers `./adapter.js`).
2. **CSS** : pour chaque classe manquante (`gvn-echeance`, `gvn-vote-abstention`), **soit** ajouter une définition minimale cohérente avec le design system existant dans `css/style.css` (préféré : ces éléments existent à l'écran et méritent un style), **soit** retirer la classe du HTML si elle est purement décorative et inutile. Choisir l'ajout de style si l'élément est visible et non stylé — vérifier le rendu.
3. **Fin « censure » réelle** (moteur, `gouverner.js`) : faire produire `fin = { type: 'censure', tour }` sur le chemin sémantiquement correct. D'après les libellés : une **motion de censure adoptée à 289** (mécanique `assemblee.js`) doit renverser immédiatement → `type: 'censure'` ; le cumul de censures **spontanées** menant à l'usure reste `type: 'demission'`. Aligner le code moteur sur cette distinction **sans** casser l'équilibrage :
   - Identifier où une censure adoptée par l'Assemblée est traitée (`assemblee.js` + intégration dans `finDeTour`/`gouverner.js`).
   - Poser `g.fin = { type: 'censure', tour: g.tour }` sur ce chemin.
   - Conserver `'demission'` pour le cumul spontané existant (l. 292).
   - Si la mécanique actuelle ne distingue pas les deux, introduire la distinction **minimale** qui rend `'censure'` atteignable, documentée dans le commit et le journal.
4. **Test** (`tests/gouverner.test.mjs`) : ajouter un scénario déterministe (graine + décisions forcées) qui aboutit à `g.fin.type === 'censure'`, et vérifier qu'un autre chemin donne toujours `'demission'`. **Ne pas** changer les graines des tests existants.
5. Mettre à jour la doc du champ `fin` si nécessaire (le commentaire `gouverner.js:190` est déjà correct ; `docs_architecture/02_data_schemas.md` §6 documente déjà `'censure'` — vérifier la cohérence, la correction fine de ce doc relève de **P12**).
6. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Ne pas dégrader l'équilibrage** : `node tools/simulate-gouverner.mjs` et `tests/equilibrage-gouverner.test.mjs` doivent rester dans leurs cibles CI (réélection cohérente ≥ 60 %, incohérente battue ≥ 80 %). Rendre `'censure'` atteignable ne doit pas rendre les fins de mandat plus fréquentes au point de fausser ces taux — vérifier après coup.
- Déterminisme : ne pas changer graines ni ordre des tirages.
- CSS : respecter le design system existant (variables, dark mode). Vérifier clair **et** sombre.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 94 (93 + au moins le test « censure »).
- [ ] `node tools/simulate-gouverner.mjs` : cibles d'équilibrage tenues (comparer aux valeurs d'avant, pas de dérive notable).
- [ ] `grep -n "export { adapter }" js/hemicycle.js` : **aucun** résultat.
- [ ] `grep -n "gvn-echeance\|gvn-vote-abstention" css/style.css` : les classes conservées dans le HTML ont désormais une définition (ou ont été retirées du HTML).
- [ ] `grep -rn "type: 'censure'" js/gouverner.js js/assemblee.js` : au moins une affectation réelle (pas seulement le commentaire l. 190).
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- La mise à jour complète de `docs_architecture` (schémas contradictoires) → plan **P12**.
- Le découpage des fonctions longues → plan **P10** (dépend de ce plan).
- Le bilan de fin de mandat → plan **P18**.

## 8. Finalisation

```
fix(moteur) : fin « censure » reelle, retire le code mort et complete les CSS manquantes (P09)
```
