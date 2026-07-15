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

### Incidents / pièges rencontrés
- `curl data.gouv.fr` → 403 CONNECT via proxy : ne pas re-tenter en boucle, l'égresse est
  une liste blanche. Prévoir les jeux de données en fixtures versionnées.
- Répartition des 577 circonscriptions par département reconstituée de mémoire (découpage
  2010 en vigueur) et verrouillée par l'assertion de somme ; à re-valider contre le
  référentiel officiel INSEE/Ministère de l'Intérieur en phase 2 avant toute publication.
