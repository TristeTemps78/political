# Guide de test manuel — PolitiQuest 2027

Branche : `claude/french-election-civic-game-bd78uh`. Durée totale : ~20 minutes.

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

## 4. Hémicycle, Alliances, Scrutins (4 min)

- [ ] Hémicycle : vos circonscriptions conquises apparaissent colorées parmi les 577
      sièges ; basculer sur « Assemblée de démonstration » → composition fictive,
      étiquetée comme telle.
- [ ] Alliances : graphe de ~24 députés (fictifs, étiquetés démo) ; cliquer un nœud →
      fiche avec alliés de vote les plus proches, +1 capital par consultation
      (plafonné à 15/jour).
- [ ] Scrutins : parier 5-50 sur un scrutin, « Simuler le vote (démo) » → gain 2× la mise
      ou perte ; impossible de re-parier sur le même scrutin.

## 5. Persistance et RGPD (2 min)

- [ ] Recharger la page (F5) : capital, guilde, conquêtes, boussole — tout doit être là.
- [ ] « Tout effacer définitivement » (Profil) → confirmation, puis état vierge complet.
- [ ] Mode sombre : basculer le thème de l'OS → l'interface suit sans rechargement.
- [ ] Mobile : réduire la fenêtre à ~400 px de large → navigation en bas, carte lisible.

## 6. Vérifications automatisées (optionnel, 2 min)

```bash
node --test tests/*.test.mjs   # attendu : 17/17 pass
node tools/simulate.mjs 500    # attendu : 1er contrôle ~5 investissements ; plafond solo ≪ 289
```

## Ce qu'il NE faut PAS attendre de cette version (périmètre assumé)

- Députés, scrutins et composition « démo » sont **fictifs** (données réelles de
  l'Assemblée nationale prévues en phase 2 via `js/adapter.js`).
- Le multijoueur est **simulé** par 6 guildes IA locales (backend réel spécifié pour la
  phase 3) — pas encore d'invitations entre amis.
- La carte est un **cartogramme** (1 cellule = 1 siège), pas un fond de carte géographique :
  c'est un choix documenté (`docs_architecture/00_analyse_technique.md` §1.1).

## Où signaler ce qui cloche

Notez onglet + action + résultat observé. Les invariants qui doivent tenir en toute
circonstance : total 577 sièges, majorité à 289, aucune requête réseau contenant vos
réponses, pas d'erreur dans la console (F12).
