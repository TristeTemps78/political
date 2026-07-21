# P20 — Défi de mandat partagé (`?mandat=`, rejouer et comparer les bilans)

| | |
|---|---|
| **Phase** | C — Fonctionnalités (après la phase A) |
| **Durée estimée** | 3 h |
| **Dépendances** | P01 (échappement — donnée non fiable en entrée), P17 (scénarios), P18 (bilan) |
| **Constats d'audit traités** | aucun (nouvelle fonctionnalité) |
| **Fichiers créés** | éventuellement `js/mandat-partage.js`, `tests/mandat-partage.test.mjs` |
| **Fichiers modifiés** | `js/gouverner-ui.js`, `js/app.js` (routage `?mandat=`), `sw.js` (si module ajouté) |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P01, P17, P18.**

Sur le modèle des « défis entre amis » (`js/duels.js`, `?defi=`), ce plan ajoute le **partage d'un mandat** : un joueur encode le scénario de départ + la graine de sa partie dans une URL `?mandat=…` ; un ami ouvre le lien, **rejoue exactement la même partie** (même scénario, même graine, mêmes événements), puis **compare son bilan** (P18) à celui de l'expéditeur. C'est un point d'entrée de **données non fiables** — l'échappement de P01 est obligatoire.

## 2. Objectif

Après ce plan : encoder/partager un mandat en URL ; le rejouer à l'identique grâce au déterminisme seedé ; comparer les deux bilans. Toute donnée décodée (pseudo, bilan adverse) est **échappée** (P01) et **validée** avant affichage. Aucune donnée du store local ne fuit au-delà de ce que le joueur choisit d'encoder.

## 3. État actuel (ce que tu vas trouver)

- **`js/duels.js`** : le modèle à suivre — `encoderDefi`/`decoderDefi` (base64url), validation de structure, `?defi=` routé dans `app.js`, affichage via `innerHTML` **échappé** (après P01, `echapperHTML`/`echapperAttribut` de `js/echappement.js`).
- **`js/gouverner.js`** : mandat **déterministe** — même scénario (P17) + même graine ⇒ même déroulé. `creerPartie` accepte un scénario (P17). Le PRNG `mulberry32` est seedé.
- **`js/bilan.js`** (P18) : `calculerBilan(g)` produit les statistiques comparables.
- **`js/scenarios.js`** (P17) : configurations de départ.

## 4. Étapes

1. Définir le **format encodé** minimal et sûr : `{ v: 1, scenario, seed, pseudo, bilan? }`. Encoder en base64url comme `duels.js`. **Ne pas** encoder le store local ni de données personnelles au-delà du pseudo choisi et du bilan (chiffres agrégés).
2. Créer `js/mandat-partage.js` : `encoderMandat(...)` / `decoderMandat(code)` avec **validation stricte** de structure (scénario connu, seed numérique bornée, pseudo tronqué comme `duels.js`, bilan aux champs attendus). Rejeter tout code malformé (retour `null`, pas d'exception non gérée).
3. Routage `?mandat=` dans `app.js` (à côté de `?defi=`) : décoder, valider, lancer un mandat sur le **même scénario + même graine**, afficher qui a partagé (pseudo **échappé** via `echapperHTML`).
4. À la fin de la partie rejouée, afficher la **comparaison des bilans** (le sien via `calculerBilan`, celui de l'expéditeur décodé et **échappé/validé**). Écran accessible (P18).
5. UI de partage dans `gouverner-ui.js` (fin de mandat) : bouton « Défier un ami sur ce mandat » qui génère l'URL (réutiliser le pattern `duels.js`), avec le pseudo local **échappé** dans tout affichage.
6. **Sécurité (réutilise P01)** : toute valeur issue du code décodé passe par `echapperHTML`/`echapperAttribut` avant `innerHTML`. Écrire un test avec un pseudo/bilan forgé contenant `<img src=x onerror=alert(1)>` → affiché littéralement, aucune exécution.
7. Si `js/mandat-partage.js` est créé : `SHELL` + bump `CACHE` + `MODULES_PURS` (le module d'encodage/validation est pur ; le routage vit dans `app.js`).
8. Tests (`tests/mandat-partage.test.mjs`) : round-trip `encoder`→`decoder` fidèle ; **rejeu déterministe** (même scénario+seed ⇒ bilan identique — c'est le cœur) ; validation rejette scénario inconnu / seed non numérique / structure cassée ; payload XSS neutralisé.
9. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Sécurité (P01)** : `?mandat=` est, avec `?defi=`, le seul point d'entrée non fiable — **tout** affichage de donnée décodée passe par l'échappement. Ne jamais faire confiance au contenu du lien.
- **Vie privée (invariant n° 1)** : n'encoder que ce que le joueur partage explicitement (scénario, graine, pseudo, bilan agrégé) — jamais le store, les réponses de la Boussole, les affinités.
- **Déterminisme (règle 5)** : le rejeu repose entièrement sur graine + scénario identiques ; ne pas introduire de tirage non seedé sur le chemin du mandat, sinon le rejeu diverge.
- **Validation** : borner/valider chaque champ décodé (scénario ∈ liste connue, seed entier borné) avant usage — un scénario inconnu ne doit pas casser le lancement.
- **Accessibilité** : écran de comparaison au clavier + ARIA (règle 8).

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (+ tests partage).
- [ ] Test de **rejeu déterministe** : deux exécutions du même `?mandat=` produisent un `calculerBilan` **identique**.
- [ ] Test XSS : un pseudo/bilan forgé avec `<img src=x onerror=alert(1)>` s'affiche littéralement (réutilise `js/echappement.js`).
- [ ] Test de validation : `decoderMandat` renvoie `null` (sans throw) sur scénario inconnu, seed non numérique, base64 cassé.
- [ ] `node tools/verifier-sw.mjs` / `verifier-purete.mjs` : verts.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi.

## 7. Hors périmètre (ne PAS faire)

- Classement / serveur de scores (backend hors périmètre, invariant n° 1).
- Encoder l'intégralité d'une partie jouée coup par coup (le rejeu par graine+scénario suffit et reste compact).
- Le mode « historien » (rejeu tour par tour du journal) → réserve ROADMAP §5, pas de plan.

## 8. Finalisation

```
feat(gouverner) : defi de mandat partage (?mandat=, rejeu deterministe, comparaison de bilans) (P20)
```
