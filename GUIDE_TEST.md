# Guide de test manuel — PolitiQuest 2027

Branche : `claude/french-election-civic-game-bd78uh`. Durée totale : ~28 minutes.

## 0. Mise en route (2 min)

```bash
git clone https://github.com/TristeTemps78/political.git
cd political && git checkout claude/french-election-civic-game-bd78uh
python3 -m http.server 8080        # ou : npx serve
```

Ouvrir http://localhost:8080 — idéalement dans une fenêtre de navigation privée
(profil vierge). Pas de build, pas de `npm install` pour jouer.

## 1. Boussole — le quiz systémique (5 min)

- [ ] Ouvrir un thème (ex. 🌍 Transition énergétique) : le bouton « Valider » doit rester
      grisé tant que les 12 points ne sont pas tous alloués.
- [ ] **Le cœur du concept** : impossible de tout financer — vérifier que mettre des points
      quelque part oblige à en retirer ailleurs (bouton + grisé à budget épuisé).
- [ ] Valider → toast « +25 capital », boussole à 4 axes affichée, top 3 des familles avec
      pourcentages, encart « Comprendre la perspective adverse ».
- [ ] **Test de nuance (bug corrigé, à confirmer visuellement)** : refaire le thème climat
      avec 12 points sur « Renouvelables », noter la position du point sur l'axe Écologie ;
      puis refaire avec 1 point Renouvelables + 11 Nucléaire → le point doit nettement
      bouger (avant correction, les deux donnaient exactement la même position saturée).
- [ ] Compléter les 6 thèmes → bonus « +50 profil complet 6/6 ».

## 2. Profil et guilde (2 min)

- [ ] Rejoindre une guilde. Elle apparaît dans la barre du haut.
- [ ] « Exporter mes données » → télécharge un JSON lisible avec tout votre état.
- [ ] **Vie privée, l'invariant du projet** : onglet Réseau des DevTools (F12) ouvert
      pendant que vous répondez à un quiz → aucune requête ne part (hors chargement
      initial des fichiers statiques).

## 3. Conquête — la carte des 577 circonscriptions (5 min)

- [ ] Cliquer une circonscription → panneau de détail ; « Investir 10 capital » plusieurs
      fois → à 5 points d'influence majoritaires, la cellule prend la couleur de votre
      guilde et le compteur de sièges passe à 1.
- [ ] Vérifier la riposte : à chaque investissement, les guildes rivales jouent — des
      cellules hachurées (contestées) apparaissent ailleurs sur la carte.
- [ ] Sans guilde ou sans capital → message d'erreur propre, pas de plantage.
- [ ] **Au clavier** : Tab jusqu'à la carte (un seul arrêt pour les 577 cellules), puis
      ←/→ (circonscription), ↑/↓ (département), Entrée (ouvrir), Entrée sur « Investir »
      → le focus reste sur le bouton pour enchaîner les investissements.

## 3 bis. Nouveautés rétention (5 min)

- [ ] **Partielles éclair** (onglet Conquête) : bandeau doré « Partielles du jour » listant
      4 circonscriptions ; leurs cellules pulsent sur la carte ; y investir donne
      **+2 influence** au lieu de +1 (vérifiable dans le détail).
- [ ] **Duel « Pensez comme l'adversaire »** (onglet Défis) : incarnez p. ex. le
      souverainisme sur le thème Europe — tout miser sur « Reprendre des compétences à
      l'UE » doit donner une similarité élevée et du capital ; l'allocation canonique de la
      famille est révélée après coup.
- [ ] **Défi entre amis** : créez un défi (thème complété requis), copiez le lien, ouvrez-le
      dans une **fenêtre privée** → l'app s'ouvre directement sur le défi, avec votre pseudo ;
      la prédiction se résout immédiatement et révèle les arbitrages.
- [ ] **Motion de censure** : difficile à atteindre naturellement en 20 min — pour la forcer,
      console (F12) : donnez ~35 circos à une famille puis investissez une fois n'importe où.
      Un bandeau rouge « Motion de censure contre… » doit apparaître sur la carte, et les
      circonscriptions du leader deviennent prenables par la coalition.

## 4. Hémicycle, Alliances, Défis-Scrutins (4 min)

- [ ] Hémicycle : vos circonscriptions conquises apparaissent colorées parmi les 577
      sièges ; basculer sur « Assemblée de démonstration » → composition fictive,
      étiquetée comme telle.
- [ ] Alliances : graphe de ~24 députés (fictifs, étiquetés démo) ; cliquer un nœud →
      fiche avec alliés de vote les plus proches, +1 capital par consultation
      (plafonné à 15/jour).
- [ ] Scrutins (bas de l’onglet Défis) : parier 5-50 sur un scrutin, « Simuler le vote (démo) » → gain 2× la mise
      ou perte ; impossible de re-parier sur le même scrutin.

## 5. Persistance et RGPD (2 min)

- [ ] Recharger la page (F5) : capital, guilde, conquêtes, boussole — tout doit être là.
- [ ] « Tout effacer définitivement » (Profil) → confirmation, puis état vierge complet.
- [ ] Mode sombre : basculer le thème de l'OS → l'interface suit sans rechargement.
- [ ] Mobile : réduire la fenêtre à ~400 px de large → navigation en bas, carte lisible.

## 5 bis. Mode Gouverner (8 min)

**Prérequis** : au moins 1 thème de la Boussole complété (bloque sinon l'accès, avec un lien
vers 🧭). Rejoindre une famille politique déclenche le lancement (pas besoin d'avoir rejoint
une guilde au préalable dans l'onglet Profil — le choix se fait sur l'écran de lancement).

- [ ] **Écran de lancement** (onglet 🇫🇷, en 1re position) : choisir une famille politique ;
      la case « Hériter du rapport de force de la carte Conquête » réutilise la composition de
      l'Assemblée construite dans l'onglet Conquête si elle existe, sinon une Assemblée par
      défaut (majorité relative, jamais absolue) est générée.
- [ ] **Boucle de décision mensuelle** : dans l'agenda législatif, « Proposer une réforme » →
      « Déposer un texte » → intentions de vote projetées par famille (Pour/Contre/Abstention
      sur 577 sièges) ; « Négocier » une famille non acquise coûte 20 capital et bascule son
      vote à « Pour ». « Mettre le texte au vote » ou « Engager la responsabilité (49.3) » —
      dans ce dernier cas, une motion de censure est jouée aussitôt ; si elle est rejetée, le
      texte passe et une usure de popularité s'applique (visible dans la jauge, puis s'estompe
      progressivement au fil des tours).
- [ ] **Réponse aux événements** : quand une crise survient (bandeau 🚨), les 2-3 réponses
      proposées ont des effets et un coût budgétaire différents ; « Ne pas intervenir » est
      toujours disponible.
- [ ] **Échéances du calendrier** (avancer les tours en jouant, ou observer si vous y êtes
      déjà) : européennes (tour 24) → bannière de résultat avec bouton « En savoir plus »
      ouvrant la fiche `abstention-participation` ; sénatoriales (tour 27) → passage du Sénat
      en hostile si la popularité est sous 45 %, surcoût visible ensuite sur le solde
      budgétaire ; municipales (tour 45) → chocs locaux (positifs et négatifs) visibles sur la
      carte de France.
- [ ] **Fiches « Le saviez-vous ? »** : la première lecture d'une fiche (49.3, motion de
      censure, dissolution, référendum, navette Sénat…) donne +5 capital, affiché dans la boîte
      de dialogue ; relire la même fiche plus tard ne redonne rien.
- [ ] **Fin de mandat** (tour 59/60, ou forcée par démission après 2 motions de censure
      adoptées) : écran dédié avec le verdict département par département sur la carte de
      France (couleur = pourcentage pour votre majorité), et la participation locale visible
      dans l'infobulle de chaque département.
- [ ] **Navigation clavier de la carte** : mêmes règles que la carte de Conquête — un seul
      arrêt de tabulation pour l'ensemble des départements, ←/→ et ↑/↓ pour se déplacer,
      Entrée pour ouvrir le détail d'un département.
- [ ] **Journal défilable au clavier** : Tab jusqu'au journal du mandat (ou du résumé de fin de
      mandat), puis flèches haut/bas pour faire défiler son contenu sans quitter le focus.

```bash
node --test tests/*.test.mjs        # inclut gouverner.test.mjs, personas.test.mjs,
                                     # assemblee.test.mjs, equilibrage-gouverner.test.mjs
node tools/simulate-gouverner.mjs 200   # attendu : réélection cohérente ~74 %, incohérente battue 100 %
node tools/a11y-audit.mjs           # prérequis décrits en tête du script (tools/a11y-audit.mjs)
```

## 6. Vérifications automatisées (optionnel, 2 min)

```bash
node --test tests/*.test.mjs   # attendu : 93/93 pass
node tools/simulate.mjs 500    # attendu : 1er contrôle ~5 investissements ; plafond solo ≪ 289
```

## Ce qu'il NE faut PAS attendre de cette version (périmètre assumé)

- Députés, scrutins et composition « démo » sont **fictifs** (données réelles de
  l'Assemblée nationale prévues en phase 2 via `js/adapter.js`).
- Le multijoueur de conquête est **simulé** par 6 guildes IA locales (backend réel
  spécifié pour la phase 3) — les défis entre amis existent (par lien), mais pas encore
  les guildes partagées sur une même carte.
- La carte est un **cartogramme** (1 cellule = 1 siège), pas un fond de carte géographique :
  c'est un choix documenté (`docs_architecture/00_analyse_technique.md` §1.1).

## Où signaler ce qui cloche

Notez onglet + action + résultat observé. Les invariants qui doivent tenir en toute
circonstance : total 577 sièges, majorité à 289, aucune requête réseau contenant vos
réponses, pas d'erreur dans la console (F12).
