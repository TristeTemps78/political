# P15 — 3-4 nouveaux personas

| | |
|---|---|
| **Phase** | B — Contenu (parallèle à la phase A dès A0 finie) |
| **Durée estimée** | 1-2 h |
| **Dépendances** | P05 (réutilise `js/outils.js` : cosinus/produit scalaire factorisés) |
| **Constats d'audit traités** | aucun (plan de contenu) |
| **Fichiers créés** | (aucun) |
| **Fichiers modifiés** | `js/personas.js`, `tests/personas.test.mjs` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P05** (le calcul de réaction d'un persona utilise désormais le cosinus/produit scalaire de `js/outils.js`).

Les **personas** (`js/personas.js`, module **pur**) sont des archétypes d'électeurs, chacun défini par un **vecteur idéologique** sur les axes du mode Gouverner. Ils réagissent aux décisions (produit scalaire vecteur persona × direction des effets) et pondèrent la participation/l'humeur départementale. Ce plan ajoute 3-4 personas comblant des **zones vides** de l'espace des axes, pour une carte électorale plus contrastée.

## 2. Objectif

Après ce plan, 3-4 personas supplémentaires occupent des régions sous-représentées de l'espace idéologique, sans casser les invariants (participation bornée, réactions signées cohérentes) ni l'équilibrage.

## 3. État actuel (ce que tu vas trouver)

- **`js/personas.js`** : `AXES_GOUVERNER` (les axes idéologiques), la liste des personas existants (id, libellé, `vecteur` sur les axes, éventuels poids/segments), et les fonctions pures `reagirPersona`, `poidsSegments`, `participation`, `tirerRecit` (toutes déjà testées dans `tests/personas.test.mjs`).
- Après P05, le cosinus/produit scalaire vient de `js/outils.js` (paramétré par `AXES_GOUVERNER`).
- `tests/personas.test.mjs` vérifie : réaction alignée ≥ 0 / opposée ≤ 0, bornée à ±25 ; participation ∈ [0,1] monotone ; `poidsSegments` somme à 1 ; déterminisme de `tirerRecit`.

## 4. Étapes

1. Lire `js/personas.js` en entier : format d'un persona, plage des composantes de `vecteur`, comment les personas sont rattachés aux départements/segments.
2. Cartographier l'**espace des axes** occupé par les personas actuels et repérer 3-4 **zones vides** (combinaisons idéologiques non représentées). Concevoir des personas plausibles et **neutres** (archétypes sociologiques, pas de parti réel) couvrant ces zones.
3. Ajouter les personas dans la structure existante, avec des vecteurs bien dans les bornes et des id uniques en français.
4. Vérifier l'intégration : si les poids de segments/départements doivent sommer à 1 ou couvrir tous les départements, ajuster de façon cohérente (sans casser `poidsSegments`).
5. Étendre `tests/personas.test.mjs` : les nouveaux personas passent tous les invariants (réaction signée, bornes, participation). Ajouter au moins un test ciblant une zone d'axe nouvellement couverte.
6. **Valider par simulation** : `node tools/simulate-gouverner.mjs` sans régression des cibles d'équilibrage.
7. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Neutralité (règle 9)** : personas = archétypes fictifs, jamais un électorat nommé d'un parti réel.
- **Déterminisme (règle 5)** : ne pas changer les graines ni l'ordre ; ajouter des personas ne doit pas casser les scénarios de test reproductibles.
- **Équilibrage** : de nouveaux personas modifient la carte électorale → vérifier que les cibles CI (réélection cohérente ≥ 60 %, incohérente battue ≥ 80 %) tiennent. Si dérive, ajuster les vecteurs (pas les constantes du moteur — ça, c'est P16).
- Module pur : `personas.js` reste pur (vérificateur P02).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant.
- [ ] `node tools/simulate-gouverner.mjs` : cibles tenues.
- [ ] `node tools/verifier-purete.mjs` : vert.
- [ ] 3 à 4 personas ajoutés, id uniques, vecteurs dans les bornes ; invariants de `tests/personas.test.mjs` verts.
- [ ] `git status` : seuls `js/personas.js`, `tests/personas.test.mjs` + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- L'équilibrage chiffré des constantes du moteur → plan **P16**.
- Modifier `reagirPersona`/`participation` (mécaniques) — seul le **contenu** (personas) est ajouté.

## 8. Finalisation

```
feat(contenu) : ajoute 3-4 personas comblant des zones vides de l'espace des axes (P15)
```
