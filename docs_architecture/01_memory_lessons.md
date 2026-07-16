# 01 — Mémoire : apprentissages, décisions et incidents résolus

> Journal append-only. Chaque session de développement ajoute ses entrées en bas.
> But : préserver la cohérence inter-sessions et rendre la délégation à des sous-agents sûre.

## 2026-07-15 — Session fondation (incrément 1)

### Environnement
- Dépôt vierge, branche de travail : `claude/french-election-civic-game-bd78uh`.
- **Réseau sortant filtré** : `data.gouv.fr` inaccessible depuis l'environnement de build
  (proxy → HTTP 403). Conséquence : aucun couplage au réseau dans le prototype ;
  toute donnée externe passe par `js/adapter.js` avec repli local.

### Décisions structurantes (résumé — détail dans 00_analyse_technique.md §1.2)
1. PWA statique sans build, zéro dépendance externe, ES modules natifs.
2. Cartogramme en gaufre plutôt que GeoJSON (poids, lisibilité mobile, équité visuelle 1 circo = 1 cellule).
3. Affinité vers 7 familles idéologiques génériques (pas de partis réels) — neutralité et
   auditabilité ; pondérations en clair dans `js/affinity.js`.
4. Multijoueur simulé par 6 guildes IA locales déterministes ; contrat backend spécifié mais
   non implémenté.
5. Profil idéologique : jamais en réseau. `localStorage` clé `politiquest2027.v1`.

### Règles pour toute session future / tout sous-agent
- Ne JAMAIS ajouter d'appel réseau transportant une réponse de quiz, un score d'axe ou une
  affinité. C'est l'invariant n° 1 du projet (RGPD art. 9, précédent Elyze/CNIL).
- Le total des circonscriptions dans `js/data.js` DOIT rester 577 (assertion à l'exécution :
  `data.js` lève une erreur sinon). Majorité absolue : constante `MAJORITE_ABSOLUE = 289`.
- Les données députés/scrutins actuelles sont FICTIVES et étiquetées « démonstration » dans
  l'UI. Ne pas les présenter comme réelles ; les remplacer uniquement via `RemoteAdapter`.
- Toute nouvelle constante d'économie du jeu se déclare dans `ECONOMIE` (`js/guilds.js`) et
  se justifie dans `03_game_loop.md`.
- Schéma de persistance versionné : toute modification incrémente `SCHEMA_VERSION` dans
  `js/store.js` et fournit une migration.

### Incidents / pièges rencontrés (session fondation)
- `curl data.gouv.fr` → 403 CONNECT via proxy : ne pas re-tenter en boucle, l'égresse est
  une liste blanche. Prévoir les jeux de données en fixtures versionnées.
- Répartition des 577 circonscriptions par département reconstituée de mémoire (découpage
  2010 en vigueur) et verrouillée par l'assertion de somme ; à re-valider contre le
  référentiel officiel INSEE/Ministère de l'Intérieur en phase 2 avant toute publication.

## 2026-07-16 — Session durcissement (phase 1)

### Deux défauts réels découverts par audit critique du moteur d'affinité

1. **Bug de saturation des axes** (`js/affinity.js`). L'ancienne normalisation
   (`poids += |valeur| × pts`) annulait les magnitudes : toute allocation sur des options de
   même signe donnait exactement ±1,0 — 1 point sur un effet 0,9 pesait autant que 12 points.
   La « nuance » revendiquée par le produit était mathématiquement absente.
   → Correctif : dilution par les points alloués (`poids += pts`). Test de régression :
   `tests/affinity.test.mjs` (« la magnitude des allocations compte »).

2. **Biais structurel d'équité** (σ = 0,25 mesuré sur 3 000 profils aléatoires !).
   Deux causes combinées : (a) la distance euclidienne favorise les familles au vecteur
   proche du centre ; (b) le contenu des thèmes est directionnellement déséquilibré
   (ex. les 4 options « climat » ont toutes un effet écologie ≥ 0), donc un répondant
   indifférent obtenait un vecteur non nul.
   → Correctifs : similarité cosinus (directions idéologiques) + **étalonnage de
   l'instrument** : le zéro de chaque axe = la réponse uniforme, constante `ETALONNAGE`
   dérivée automatiquement de `THEMES` (se recalcule si le contenu change), remise à
   l'échelle symétrique de chaque demi-intervalle.
   → Après correctif : σ < 0,05 ET chaque famille arrive en tête sur > 2 % des profils
   aléatoires (testé en continu dans la suite).

   Leçon générale : *tout changement de contenu éditorial (THEMES) peut réintroduire un
   biais — c'est le test d'équité qui fait foi, pas l'intention rédactionnelle.*

### Équilibrage validé par simulation (tools/simulate.mjs, vrai code du jeu sous Node)

- Première circonscription contrôlée : 5 investissements (50 capital) dans 100 % des
  1 000 parties — sous la cible « < 10 minutes de jeu ».
- Plafond solo (2 000 capital ≈ joueur très assidu) : moyenne 34,7 sièges, max 39 ≪ 289 —
  la majorité absolue exige la coopération de guilde, conformément au design.
- Les doublures Node sont dans `tests/shims.mjs` (localStorage/document minimaux) :
  les réutiliser pour tout futur test ou simulation, ne pas dupliquer la logique du jeu.

### Outillage
- `node --test tests/*.test.mjs` — 17 tests (référentiel, affinité, équité, économie).
  Attention : `node --test tests/` ne résout pas les modules — passer le glob explicite.
- `node tools/simulate.mjs [n]` — simulation d'équilibrage.
- CI GitHub Actions : `.github/workflows/tests.yml` (tests + simulation à 200 parties).

## 2026-07-16 — Session accessibilité (phase 1, suite)

### Ce qui a été mis en place (validé par tools/a11y-audit.mjs : parcours clavier + axe-core)
- **Cartogramme = pattern « grid »** : les 577 cellules n'exposent qu'UN point de tabulation
  (tabindex tournant, module `rovingIdx` dans js/map.js) ; ←/→ cellule suivante/précédente,
  ↑/↓ département suivant/précédent, Home/End, Entrée ouvre le détail. Ne pas casser ce
  pattern en ajoutant des cellules tabbables.
- **L'état n'est plus porté que par la couleur** : chaque cellule a un aria-label complet
  (« Paris — 3ᵉ circonscription, contestée, X en tête avec n points »).
- **Gestion du focus** : ouverture d'un panneau → focus sur son titre (tabindex="-1") ;
  après un investissement (re-rendu complet), focus restauré sur « Investir » pour permettre
  Entrée-Entrée-Entrée ; bouton +/− désactivé → repli du focus sur son jumeau.
- **Régions live** : #quiz-live (stable, hors des zones re-rendues — condition de
  fonctionnement d'aria-live), toast role="status".
- Boussole : description textuelle par axe (visually-hidden), graphiques aria-hidden.
- SVG : hémicycle role="img" (l'info est dans la légende) ; graphe role="group" car ses
  nœuds sont focusables — un role="img" les aplatirait pour les lecteurs d'écran.
- :focus-visible global, prefers-reduced-motion (CSS + scrollIntoView).

### Pièges appris
- **aria-live doit être un élément STABLE** : une région re-créée par innerHTML à chaque
  rendu n'annonce rien. D'où #quiz-live placé hors de #quiz-detail.
- **Toast en fondu = faux positif axe color-contrast** : axe peut échantillonner l'élément à
  opacité ~0,1. Correctifs : visibility:hidden hors affichage + texte vidé après le fondu
  (un toast masqué ne doit rien laisser dans l'arbre d'accessibilité) ; l'audit neutralise
  les toasts en cours de fondu avant chaque axe.run.
- Résolution ESM dans tools/ : résoudre les dépendances depuis process.cwd() (createRequire)
  pour que le script vive dans le dépôt sans node_modules.
