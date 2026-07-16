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
