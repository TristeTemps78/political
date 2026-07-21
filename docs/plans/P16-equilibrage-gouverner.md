# P16 — Campagne d'équilibrage Gouverner (cibles chiffrées sur ≥ 1 000 mandats)

| | |
|---|---|
| **Phase** | B — Contenu (parallèle à la phase A dès A0 finie) |
| **Durée estimée** | 2-3 h |
| **Dépendances** | P13 (le nouveau contenu d'événements doit exister pour être équilibré) |
| **Constats d'audit traités** | aucun (plan d'équilibrage) |
| **Fichiers créés** | éventuellement `tests/equilibrage-gouverner-etendu.test.mjs` |
| **Fichiers modifiés** | `js/gouverner.js` (constantes `ECONOMIE_GOUVERNER` uniquement), `tools/simulate-gouverner.mjs`, `tests/equilibrage-gouverner.test.mjs`, `docs_architecture/03_game_loop.md` |
| **Fichiers interdits** | `js/geo.js` (généré) et tout fichier hors des listes ci-dessus |

## 1. Contexte minimal

PolitiQuest 2027 : PWA civique française, vanilla JS, zéro dépendance. Lire **AGENTS.md à la racine**. Ce plan est autonome. **Dépend de P13** (équilibrer un contenu figé).

Le mode Gouverner est équilibré par simulation de mandats. Les constantes vivent dans `ECONOMIE_GOUVERNER` (`js/gouverner.js`), **justifiées** dans `docs_architecture/03_game_loop.md`. La CI vérifie déjà 4 cibles d'équilibrage (`tests/equilibrage-gouverner.test.mjs`), dont : réélection d'un·e président·e **cohérent·e** ≥ 60 %, **incohérent·e battu·e** ≥ 80 % (verrou historique : `VOTE_BARRAGE_2032 = 3` au second tour). Ce plan reprend une campagne d'équilibrage sur ≥ 1 000 mandats après l'ajout de contenu.

## 2. Objectif

Après ce plan : les cibles d'équilibrage sont mesurées sur ≥ 1 000 mandats, documentées avec des chiffres à jour, et tenues malgré le nouveau contenu (P13/P15). Toute constante ajustée est justifiée dans `03_game_loop.md`. Aucune nouvelle constante « magique » non expliquée.

## 3. État actuel (ce que tu vas trouver)

- **`js/gouverner.js`** : `ECONOMIE_GOUVERNER` (constantes d'équilibrage — seuils de censure, `VOTE_BARRAGE_2032`, etc.). **Vérifié** : `SEUIL_HOSTILITE_ASSEMBLEE`, `SEUIL_CENSURE_SPONTANEE`, `CENSURES_AVANT_DEMISSION`, décalage sigmoïde du barrage 2032…
- **`tools/simulate-gouverner.mjs`** : lance N mandats et agrège des statistiques (taux de réélection, fins de mandat, etc.). Vérifier son interface (argument N ?).
- **`tests/equilibrage-gouverner.test.mjs`** : 4 assertions CI. Ne pas **affaiblir** ces cibles.
- **`docs_architecture/03_game_loop.md`** : justifie chaque constante. Le verrou `VOTE_BARRAGE_2032 = 3` y est expliqué (sans lui, réélection ~50 % au lieu de la cible ≥ 60 %).

## 4. Étapes

1. Lire `tools/simulate-gouverner.mjs` et `tests/equilibrage-gouverner.test.mjs` : comprendre les statistiques produites et les cibles actuelles.
2. Étendre l'outil de simulation pour tourner sur **≥ 1 000 mandats** (paramétrable) et rapporter clairement : taux de réélection cohérent/incohérent, distribution des types de fin (`reelu`/`battu`/`censure`/`demission`), popularité médiane, fréquence des censures, participation moyenne. Sortie lisible (tableau texte).
3. Lancer la campagne, analyser. Objectifs indicatifs (ajuster/documenter) :
   - réélection cohérente ≥ 60 % (verrou existant), incohérente battue ≥ 80 % ;
   - fins de mandat variées mais pas dégénérées (ni 0 % ni 100 % de censures) ;
   - la fin `'censure'` (rendue réelle par P09, si fusionné) apparaît à une fréquence plausible sans dominer.
4. **Ajuster uniquement les constantes** d'`ECONOMIE_GOUVERNER` si nécessaire — jamais les graines ni l'ordre des tirages. Chaque changement de constante doit :
   - être motivé par une mesure chiffrée avant/après ;
   - être **documenté** dans `docs_architecture/03_game_loop.md` (valeur, effet mesuré, justification pédagogique/ludique).
5. **Renforcer les tests CI** : ajouter des assertions chiffrées supplémentaires (sur des statistiques stables et déterministes, seed fixe) pour verrouiller les nouvelles cibles — sans rendre la CI lente (garder l'échantillon CI raisonnable, ex. 200-500, et documenter que la campagne complète est ≥ 1 000 en local). **Ne jamais diminuer le nombre de tests** ni affaiblir les cibles existantes.
6. Entrée datée dans `docs_architecture/01_memory_lessons.md` ; cocher le suivi.

## 5. Garde-fous spécifiques

- **Déterminisme (règle 5)** : équilibrer = ajuster des constantes, **pas** des graines. Les assertions CI doivent rester déterministes (seed fixe).
- **Ne pas affaiblir** les cibles existantes pour « faire passer » : si une cible ne tient plus après P13/P15, corriger le contenu ou la constante, pas le seuil de test.
- Toute constante touchée = une justification dans `03_game_loop.md` (invariant de ce projet : aucune constante magique).
- Performance CI : la simulation CI doit rester rapide (secondes). La campagne ≥ 1 000 est une opération locale documentée.

## 6. Critères d'acceptation

- [ ] `node --test tests/*.test.mjs` : 100 % vert, nombre de tests ≥ celui d'avant (idéalement + assertions d'équilibrage).
- [ ] `node tools/simulate-gouverner.mjs` (ou avec argument ≥ 1000) : rapport chiffré lisible ; cibles tenues (réélection cohérente ≥ 60 %, incohérente battue ≥ 80 %).
- [ ] `docs_architecture/03_game_loop.md` : chaque constante modifiée y est justifiée avec chiffres avant/après.
- [ ] `git status` : seuls les fichiers listés + les 3 fichiers de suivi. **Aucune graine modifiée** (revue).

## 7. Hors périmètre (ne PAS faire)

- Ajouter du contenu (événements/personas) → plans **P13**/**P15**.
- Refactoriser le moteur → plans **P06**/**P10**.
- Modifier la mécanique de fin de mandat → plan **P09**.

## 8. Finalisation

```
balance(gouverner) : campagne d'equilibrage sur 1000+ mandats, cibles CI renforcees (P16)
```
