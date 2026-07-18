# 03 — Boucle de jeu et équilibrage de la ludification

## Boucle principale (30 secondes → 3 semaines)

```
 Apprendre ──────────► Gagner du capital ──────────► Conquérir ──────────► Comprendre
 (quiz systémique,     (récompenses liées à          (investir sur la      (hémicycle 577 sièges,
  allocation de         l'effort cognitif,            carte des 577         graphe d'alliances,
  budget, coût          jamais au temps passé         circonscriptions,     mode de scrutin,
  d'opportunité)        ni au paiement)               objectif 289)         majorité absolue)
        ▲                                                                        │
        └───────────────── Prédictions sur scrutins (retour à l'actualité) ◄─────┘
```

Chaque strate correspond à un pilier du cahier des charges :
1. **Apprentissage nuancé** : pas de swipe binaire — chaque thème impose de répartir un budget
   limité (12 pts) entre 4 politiques ; l'utilisateur vit le coût d'opportunité. La restitution
   montre les 4 axes et les 3 familles les plus proches, avec un texte « comprendre les
   perspectives adverses » (dimension socio-émotionnelle).
2. **Métajeu de monopolisation** : capital → influence sur des circonscriptions réelles ;
   une guilde contrôle une circo si son influence y est ≥ 5 ET strictement majoritaire.
   Victoire de campagne : 289 circonscriptions (majorité absolue réelle de l'Assemblée).
3. **Hémicycle connecté** : la composition virtuelle (issue de la carte) et la composition de
   démonstration se comparent dans le même hémicycle ; le graphe d'alliances enseigne les
   coalitions objectives ; les prédictions sur scrutins ramènent vers l'actualité réelle.

## Économie du capital politique (constantes `ECONOMIE`, js/guilds.js)

| Source / dépense | Valeur | Justification |
|---|---|---|
| Thème de quiz complété (1re fois) | **+25** | Récompense l'apprentissage, source principale en début de partie. 6 thèmes = 150 pts ≈ 15 conquêtes de départ. |
| Profil complet (6/6 thèmes) | **+50** bonus | Incite à couvrir tous les sujets, pas seulement les clivants (contre-mesure au biais Elyze). |
| Prédiction de scrutin exacte | **+2 × mise** | Le pari perdu coûte la mise : lire le contexte du scrutin devient rationnel. |
| Consultation d'une fiche député (démo) | **+1** (plafond 15/jour) | Micro-récompense d'exploration, plafonnée pour éviter le farm par clics. |
| Investir 1 point d'influence | **−10** | Ratio réglé pour qu'un joueur assidu contrôle ~5-15 circos ; 289 exige la coopération de guilde (multijoueur = nécessité structurelle, pas gadget). |
| Mise minimale / maximale d'un pari | 5 / 50 | Borne le risque de ruine et l'exploit de martingale. |

| Duel « Pensez comme l'adversaire » (similarité ≥ 0,8 / ≥ 0,6) | **+20 / +8** (max 3/jour) | Récompense l'empathie politique (effet Protée) ; gratuit à jouer — l'échec n'est pas puni, c'est un entraînement. |
| Défi entre amis (mise fixe 10, gain 20 si prédiction exacte) | **net +10 / −10** (max 5/jour) | La compétition sociale porte sur la COMPRÉHENSION de l'autre, pas sur la vitesse. Plafonné contre le farm à deux comptes. |
| Élection partielle (quotidienne, 4 circos tirées par date) | **influence ×2** | Rendez-vous quotidien non punitif : rater une partielle ne retire rien. Tirage déterministe par date → identique pour tous sans serveur. |
| Récompenses de censure (défense réussie / coalition victorieuse) | **+30 / +20** | Donne un enjeu au endgame dans les deux camps. |

Aucun achat en monnaie réelle, aucun gain lié au temps de présence : le capital mesure
exclusivement l'effort d'apprentissage. (Anti-dark-patterns : pas de streak punitif,
pas de FOMO minuté — les partielles créent un rendez-vous, jamais une pénalité d'absence.)

## Les trois moteurs de rétention (ajoutés le 2026-07-16)

1. **Élections partielles éclair** (le rendez-vous) : chaque jour, 4 circonscriptions
   tirées déterministement par la date passent en « partielle » — influence doublée,
   bandeau sur la carte, cellules pulsantes. Les IA les disputent (50 % des guildes y
   consacrent leur premier point), garantissant des batailles quotidiennes visibles.
2. **Duels de débat** (l'autre joueur) : entraînement contre l'allocation canonique d'une
   famille (softmax déterministe sur utilité = vecteur famille × effets des options,
   `js/duels.js`) et défi entre amis par lien auto-porteur (base64url du thème + arbitrages
   + pseudo — AUCUN serveur, le code EST le message ; validation stricte anti-triche :
   somme = budget). Canal viral de l'application.
3. **Motion de censure** (le drame de fin de partie) : quand un leader contrôle ≥ 30 sièges
   ET ≥ 40 % des circonscriptions contrôlées, les oppositions se coalisent pendant 20 tours —
   sur les circonscriptions du leader, sa guilde doit dominer la SOMME des influences
   adverses. Les IA attaquent ses marges les plus fragiles ; la cible défend. Résout le
   problème du runaway leader et enseigne la mécanique réelle des coalitions d'opposition.
   Cooldown de 40 tours entre deux motions.

## Guildes rivales simulées (avant le multijoueur réel)

6 IA (une par famille non choisie) jouent à chaque « tick » (action du joueur ou ouverture de
l'app) : chacune investit un budget borné sur des circos choisies par un PRNG déterministe
ensemencé (`monde.seed`) — parties reproductibles, équilibrage testable. Difficulté douce :
budget IA ∝ avance du joueur (rubber-banding plafonné à ×1,5).

## Équilibrages — VALIDÉS le 2026-07-16 (`tools/simulate.mjs`, `tests/affinity.test.mjs`)

- ✅ 1re circonscription contrôlée : 5 investissements (50 capital) dans 100 % de
  1 000 parties simulées — sous la cible « < 10 min » (≈ 2 thèmes de quiz suffisent).
- ✅ Plafond solo : 34,7 sièges en moyenne, 39 au maximum (200 parties à 2 000 capital)
  — un joueur seul ne peut pas approcher 289 ; la majorité exige la guilde.
- ✅ Équité inter-familles : écart-type des affinités moyennes < 0,05 sur 3 000 profils
  aléatoires, et chaque famille arrive en tête sur > 2 % des profils (après étalonnage de
  l'instrument et passage à la similarité cosinus — voir 01_memory_lessons.md).

Ces trois propriétés sont désormais des tests exécutés en CI : toute modification du
contenu éditorial (THEMES) ou des constantes ECONOMIE qui les casse fera échouer le build.

## Boucle du mandat Gouverner (`finDeTour()`, js/gouverner.js)

1 tour = 1 mois, 60 tours (juin 2027 → mai 2032). `finDeTour(g, decision)` reçoit la décision
du mois (réforme votée à l'Assemblée, réponse à un événement, ou rien) et applique, dans
l'ordre, les 7 phases commentées dans le code :

1. **Effets → ligne politique** : les effets de la décision alimentent `g.ligne` par moyenne
   mobile (poids `LIGNE_LISSAGE`) — la ligne suivie reflète la tendance du mandat, pas le
   dernier coup de barre.
2. **Réactions des personas** : chaque persona réagit (`reagirPersona`, produit scalaire de
   son vecteur idéologique et de la direction des effets, pondéré par sa sensibilité) ; un
   récit est tiré par le PRNG seedé du tour et journalisé si la réaction est non nulle.
3. **Décroissance** : les humeurs s'estompent de `DECAY_HUMEUR` (10 %/tour) et les chocs
   locaux de `DECAY_CHOC` (15 %/tour) — rien n'est figé pour un mandat de 5 ans ; un choc
   déclaré ce mois-ci (`decision.choc`) est appliqué avant la décroissance.
4. **Jauges** : la popularité est **recalculée entièrement** depuis la moyenne pondérée des
   humeurs (jamais stockée comme un simple delta) ; le solde budgétaire encaisse le coût de la
   décision, majoré de `SURCOUT_NAVETTE_SENAT_HOSTILE` si le Sénat est hostile. L'usure du
   49.3 (`USURE_493`) est appliquée aux humeurs, pas directement à la popularité — sinon un
   malus « en dur » s'évaporerait dès le recalcul du tour suivant.
5. **Opposition** : si l'Assemblée est hostile (< `SEUIL_HOSTILITE_ASSEMBLEE` de sièges) et la
   popularité basse (< `SEUIL_CENSURE_SPONTANEE`), une motion de censure spontanée peut être
   adoptée (`PROBA_CENSURE_SPONTANEE` par tour) — mécanique minimale, distincte du vote
   complet à 289 voix de `js/assemblee.js:voterCensure`.
6. **Calendrier et événements** : reconnaissance d'une échéance du calendrier (PLF,
   européennes, sénatoriales, municipales — cf. `js/mandat.js:CALENDRIER`) puis, si aucune
   fin n'est encore actée, tirage déterministe d'un nouvel événement (`PROBA_EVENEMENT`).
7. **Avancement** : `g.tour += 1` ; au tour 60, si le mandat n'est pas déjà terminé
   (démission), `election2032()` calcule le verdict département par département.

### Économie du mode Gouverner (constantes `ECONOMIE_GOUVERNER`, js/gouverner.js)

| Constante | Valeur | Justification |
|---|---|---|
| `POPULARITE_INIT` | 52 | Léger état de grâce post-élection, sans excès. |
| `K_REACTION` | 35 | Calibré pour qu'un produit scalaire ∈ [-1,1] × sensibilité produise au plus ±25 de réaction (borne dans `reagirPersona`). |
| `USURE_493` | 6 | Coût de popularité du 49.3 : contourner le débat a un prix politique (appliqué à l'humeur, cf. phase 4 ci-dessus). |
| `COUT_NEGOCIER` | 20 | Capital dépensé pour négocier un vote (`js/assemblee.js:negocier`). |
| `RECOMP_FICHE` | 5 | Capital gagné à la 1re lecture d'une fiche « Le saviez-vous ? ». |
| `DECAY_HUMEUR` | 0,1 (10 %/tour) | Les humeurs s'estompent : rien n'est figé pour tout un mandat. |
| `DECAY_CHOC` | 0,15 (15 %/tour) | Les chocs locaux (crises ponctuelles) s'atténuent plus vite que les humeurs de fond. |
| `LIGNE_LISSAGE` | 0,15 | Poids de la décision du mois dans la moyenne mobile de la ligne politique. |
| `RECITS_MAX` | 12 | Plafond de récits par persona (mémoire bornée, cf. schéma v3). |
| `JOURNAL_MAX` | 12 | Plafond du journal (mémoire bornée, cf. schéma v3). |
| `SEUIL_HOSTILITE_ASSEMBLEE` | 0,35 | Gouvernement minoritaire si < 35 % des sièges — condition de censure spontanée. |
| `SEUIL_CENSURE_SPONTANEE` | 30 | Popularité en dessous de laquelle une censure spontanée devient possible. |
| `PROBA_CENSURE_SPONTANEE` | 0,12 | Probabilité par tour, sous condition — crédible sans être systématique. |
| `CENSURES_AVANT_DEMISSION` | 2 | 2 motions adoptées → démission (fin de partie). |
| `PROBA_EVENEMENT` | 0,35 | ~1 crise tous les 3 tours en moyenne — rythme d'un mandat réel. |
| `SOLDE_INIT` | −40 Md€/an | Déficit de départ réaliste (ordre de grandeur pédagogique). |
| `SIGMOID_K_VERDICT` | 40 | Pente de la logistique humeur→soutien : à ±40 d'humeur (rarement dépassé), le soutien est déjà nettement majoritaire/minoritaire (≈73 %/27 %) sans jamais saturer 0/100 %. |
| `VOTE_BARRAGE_2032` | 3 | Cf. encart dédié ci-dessous. |
| `SEUIL_EUROPEENNES_MALUS` | 45 | Un score < 45 % à ce scrutin-sondage grandeur nature (participation plus faible, vote plus contestataire) se lit comme un désaveu net. |
| `MALUS_EUROPEENNES_HUMEUR` | 4 | Sanction politique modérée (environ 2/3 de `USURE_493`) : l'onde de choc d'un mauvais résultat intermédiaire, sans plomber tout le mandat. |
| `SEUIL_SENAT_HOSTILE` | 45 | Sous 45 % de popularité au renouvellement partiel, le collège des grands électeurs (élus locaux, plus lents à bouger que l'opinion) bascule contre le gouvernement. |
| `SURCOUT_NAVETTE_SENAT_HOSTILE` | 0,15 | Cf. encart dédié ci-dessous. |
| `N_DEPTS_CHOC_MUNICIPALES` | 3 | Aux municipales, les 3 départements aux deux extrêmes de l'humeur reçoivent un choc local : lisible sur la carte, pas un bruit généralisé. |
| `CHOC_MUNICIPALES_NEGATIF` / `CHOC_MUNICIPALES_POSITIF` | −8 / +4 | Cf. encart dédié ci-dessous (asymétrie sanction/récompense). |

**`VOTE_BARRAGE_2032` (décalage de +3 sur l'humeur avant sigmoïde, au second tour 2032)** —
modélise le vote barrage (« au premier tour on choisit, au second on élimine ») : un électeur
légèrement déçu vote quand même pour le sortant « contre l'alternative ». Calibré par
simulation (200 mandats, `tools/simulate-gouverner.mjs`) : à 0, la stratégie cohérente n'est
réélue que dans 50 % des cas (la médiane des humeurs tombe pile sur le seuil de la
sigmoïde) ; à 3, elle passe à 74 % — un bon mandat est récompensé, sans que la réélection ne
devienne automatique (la stratégie incohérente, elle, reste battue à 100 %).

**`SURCOUT_NAVETTE_SENAT_HOSTILE` (+15 % sur le coût budgétaire d'une décision)** — quand le
Sénat est hostile (cf. `SEUIL_SENAT_HOSTILE`), la navette parlementaire qui s'éternise (allers-
retours, commission mixte paritaire, dernier mot laissé à l'Assemblée) renchérit le compromis
final, sans le rendre impossible. Appliqué à toute décision de coût, tous types confondus
(réforme votée, réponse à un événement, PLF) — distinguer précisément l'origine d'un coût
demanderait de faire transiter un identifiant depuis `assemblee.js`/`mandat.js`, hors
périmètre de ce modèle.

**Chocs des municipales, asymétriques (−8 / +4)** — l'ancrage local se retourne contre (ou
pour) le gouvernement dans les départements aux extrêmes de l'humeur. La récompense
(`CHOC_MUNICIPALES_POSITIF` = +4) est deux fois plus faible que la sanction
(`CHOC_MUNICIPALES_NEGATIF` = −8) : asymétrie documentée, l'électorat sanctionne plus qu'il ne
récompense.

**Participation et abstention (`js/personas.js:PARTICIPATION`)** — chaque persona porte un
taux de participation électorale ∈ [0,1] selon son rapport à la politique (conviction 0,88,
engagement 0,85, … jusqu'à abstention 0,3), stable dans le temps (indépendant de l'humeur du
moment). Cette table pondère les scrutins intermédiaires (européennes) et le verdict 2032 :
un persona mécontent qui vote pèse contre le gouvernement, un persona content mais
abstentionniste ne le sauve pas — la mécanique rend visible que l'abstention n'est pas neutre.

### Équilibrage — mode Gouverner (`tests/equilibrage-gouverner.test.mjs`, `tools/simulate-gouverner.mjs`)

Même méthode que la Conquête : deux stratégies scriptées (« cohérente » — alignée sur une
ligne politique fixe, budget surveillé ; « incohérente » — zigzag contradictoire, 49.3
systématique tous les 4 tours, dépenses non maîtrisées) jouent des mandats complets de
60 tours avec le **vrai moteur**, à seeds fixes → résultat déterministe d'une exécution à
l'autre.

- ✅ Stratégie cohérente réélue sur ≥ 60 % des mandats — **mesuré 74 %** (100 mandats).
- ✅ Stratégie incohérente battue sur ≥ 80 % des mandats — **mesuré 100 %** (100 mandats).
- ✅ La cohérence paie sur les deux jauges (popularité et solde finaux, en moyenne).
- ✅ Aucun mandat ne reste inachevé (le moteur termine toujours en ≤ 65 tours).

Ces quatre propriétés sont des tests exécutés en CI : toute modification d'`ECONOMIE_GOUVERNER`
ou d'`ECONOMIE_ASSEMBLEE` qui les casse fera échouer le build.
