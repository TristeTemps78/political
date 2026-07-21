# P19 — Sauvegardes multiples (schéma v4, 3 emplacements, migration testée)

| | |
|---|---|
| **Phase** | C — Fonctionnalités (après la phase A) |
| **Durée estimée** | 3 h |
| **Dépendances** | P03 (secours du store), P12 (docs de schéma à jour) |
| **Constats d'audit traités** | aucun (nouvelle fonctionnalité ; s'appuie sur SEC-02 résolu) |
| **Fichiers créés** | éventuellement `tests/store-v4.test.mjs` |
| **Fichiers modifiés** | `js/store.js`, `js/app.js` (UI de sélection d'emplacement), `css/style.css`, `docs_architecture/02_data_schemas.md`, `sw.js` (si module ajouté) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P03 et P12** — il fait évoluer le **schéma du store** (`SCHEMA_VERSION 3 → 4`), l'endroit le plus sensible du projet (invariant n° 1, perte de données).

Aujourd'hui il n'y a qu'**une** partie stockée sous `politiquest2027.v1`. Ce plan introduit **3 emplacements de sauvegarde** que l'utilisateur peut choisir, avec une migration v3→v4 **testée** qui place la partie existante dans l'emplacement 1 sans perte.

## 2. Objectif

Après ce plan : 3 emplacements de sauvegarde indépendants, sélectionnables ; une migration v3→v4 qui préserve intégralement la partie existante ; aucune régression sur le chargement, le secours (P03) et le RGPD (`exportData`/`eraseAll`).

## 3. État actuel (ce que tu vas trouver)

Dans `js/store.js` (rappel P03) :
- `KEY = 'politiquest2027.v1'`, `SCHEMA_VERSION = 3`, `defaults()`, `migrer()` (v1→v2→v3), `load`/`save`/`update`, `exportData`/`eraseAll`, et (après P03) `KEY_SECOURS` + `sauvegarderSecours` + `restaurerSecours`.
- `migrer()` renvoie `null` si version inconnue → (après P03) copie de secours puis `defaults()`.

## 4. Étapes

1. **Concevoir le schéma v4**. Deux options — choisir la plus simple qui préserve l'invariant :
   - (A) Un document racine `{ version: 4, emplacementActif, emplacements: [slot0, slot1, slot2] }` où chaque `slot` est le contenu actuel (`profil`/`joueur`/`monde`) ou `null`.
   - (B) Clés `localStorage` séparées par emplacement (`politiquest2027.slot0/1/2`) + une clé d'index.
   Option (A) simplifie l'export/effacement RGPD (un seul document). **Documenter le choix.**
2. **Migration v3→v4** dans `migrer()` : `if (parsed.version === 3) { placer le contenu actuel dans emplacements[0], emplacementActif = 0, version = 4 }`. Conserver les migrations v1→v2→v3 intactes en amont (une v1 migre jusqu'à v4). **Ne jamais** perdre la partie existante.
3. Adapter `load`/`save`/`update` pour opérer sur l'emplacement actif. `defaults()` renvoie désormais la structure v4 (3 emplacements, actif = 0, slots vides sauf éventuellement le premier).
4. **RGPD** : `exportData` exporte l'intégralité (les 3 emplacements) ; `eraseAll` efface tout (`KEY` + `KEY_SECOURS`). Ajouter éventuellement `exporterEmplacement(i)` si utile, mais garder l'export global.
5. **Secours (P03)** : la logique de copie de secours avant réinitialisation doit continuer de fonctionner avec v4 (une v4 corrompue → secours). Vérifier.
6. UI (`app.js`) : un sélecteur d'emplacement accessible (3 slots, avec un résumé : partie en cours / vide, date, éventuel bilan). Changer d'emplacement recharge l'état actif. Confirmer avant d'écraser un slot occupé (action destructive).
7. CSS : styles du sélecteur, clair **et** sombre.
8. **Doc** : mettre à jour `docs_architecture/02_data_schemas.md` (structure v4 + migration v3→v4). Cohérent avec P12.
9. Tests (`tests/store-v4.test.mjs`, importer `shims.mjs`) : migration v3→v4 **préserve** la partie (comparer champ à champ) ; migration v1→…→v4 aboutit ; 3 emplacements indépendants (écrire slot 1 ne touche pas slot 0) ; `eraseAll` vide tout ; secours toujours fonctionnel sur v4 corrompue.
10. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **INVARIANT N°1** : rien du store ne part sur le réseau, quel que soit l'emplacement.
- **Zéro perte de données** : la migration v3→v4 est le point critique — la partie existante doit se retrouver **intacte** dans l'emplacement 0. Test obligatoire, champ à champ.
- **Compat descendante prudente** : après v4, si l'utilisateur rouvre une ancienne version du site (qui ne connaît que v3), `migrer` v3 renverra `null` sur un document v4 → (grâce à P03) secours + reset. Documenter ce comportement ; c'est précisément pourquoi P03 est un prérequis.
- **Déterminisme** : la structure de sauvegarde n'affecte pas les tirages de jeu ; ne pas toucher aux graines.
- Actions destructives (écraser un slot) : confirmation explicite.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (+ tests v4).
- [ ] Test de migration : un store v3 réaliste migré en v4 conserve **exactement** `profil`/`joueur`/`monde` dans l'emplacement 0.
- [ ] Preuve manuelle : jouer, créer une 2ᵉ partie dans le slot 2, basculer entre slots → les deux parties coexistent ; recharger → l'emplacement actif est restauré.
- [ ] `eraseAll()` laisse `localStorage` vide (aucune clé `politiquest2027.*`).
- [ ] `node tools/verifier-sw.mjs` / `verifier-purete.mjs` : verts.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Synchronisation cloud / backend (invariant n° 1 + hors périmètre).
- Le partage de mandat → plan **P20**.
- Un nombre d'emplacements configurable (3 fixes suffisent).

## 8. Finalisation

```
feat(store) : sauvegardes multiples (schema v4, 3 emplacements, migration testee) (P19)
```
