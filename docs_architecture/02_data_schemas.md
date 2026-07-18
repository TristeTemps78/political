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

## 6. Mode Gouverner (`js/gouverner.js`, `js/assemblee.js` — schéma v3)

`monde.gouverner` (voir §1) — état complet d'un mandat, produit par `creerPartie()` et muté
uniquement par `finDeTour()` (moteur pur, testable sous Node) et par les fonctions de
`js/assemblee.js` (couche institutionnelle). `null` = aucune partie en cours ; c'est ce champ
qui fait de l'onglet Gouverner l'écran d'accueil par défaut au chargement (`js/app.js`).

```jsonc
{
  "seed": 1234,                     // graine du PRNG (mulberry32) — déterminisme total du mandat
  "tour": 23,                       // 0 (juin 2027) → 59 (mai 2032) ; 1 tour = 1 mois
  "familleId": "social-democrate",  // famille incarnée (js/data.js:FAMILLES)
  "coalition": [],                  // familles alliées votant systématiquement « pour » (crochet, non peuplé en E7)
  "assemblee": { "social-democrate": 210, "...": "..." }, // sièges par famille, Σ = 577 (CIRCOS.length), aucune ≥ 289 (majorité relative garantie)
  "jauges": { "popularite": 52, "solde": -40 },  // popularite ∈ [0,100], dérivée des humeurs chaque tour ; solde en Md€/an, cumulatif
  "ligne": { "eco": 0.1, "societe": -0.2, "ecologie": 0, "europe": 0.3 }, // moyenne mobile des effets votés (LIGNE_LISSAGE)
  "personas": {                     // une entrée par persona fictif de js/personas.js:PERSONAS (10, fixes)
    "nadia": { "humeur": 12, "recits": ["« ... »"] } // humeur ∈ [-100,100] ; recits plafonné à RECITS_MAX (12), FIFO
  },
  "chocs": { "059": -6.4 },          // creux/pics locaux (crise territoriale, municipales), par code département —
                                      // objet SPARSE : entrée supprimée dès que |valeur| < 0.5 (DECAY_CHOC)
  "senatHostile": false,             // bascule aux sénatoriales (t=27) si popularité < SEUIL_SENAT_HOSTILE
  "x493": 1,                         // nombre de fois où l'art. 49.3 a été engagé
  "dissolutionFaite": false,         // une seule dissolution possible par mandat (art. 12)
  "referendumsFaits": 0,             // plafond REFERENDUMS_MAX = 2 (js/assemblee.js:ECONOMIE_ASSEMBLEE)
  "censures": 0,                     // motions de censure adoptées ; CENSURES_AVANT_DEMISSION (2) déclenche `fin`
  "enCours": null,                   // texte en discussion : { reformeId, phase: "depot"|"censure", soutiens: [familleId] } — machine à états de js/assemblee.js
  "evenementEnCours": null,          // dernier événement tiré, en attente d'une réponse : { id, titre } (js/mandat.js:EVENEMENTS)
  "fichesVues": ["article-49-3"],    // ids des fiches « Le saviez-vous ? » déjà consultées (récompense de 1re lecture uniquement) ;
                                      // borné naturellement par le nombre fini de fiches (js/fiches.js), pas de plafond dédié
  "journal": ["🏛️ ..."],             // plafonné à JOURNAL_MAX (12), FIFO — texte libre, non structuré
  "fin": null,                       // { type: "reelu"|"battu"|"censure"|"demission", tour, verdict? } — cf. ci-dessous
  "derniereEcheance": null           // { type, tour, fiche, resultat } — cf. ci-dessous
}
```

### `derniereEcheance` — dernière échéance électorale intermédiaire résolue

Écrasé à chaque nouvelle échéance (européennes t=24, sénatoriales t=27, municipales t=45) :
un seul petit objet, jamais un tableau qui grossirait sans borne. Champ d'état dédié plutôt
qu'un parsing du journal (plafonné et purement textuel, impropre à piloter de façon fiable un
bouton « voir la fiche » côté UI).

```jsonc
{ "type": "europeennes", "tour": 24, "fiche": "abstention-participation",
  "resultat": { "score": 41, "participation": 52, "malus": true } }
```
La forme de `resultat` dépend de `type` :
- `europeennes` → `{ score, participation, malus }` (score et participation ∈ [0,100] entiers)
- `senatoriales` → `{ senatHostile, popularite }`
- `municipales` → `{ deptsChocNegatif: [code…], deptsChocPositif: [code…] }`

### `fin` — issue du mandat

```jsonc
{
  "type": "reelu",     // "reelu" | "battu" (verdict d'election2032) | "demission" (2 censures adoptées)
  "tour": 59,
  "verdict": {          // présent uniquement pour reelu/battu, produit par election2032()
    "parDept": { "075": 54, "059": 47 }, // pourcentage ENTIER pour le gouvernement, par code département
                                          // (entier : contrainte de taille localStorage)
    "national": 51,      // part des CIRCONSCRIPTIONS des départements gagnés — pas un simple compte de
                          // départements : un grand département gagné pèse plus qu'un petit
    "participation": 61  // participation nationale simulée, pondérée par circonscriptions
  }
}
```
Le type `"censure"` est prévu par le commentaire de `creerPartie()` et par le libellé
correspondant côté UI (`js/gouverner-ui.js:LIBELLES_FIN`), mais n'est produit par aucun chemin
de code actuel : une motion de censure adoptée incrémente `censures` et ne termine le mandat
qu'à la deuxième occurrence, sous le type `"demission"` (cf. `CENSURES_AVANT_DEMISSION`,
`js/assemblee.js:voterCensure`).

### Invariants

- **Humeur départementale et participation par département ne sont jamais stockées** :
  toujours dérivées à la volée depuis `g.personas[...].humeur` via `poidsSegments()`
  (js/personas.js), par `humeurDepartement()` et `participationDepartement()`
  (js/gouverner.js). Seuls les chocs locaux (`chocs`) sont persistés, car ils ne se déduisent
  d'aucune autre donnée.
- **Plafonds bornant la croissance de l'état** dans localStorage : `journal` (JOURNAL_MAX=12,
  FIFO) et `recits` par persona (RECITS_MAX=12, FIFO) — un mandat dure 60 tours, ces tableaux
  ne doivent jamais croître sans limite.
- **`SCHEMA_VERSION = 3`** (`js/store.js`), avec migration explicite : v1→v2 ajoute
  `joueur.duels` et `monde.censure` ; v2→v3 ajoute `monde.gouverner: null`. Une partie
  Gouverner créée sous le schéma v3 n'a jamais besoin d'être relue par une version antérieure
  du code — seule la forme retournée par `creerPartie()` fait foi.
