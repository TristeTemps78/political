# 02 — Schémas de données, modèles et contrats d'API

## 1. Persistance locale (terminal utilisateur uniquement)

Clé `localStorage` : `politiquest2027.v1` — JSON versionné (`SCHEMA_VERSION = 1`).

```jsonc
{
  "version": 1,
  "profil": {                       // ⚠ DONNÉES SENSIBLES — ne quittent JAMAIS le terminal
    "reponses": { "climat": {"optA": 4, "optB": 6, ...}, ... },  // allocations par thème
    "axes": { "eco": -0.3, "societe": 0.5, "ecologie": 0.7, "europe": 0.1 }, // ∈ [-1, 1]
    "affinites": [ { "familleId": "eco-sociale", "score": 0.82 }, ... ]
  },
  "joueur": {
    "pseudo": "…",                  // libre, local
    "guildeId": "eco-sociale",      // famille rejointe (ou null)
    "capital": 120,                  // capital politique courant
    "capitalTotal": 340,             // cumul gagné (progression)
    "quizFaits": ["climat", ...],
    "paris": [ { "scrutinId": "s-demo-1", "mise": 20, "position": "adopte", "resolu": false } ]
  },
  "monde": {                         // état de la simulation locale de conquête
    "influence": { "075-01": { "eco-sociale": 12, "lib-europeen": 5 }, ... },
    "tick": 42, "seed": 1337
  }
}
```

## 2. Référentiel territorial (`js/data.js`)

- `DEPARTEMENTS: { code, nom, region, circos }[]` — répartition du découpage 2010
  (539 métropole + 27 outre-mer + 11 Français de l'étranger = **577**, somme assertée).
- Identifiant de circonscription : `"<codeDept>-<nn>"` (ex. `"075-03"`), zéro-paddé.
- `MAJORITE_ABSOLUE = 289`.

## 3. Modèles idéologiques (`js/data.js`, `js/affinity.js`)

4 axes ∈ [-1, 1] : `eco` (marché ↔ intervention), `societe` (conservateur ↔ libéral),
`ecologie` (productivisme ↔ priorité écologique), `europe` (souveraineté ↔ intégration).

- `FAMILLES: { id, nom, couleur, vecteur: {eco, societe, ecologie, europe}, description }[]` — 7 familles génériques.
- `THEMES: { id, titre, budget, options: { id, libelle, effets: vecteurPartiel, note }[] }[]` — 6 thèmes,
  réponse par allocation d'un budget de points entre 4 options (coût d'opportunité).
- Affinité = 1 − distance euclidienne normalisée entre le vecteur utilisateur (moyenne pondérée
  des allocations) et le vecteur famille. Code en clair, destiné à une publication AGPL-3.0.

## 4. Contrat du futur backend multijoueur (phase 3 — NON implémenté)

Principe : le serveur ne connaît **que** des pseudonymes aléatoires et des deltas d'influence.
Jamais de réponses de quiz, jamais de vecteur d'axes, jamais d'affinité.

```
POST /v1/session        → { playerToken }           (aléatoire, sans identité)
POST /v1/guildes        → { guildeId, invitCode }
POST /v1/influence      { circoId, guildeId, montant }   // débité du capital, plafonné/fenêtre
WS   /v1/monde          ← flux d'agrégats { circoId, parGuilde: {guildeId: total} }
GET  /v1/scrutins       ← proxy en cache des scrutins réels (voir §5), jamais l'inverse
```
Anti-abus : plafond de dépense glissant, signature HMAC du solde côté serveur, état autoritaire.

## 5. Adaptateur de données réelles (`js/adapter.js`)

Interface `DataAdapter` : `getDeputes()`, `getScrutins()`, `getVotes(scrutinId)`.
- `MockAdapter` (actif) : jeux de démonstration embarqués, étiquetés dans l'UI.
- `RemoteAdapter` (squelette) : cible `data.assemblee-nationale.fr` (licence ouverte Etalab),
  via JSON statiques pré-agrégés au build — le client ne frappe pas l'API en direct.
  L'API tierce « CIVIX » citée par le cahier des charges reste à auditer (existence, licence)
  avant tout câblage.

Modèles :
```
Depute  { id, nom, groupe, circoId, loyaute ∈ [0,1] }          // démo : fictifs
Scrutin { id, titre, date, statut: "a_venir"|"clos", resultat?: "adopte"|"rejete", cote }
Vote    { scrutinId, deputeId, position: "pour"|"contre"|"abstention" }
```
Le graphe d'alliances (`js/graph.js`) se construit à partir des `Vote` : arête entre deux
députés si similarité de vote > seuil (0,7) ; poids = taux d'accord.
