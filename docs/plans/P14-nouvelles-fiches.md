# P14 — 6-8 nouvelles fiches pédagogiques

| | |
|---|---|
| **Phase** | B — Contenu (parallèle à la phase A dès A0 finie) |
| **Durée estimée** | 1-2 h |
| **Dépendances** | A0 |
| **Constats d'audit traités** | aucun (plan de contenu) |
| **Fichiers créés** | (aucun) |
| **Fichiers modifiés** | `js/fiches.js`, `tests/fiches.test.mjs` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome.

Les fiches « Le saviez-vous ? » (`js/fiches.js`, module **pur**) expliquent une institution/mécanique réelle du système politique français. Elles sont le cœur pédagogique du jeu. Ce plan en ajoute 6 à 8, dans le **strict respect de la neutralité** (règles détaillées en tête de `js/fiches.js`).

## 2. Objectif

Après ce plan, 6-8 fiches supplémentaires enrichissent le corpus pédagogique, chacune factuelle, neutre, sourçable, et bien formée au sens du schéma existant. Elles peuvent être référencées par des événements de mandat (P13) ou des scrutins.

## 3. État actuel (ce que tu vas trouver)

- **`js/fiches.js`** : en-tête documentant les **règles de neutralité** (à lire et respecter à la lettre). Puis une liste de fiches au format structuré (id, titre, corps, éventuel thème/rattachement). **Reproduire ce format exactement.**
- Les fiches sont consommées par le mode Gouverner (élections intermédiaires : `gouverner.js` référence des fiches comme `'abstention-participation'`, `'navette-parlementaire-senat'`, `'autres-scrutins'`) et par le contenu pédagogique général.
- `tests/fiches.test.mjs` teste déjà la forme des fiches (unicité des id, champs requis, éventuellement absence de termes proscrits). **S'aligner** sur ces tests et les étendre.

## 4. Étapes

1. Lire l'en-tête de neutralité et le format d'une fiche dans `js/fiches.js`, et lire `tests/fiches.test.mjs` pour connaître les invariants déjà vérifiés.
2. Choisir 6-8 sujets institutionnels **non encore couverts**, ex. : le Conseil constitutionnel (saisine, QPC), le rôle du Sénat et la navette, l'article 49.3, la motion de censure (seuil 289), la dissolution (art. 12), le référendum (art. 11 vs 89), les ordonnances (art. 38), le Défenseur des droits, la loi de finances, le quinquennat et le calendrier électoral, le mode de scrutin législatif, l'abstention. **Éviter les doublons** avec les fiches et événements existants.
3. Rédiger chaque fiche : factuelle, concise, neutre, **sans** parti/personnalité réel, **sans** jugement de valeur. Vérifier l'exactitude constitutionnelle (numéros d'articles corrects).
4. Insérer dans `js/fiches.js` selon le format existant, avec des id en français, kebab-case, uniques.
5. Étendre `tests/fiches.test.mjs` : les nouvelles fiches passent tous les invariants de forme ; si des événements/scrutins les référencent, l'id existe.
6. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Neutralité (règle 9)** : c'est le point le plus sensible du projet. Respecter à la lettre l'en-tête de `js/fiches.js`. Familles politiques fictives uniquement ; aucun nom réel ; pas de prise de position.
- **Exactitude** : une fiche pédagogique fausse est pire qu'absente. Vérifier chaque affirmation constitutionnelle.
- Module pur : `fiches.js` reste pur (vérificateur P02).
- Ne pas modifier les fiches existantes (contenu déjà relu) — **ajouter** seulement.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant.
- [ ] `node tools/verifier-purete.mjs` : vert.
- [ ] 6 à 8 fiches ajoutées, id uniques (revue), passant les invariants de `tests/fiches.test.mjs`.
- [ ] Relecture neutralité + exactitude : aucun nom réel, numéros d'articles vérifiés.
- [ ] `git status` : seuls `js/fiches.js`, `tests/fiches.test.mjs` + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Les événements de mandat qui pourraient les référencer → plan **P13** (parallèle).
- Modifier le mécanisme d'affichage des fiches (UI) — seul le contenu est ajouté.

## 8. Finalisation

```
feat(contenu) : ajoute 6-8 fiches pedagogiques neutres et sourcees (P14)
```
