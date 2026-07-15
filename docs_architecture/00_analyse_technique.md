# PolitiQuest 2027 — Analyse technique critique, décisions d'architecture et roadmap

> Livrable initial demandé par le cahier des charges d'orchestration.
> Statut : fondation du projet — commit initial de la branche `claude/french-election-civic-game-bd78uh`.

---

## 1. Analyse critique du cahier des charges

### 1.1 Points de friction identifiés (goulots d'étranglement)

| # | Risque | Analyse | Mitigation retenue |
|---|--------|---------|--------------------|
| 1 | **Carte des 577 circonscriptions sur mobile** | Les contours GeoJSON officiels pèsent 10–40 Mo. Un rendu géographique fidèle (WebGL/MapLibre) est coûteux en batterie, en bande passante et illisible sur petit écran (les circonscriptions urbaines sont invisibles à l'échelle nationale). | **Cartogramme en gaufre (waffle) par département** : chaque circonscription = une cellule de taille égale, regroupée par département puis par région. Zéro dépendance cartographique, ~30 Ko de données, lisibilité parfaite des 577 sièges, et pédagogiquement plus juste (1 circo = 1 siège, quelle que soit sa surface). Le fond géographique réel est une amélioration progressive de phase ultérieure. |
| 2 | **Latence et disponibilité des API externes (CIVIX, data.assemblee-nationale.fr)** | Dépendance directe du gameplay à des API tierces = point de défaillance unique. Constaté dès cette session : l'accès sortant vers data.gouv.fr est filtré (HTTP 403 via proxy). Les licences et le format exact de l'API CIVIX doivent être audités avant tout couplage fort. | **Couche d'adaptation (`js/adapter.js`)** : interface unique `DataAdapter` avec deux implémentations — `MockAdapter` (données de démonstration embarquées, clairement étiquetées) et `RemoteAdapter` (squelette prêt pour CIVIX/AN, avec cache et péremption). Le jeu fonctionne 100 % hors ligne ; la donnée réelle enrichit, elle ne conditionne pas. |
| 3 | **Confidentialité des opinions politiques (CNIL / RGPD art. 9)** | Les opinions politiques sont des données sensibles. Le précédent Elyze (mise en demeure, migration vers stockage local, passage en open source) fixe le standard. Toute télémétrie côté serveur du profil idéologique est un risque juridique et réputationnel disqualifiant. | **Privacy by Design strict, appliqué dès le prototype** : le questionnaire, le calcul d'affinité et le profil résident exclusivement dans `localStorage`/IndexedDB du terminal. Aucune requête réseau ne transporte de réponse ou de score. Boutons « Exporter mes données » et « Tout effacer » intégrés (droit d'accès + droit à l'effacement). Le futur mode multijoueur ne synchronise que des deltas d'influence agrégés et pseudonymisés (voir `02_data_schemas.md` §4). |
| 4 | **Neutralité politique et biais algorithmique** | Faire du matching vers des partis/candidats réels expose à trois biais : sélection des propositions, pondération opaque, sur-représentation des thèmes clivants (critique documentée d'Elyze). | Le prototype calcule l'affinité vers des **familles idéologiques génériques** (7 courants définis par des vecteurs sur 4 axes publics et documentés), pas vers des partis réels. La pondération est en clair dans `js/affinity.js` (licence AGPL-3.0, comme La Fabrique de la Loi). Le rattachement à des programmes réels 2027 sera une couche éditoriale séparée, sourcée et versionnée. |
| 5 | **Backend multijoueur temps réel** | Un état mondial synchronisé (carte partagée par des milliers de guildes) implique serveur autoritaire, anti-triche, modération — hors de portée d'un premier incrément et inutile pour valider la boucle de jeu. | **Multijoueur simulé d'abord** : 6 guildes rivales pilotées par une IA locale déterministe rendent la boucle de conquête complète et testable hors ligne. Le contrat d'API du futur backend (WebSocket + CRDT d'influence, état autoritaire côté serveur) est spécifié dans `02_data_schemas.md` §4 pour que le client n'ait pas à changer. |
| 6 | **Équilibrage de la ludification** | Une économie de « capital politique » mal réglée dégénère : soit grind sans apprentissage, soit pay-to-win cognitif. | Toutes les constantes d'économie sont centralisées et justifiées dans `03_game_loop.md` ; le capital ne s'acquiert que par des actions d'apprentissage (quiz systémique, prédictions sur scrutins, exploration de l'hémicycle). |
| 7 | **Coût d'orchestration IA (sous-agents, contexte)** | Le cahier des charges impose une délégation asynchrone à des sous-agents. Pour ce premier incrément — un livrable cohérent d'environ 3 000 lignes fortement couplées (le quiz alimente le capital, qui alimente la carte, qui alimente l'hémicycle) — le découpage en sous-agents à contexte froid aurait multiplié les coûts de re-contextualisation sans gain de qualité. | Développement consolidé pour la fondation ; la délégation parallèle devient pertinente à partir de la phase 2 (backend, ingestion API, tests E2E — voir roadmap §3). Les fichiers mémoire (`01`–`03`) sont précisément le référentiel qui rendra cette délégation sûre. |

### 1.2 Décisions prises en lieu et place des questions de clarification

Le développement s'exécutant en autonomie (pas d'interlocuteur synchrone), les questions prévues au cahier des charges sont converties en décisions par défaut, chacune réversible et documentée :

1. **Stack** : PWA statique sans étape de build — HTML + CSS + JavaScript ES modules natifs, zéro dépendance externe (pas de CDN : compatible CSP stricte et fonctionnement hors ligne). Un passage à Vite/TypeScript/React est trivial plus tard ; l'inverse ne l'est pas. *Raison : livrer une boucle jouable vérifiable, auditable ligne à ligne, installable partout.*
2. **Dataviz** : SVG généré en JavaScript pur (hémicycle en couronnes polaires, graphe de réseau avec simulation de forces maison ~60 lignes). D3/Three.js réévalués quand les volumes le justifieront (>2 000 nœuds). *Le choix « graphe réseau vs carte spatiale » est tranché par : les deux — cartogramme pour le territoire, graphe pour les alliances.*
3. **Backend** : différé (décision n° 5 ci-dessus). Contrat d'API spécifié, implémentation en phase 2.
4. **Persistance client** : `localStorage` (JSON versionné, ~50 Ko max ici) plutôt qu'IndexedDB pour le prototype ; l'interface `Store` (`js/store.js`) est asynchrone-compatible pour basculer vers IndexedDB sans toucher au reste du code.
5. **Langue** : interface entièrement en français (cible 15–40 ans, élections françaises).

### 1.3 Réserves sur les prémisses du document d'orientation

Par honnêteté d'ingénierie : les affirmations du rapport concernant le modèle d'orchestration lui-même (redéploiement de juillet 2026, restrictions d'exportation, bascule automatique vers un autre modèle, tarification « au crédit métrique ») ne sont pas vérifiables depuis cet environnement et ne correspondent à aucune information dont je dispose ; l'architecture ci-dessus n'en dépend d'aucune façon. De même, l'URL `https://www.civix.fr/api` doit être auditée (existence, licence, CGU) avant d'être câblée dans `RemoteAdapter` — la source faisant foi reste `data.assemblee-nationale.fr` (licence ouverte Etalab) et les exports de Regards Citoyens.

---

## 2. Architecture livrée (incrément 1)

```
/
├── index.html               Coquille applicative (5 onglets), PWA
├── manifest.webmanifest     Manifeste PWA (installable)
├── sw.js                    Service worker : cache-first du shell applicatif
├── css/style.css            Design system (thème sombre/clair, mobile-first)
├── js/
│   ├── app.js               Amorçage, routage par onglets, barre de statut
│   ├── store.js             Persistance locale versionnée (Privacy by Design)
│   ├── data.js              Référentiel : 577 circos réelles par département,
│   │                        7 familles idéologiques, 6 thèmes de quiz,
│   │                        députés & scrutins de DÉMONSTRATION (étiquetés)
│   ├── adapter.js           Couche d'accès données (Mock / Remote à brancher)
│   ├── affinity.js          Moteur d'affinité 100 % client (4 axes, en clair)
│   ├── quiz.js              Phase 1 : allocation budgétaire par thème
│   ├── map.js               Phase 2 : cartogramme des 577 circonscriptions
│   ├── guilds.js            Phase 2 : capital politique, guildes, IA rivales
│   ├── hemicycle.js         Phase 3 : hémicycle SVG 577 sièges
│   ├── graph.js             Phase 3 : graphe de réseau des alliances de vote
│   └── predictions.js       Phase 3 : défis prédictifs sur scrutins
└── docs_architecture/       Mémoire persistante du projet (ce répertoire)
```

Invariants vérifiés à l'exécution : la somme des circonscriptions du référentiel est asseurée `=== 577` (échec bruyant sinon) ; la majorité absolue est codée `289`.

---

## 3. Roadmap séquentielle (phases suivantes)

**Phase 0 — livrée dans ce commit** : fondation documentaire + boucle de jeu complète hors ligne (quiz systémique → capital → conquête → hémicycle/graphe → prédictions), PWA installable, RGPD outillé.

**Phase 1 (~S+1) — durcissement solo** : tests unitaires du moteur d'affinité et de l'économie (Node `--test`), audit d'accessibilité (navigation clavier, ARIA sur les SVG), équilibrage par simulation de 10 000 parties, contenu éditorial des 6 thèmes relu par un comité pluraliste.
**Phase 2 (~S+2/3) — donnée réelle** : audit licence/CGU CIVIX ; implémentation `RemoteAdapter` sur data.assemblee-nationale.fr (scrutins, groupes, votes individuels) avec pipeline de pré-agrégation côté build (JSON statiques versionnés, pas d'appel direct depuis le client) ; graphe d'alliances calculé sur les scrutins solennels réels. *Travaux parallélisables en sous-agents : ingestion, normalisation, tests de contrat.*
**Phase 3 (~S+4/6) — multijoueur réel** : backend minimal (WebSocket, état autoritaire, deltas d'influence pseudonymisés conformes au schéma §4 de `02_data_schemas.md`), guildes entre amis par lien d'invitation, anti-abus (plafonds de dépense par fenêtre glissante).
**Phase 4 — lancement 2027** : couche éditoriale programmes réels (sourcée, versionnée, contradictoire), audits externes (CNIL/sécurité), publication AGPL-3.0 du moteur d'affinité.
