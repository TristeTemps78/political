# 🏛️ PolitiQuest 2027

Prototype d'application civique ludique pour les élections présidentielles et législatives
françaises de 2027, à destination des 15–40 ans. PWA statique, **zéro dépendance, zéro build,
zéro collecte de données**.

## Lancer

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

N'importe quel serveur statique convient. L'application est installable (PWA) et fonctionne
hors ligne après le premier chargement.

## Tester

```bash
node --test tests/*.test.mjs   # 17 tests : référentiel, moteur d'affinité, équité, économie
node tools/simulate.mjs 1000   # simulation d'équilibrage (vrai code du jeu sous Node)
node tools/a11y-audit.mjs      # accessibilité : parcours clavier + axe-core (WCAG AA)
                               # (nécessite un serveur statique + playwright-core + axe-core)
```

## Accessibilité

L'application est utilisable entièrement au clavier et compatible lecteurs d'écran :
le cartogramme des 577 circonscriptions suit le pattern « grid » (un seul point de
tabulation, navigation aux flèches — ←/→ circonscription, ↑/↓ département, Entrée pour
ouvrir), l'état de chaque circonscription est porté par son étiquette (pas seulement par
la couleur), le quiz annonce les allocations via une région live, le focus est géré à
chaque changement de panneau, et `prefers-reduced-motion` est respecté. Audit automatisé :
zéro violation axe-core (WCAG 2.0/2.1 AA) sur les six onglets.

Les propriétés clés sont testées en continu (CI GitHub Actions) : 577 circonscriptions,
sensibilité du moteur aux magnitudes d'allocation, **équité inter-familles** (σ < 0,05 sur
profils aléatoires, chaque famille peut arriver en tête), premier contrôle rapide et
plafond solo ≪ 289.

## Les trois strates de jeu

1. **🧭 Boussole** — apprentissage systémique : sur 6 thèmes (climat, fiscalité, sécurité,
   travail, Europe, institutions), on répartit un budget limité entre des politiques
   concurrentes. Le coût d'opportunité remplace le swipe binaire. Le profil (4 axes,
   7 familles idéologiques génériques) est calculé **exclusivement sur l'appareil**.
2. **🗺️ Conquête** — métajeu de monopolisation : le capital politique gagné en apprenant
   s'investit sur un cartogramme des **577 circonscriptions réelles** (regroupées par
   département et région). Objectif : la majorité absolue, **289 sièges**, face à des guildes
   rivales simulées. Le multijoueur réel est spécifié pour la phase 3.
3. **🏛️ Hémicycle, 🕸️ Alliances, 🗳️ Scrutins** — visualisation : hémicycle SVG des 577 sièges,
   graphe de réseau des alliances de vote (nœuds = députés, arêtes = concordance > 70 %),
   défis prédictifs sur l'issue de scrutins. Actuellement alimentés par des **données fictives
   de démonstration, étiquetées comme telles dans l'interface** ; l'adaptateur
   (`js/adapter.js`) est prêt pour l'open data de l'Assemblée nationale en phase 2.

## Vie privée (invariant n° 1)

Réponses, axes et affinités ne quittent **jamais** le terminal (`localStorage`). Export et
effacement intégral des données en un clic (onglet Profil). Le moteur d'affinité est en clair
dans `js/affinity.js`, pondérations documentées — destiné à une publication AGPL-3.0.

## Documentation

Toute l'ingénierie du projet est consignée dans [`docs_architecture/`](docs_architecture/) :

| Fichier | Contenu |
|---|---|
| `00_analyse_technique.md` | Analyse critique du cahier des charges, décisions d'architecture, roadmap |
| `01_memory_lessons.md` | Journal des décisions, invariants, incidents (mémoire inter-sessions) |
| `02_data_schemas.md` | Schémas de persistance, modèles, contrat du futur backend multijoueur |
| `03_game_loop.md` | Boucle de jeu et justification de chaque constante d'équilibrage |

## Neutralité

Le jeu ne référence aucun parti ni aucune personne réelle : l'affinité se calcule vers des
familles idéologiques génériques dont les vecteurs sont publics et auditables. Le rattachement
à des programmes réels sera une couche éditoriale séparée, sourcée et pluraliste (phase 4).
