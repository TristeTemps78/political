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
node --test tests/*.test.mjs          # référentiel, moteur d'affinité, équité, économie,
                                       # mode Gouverner (moteur, personas, institutions, équilibrage)
node tools/simulate.mjs 1000          # équilibrage de la Conquête (vrai code du jeu sous Node)
node tools/simulate-gouverner.mjs 200 # équilibrage du mandat Gouverner (mêmes principes)
node tools/a11y-audit.mjs             # accessibilité : parcours clavier + axe-core (WCAG AA)
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

## 🇫🇷 Gouverner — le mode central

L'onglet **Gouverner** (première position dans la barre de navigation, et écran d'accueil
automatique tant qu'un mandat est en cours) est le mode central de l'application : à partir
d'une famille politique choisie sur la Boussole, il fait vivre un mandat complet de 2027 à
2032 — 60 tours d'un mois chacun, jusqu'au verdict des urnes.

Les institutions réelles de la Ve République sont le moteur du jeu, pas un habillage : vote
d'un texte à l'Assemblée nationale (majorité des suffrages exprimés), article 49.3
(engagement de responsabilité, avec une usure de popularité), motion de censure (adoptée à
partir de 289 voix), dissolution (article 12, usage unique par mandat), référendum
(article 11, réservé aux réformes touchant les institutions ou l'Europe), et navette avec un
Sénat qui peut basculer hostile au renouvellement partiel (surcoût budgétaire sur les
décisions qui suivent). La composition de départ de l'Assemblée peut, en option, hériter du
rapport de force construit dans l'onglet Conquête.

Dix **personas fictifs**, nettement étiquetés comme tels dans l'interface, réagissent chaque
mois aux décisions du gouvernement selon leur rapport documenté à la politique (vote de
conviction, défiance envers les institutions, abstention structurelle, vote utile…) ; leur
humeur, agrégée par département, dessine le climat politique du mandat sur une **carte de
France**. Le mandat se conclut par un **verdict département par département** à la
présidentielle de 2032, sur cette même carte.

## Les trois strates de jeu

1. **🧭 Boussole** — apprentissage systémique : sur 6 thèmes (climat, fiscalité, sécurité,
   travail, Europe, institutions), on répartit un budget limité entre des politiques
   concurrentes. Le coût d'opportunité remplace le swipe binaire. Le profil (4 axes,
   7 familles idéologiques génériques) est calculé **exclusivement sur l'appareil**.
2. **🗺️ Conquête** — métajeu de monopolisation : le capital politique gagné en apprenant
   s'investit sur un cartogramme des **577 circonscriptions réelles** (regroupées par
   département et région). Objectif : la majorité absolue, **289 sièges**, face à des guildes
   rivales simulées. Le multijoueur réel est spécifié pour la phase 3.
3. **🏛️ Hémicycle, 🕸️ Alliances, 🎯 Défis** — visualisation et défis : hémicycle SVG des
   577 sièges, graphe de réseau des alliances de vote (nœuds = députés, arêtes =
   concordance > 70 %), duels de débat et paris prédictifs sur l'issue de scrutins.
   Députés et scrutins sont des **données fictives de démonstration, étiquetées comme
   telles dans l'interface** ; l'adaptateur (`js/adapter.js`) est prêt pour l'open data
   de l'Assemblée nationale en phase 2.

## Les moteurs de rétention

- **🔥 Partielles éclair** : chaque jour, 4 circonscriptions tirées au sort (déterministe
  par la date — identique pour tous, sans serveur) passent en élection : influence ×2,
  les guildes IA s'y ruent aussi.
- **⚔️ Duels de débat** : « Pensez comme l'adversaire » (allouer un budget comme le ferait
  une famille rivale — gagner = comprendre l'autre) et défis entre amis par lien
  auto-porteur : votre ami doit prédire votre politique la plus financée. Le lien contient
  uniquement le thème, les points et un pseudo — aucun serveur.
- **🏛️ Motion de censure** : quand une guilde domine la carte (≥ 30 sièges et ≥ 40 % des
  circonscriptions contrôlées), les oppositions se coalisent 20 tours durant : sur ses
  terres, le leader doit dominer la SOMME des influences adverses. Défendre sa majorité
  ou faire tomber celle d'un autre rapporte du capital.

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
