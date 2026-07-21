# P03 — Sauvegarde de secours du store avant réinitialisation

| | |
|---|---|
| **Phase** | A0 — Socle |
| **Durée estimée** | 1-2 h |
| **Dépendances** | aucune |
| **Constats d'audit traités** | SEC-02 (docs/AUDIT.md §2) |
| **Fichiers créés** | (aucun ; tests ajoutés à un fichier existant, voir étape 4) |
| **Fichiers modifiés** | `js/store.js`, `tests/guilds.test.mjs` (ou nouveau `tests/store.test.mjs`) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome.

Invariant n° 1 du projet : le store local (`js/store.js`) est la **seule** mémoire de la progression (profil, capital, mandat Gouverner en cours) et n'est jamais transmis au réseau. Aujourd'hui, tout JSON illisible **ou** toute version de schéma non reconnue efface silencieusement l'intégralité de cette progression, sans copie de secours.

## 2. Objectif

Après ce plan, aucune donnée locale n'est effacée sans qu'une copie brute soit d'abord conservée sous une clé de secours. L'utilisateur (ou un agent de support) peut retrouver l'ancien contenu même après un reset. Le comportement nominal (chargement normal, migrations v1→v2→v3) est strictement inchangé.

## 3. État actuel (ce que tu vas trouver)

Dans `js/store.js` (vérifié au commit `48d276c`) :

- `KEY = 'politiquest2027.v1'` (l. 5), `SCHEMA_VERSION = 3` (l. 6).
- `migrer(parsed)` (l. 25-37) migre v1→v2→v3 puis **retourne `null` si `parsed.version !== SCHEMA_VERSION`** (l. 35).
- `load()` (l. 41-59) :
  ```js
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const migre = migrer(JSON.parse(raw));
      if (migre) { state = migre; save(); return state; }
    }
  } catch (e) { console.warn('Store illisible, réinitialisation.', e); }
  state = defaults();
  save();          // ← écrase l'ancien contenu, définitivement
  return state;
  ```
  Deux chemins mènent à la perte : (a) `JSON.parse` échoue → `catch` ; (b) `migre === null` (version inconnue) → on tombe hors du `if`, sur `defaults()` + `save()`.

## 4. Étapes

1. Dans `js/store.js`, ajouter une constante `const KEY_SECOURS = 'politiquest2027.secours';` près de `KEY`.
2. Créer une fonction interne `function sauvegarderSecours(raw)` : si `raw` est une chaîne non vide, écrire `localStorage.setItem(KEY_SECOURS, raw)` dans un `try/catch` (quota) — ne jamais laisser l'échec de la copie empêcher la suite.
3. Modifier `load()` pour appeler `sauvegarderSecours(raw)` **avant** toute réinitialisation, dans les deux chemins de perte :
   - Cas version inconnue : si `raw` existe et `migrer` renvoie `null`, appeler `sauvegarderSecours(raw)` avant de continuer vers `defaults()`.
   - Cas JSON illisible : dans le `catch`, `raw` peut être hors de portée — restructurer pour lire `raw` **avant** le `try`, ou capturer `raw` dans une variable de portée fonction, puis `sauvegarderSecours(raw)` dans le `catch`.
   - Restructuration suggérée :
     ```js
     export function load() {
       if (state) return state;
       const raw = localStorage.getItem(KEY);
       if (raw) {
         try {
           const migre = migrer(JSON.parse(raw));
           if (migre) { state = migre; save(); return state; }
           // version inconnue : on ne reconnaît pas ce schéma
           sauvegarderSecours(raw);
           console.warn('Schéma de store inconnu, réinitialisation (copie de secours conservée).');
         } catch (e) {
           sauvegarderSecours(raw);
           console.warn('Store illisible, réinitialisation (copie de secours conservée).', e);
         }
       }
       state = defaults();
       save();
       return state;
     }
     ```
4. Ajouter une fonction exportée `export function restaurerSecours()` (facultatif mais utile) qui renvoie le contenu brut de `KEY_SECOURS` ou `null` — pour l'outillage de support ; ne pas l'appeler automatiquement.
5. **Ne pas** faire écrire `KEY_SECOURS` par `save()`/`eraseAll()`/`exportData()` : `eraseAll()` (droit à l'effacement RGPD) doit rester total — **ajouter `localStorage.removeItem(KEY_SECOURS)` dans `eraseAll()`** pour que l'effacement reste intégral (sinon une copie de secours survivrait à une demande d'effacement, ce qui violerait l'invariant n° 1 / RGPD).
6. Tests (`node:test`, importer `tests/shims.mjs` en premier car `store.js` touche `localStorage`) : couvrir
   - migration v2→v3 normale : pas de secours écrit, données intactes.
   - JSON corrompu : `defaults()` chargé **et** `KEY_SECOURS` contient l'octet brut d'origine.
   - version future inconnue (`{"version":99,...}`) : `defaults()` chargé **et** secours conservé.
   - `eraseAll()` retire aussi `KEY_SECOURS`.
7. Ajouter une entrée datée à `docs_architecture/01_memory_lessons.md`.
8. Cocher ce plan dans `docs/plans/README.md` et `docs/ROADMAP.md` §8.

## 5. Garde-fous spécifiques

- Le comportement des parties saines (v1/v2/v3) ne doit **rien** changer : mêmes migrations, même ordre, aucun `save()` supplémentaire sur le chemin nominal.
- Ne pas modifier `defaults()`, `SCHEMA_VERSION`, ni l'ordre des migrations existantes.
- Respecter l'invariant n° 1 : `KEY_SECOURS` reste purement local, jamais réseau.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ 97 (93 + au moins 4 nouveaux).
- [ ] `node tools/simulate.mjs 200` : sans erreur.
- [ ] Preuve manuelle : dans la console du navigateur, `localStorage.setItem('politiquest2027.v1', '{corrompu')` puis recharger → l'app démarre sur un profil neuf **et** `localStorage.getItem('politiquest2027.secours')` renvoie `'{corrompu'`.
- [ ] `eraseAll()` laisse `politiquest2027.secours` à `null`.
- [ ] `git status` : seuls `js/store.js`, le fichier de tests et les 3 fichiers de suivi apparaissent.

## 7. Hors périmètre (ne PAS faire)

- Les sauvegardes multiples / emplacements de partie (schéma v4) → plan **P19** (qui dépend de ce plan).
- La faille XSS des défis (SEC-01) → plan **P01**.
- Toute UI de restauration : `restaurerSecours()` est un simple accès programmatique, pas d'écran.

## 8. Finalisation

```
fix(securite) : copie de secours du store avant toute reinitialisation (P03)
```
