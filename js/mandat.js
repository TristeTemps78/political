// Calendrier institutionnel, événements et réformes du mode Gouverner.
// 1 tour = 1 mois ; tour 0 = juin 2027 (élections législatives), tour 59 = mai 2032
// (fin de mandat). Échéances réelles de la Ve République, réponses fictives.

import { THEMES } from './data.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

// Convertit un numéro de tour en date lisible (tour 0 = juin 2027).
export function dateDuTour(tour) {
  const total = 5 + tour; // juin = index 5 dans MOIS
  const annee = 2027 + Math.floor(total / 12);
  const mois = MOIS[total % 12];
  return { mois, annee, libelle: `${mois} ${annee}` };
}

// Échéances réelles du mandat 2027-2032. Le détail électoral (composition,
// verdict) arrive en E6 ; ici on ne fait que RECONNAÎTRE l'échéance dans le
// journal — c'est le crochet demandé par le plan pour cette étape.
export const CALENDRIER = [
  { tour: 4, type: 'plf', libelle: 'Projet de loi de finances 2028 (automne 2027)' },
  { tour: 16, type: 'plf', libelle: 'Projet de loi de finances 2029' },
  { tour: 24, type: 'europeennes', libelle: 'Élections européennes 2029' },
  { tour: 27, type: 'senatoriales', libelle: 'Élections sénatoriales (renouvellement partiel)' },
  { tour: 28, type: 'plf', libelle: 'Projet de loi de finances 2030' },
  { tour: 40, type: 'plf', libelle: 'Projet de loi de finances 2031' },
  { tour: 45, type: 'municipales', libelle: 'Élections municipales 2031' },
  { tour: 52, type: 'plf', libelle: 'Projet de loi de finances 2032' },
  { tour: 58, type: 'presidentielle-1', libelle: 'Élection présidentielle 2032 — premier tour' },
  { tour: 59, type: 'presidentielle-2', libelle: 'Élection présidentielle 2032 — second tour / fin de mandat' },
];

// ~18 crises fictives ancrées dans de vrais enjeux de politique française.
// Chaque réponse porte des `effets` (vecteur partiel sur les 4 axes, même
// mécanique que THEMES) et un `cout` budgétaire ponctuel (Md€, négatif = dépense).
// `local: true` signale une crise territoriale : `deptsPossibles` liste des
// départements plausibles pour le choc local (résolu par l'appelant, cf. gouverner.js).
export const EVENEMENTS = [
  { id: 'urgences-hopital', titre: 'Urgences hospitalières saturées', local: false,
    texte: 'Plusieurs services d’urgence ferment temporairement faute de personnel.',
    reponses: [
      { id: 'plan-urgence-soignants', libelle: 'Plan d’urgence : primes et recrutements', effets: { eco: 0.6, societe: 0.2 }, cout: -3.5 },
      { id: 'reorganisation-filiere', libelle: 'Réorganiser la filière sans rallonge budgétaire', effets: { eco: -0.3, societe: -0.2 }, cout: 0 },
      { id: 'appel-reserve-sanitaire', libelle: 'Appeler la réserve sanitaire en renfort ponctuel', effets: { societe: 0.1 }, cout: -0.8 },
    ] },
  { id: 'crise-agricole', titre: 'Colère agricole sur les prix et les normes', local: false,
    texte: 'Blocages routiers dans plusieurs régions agricoles pour dénoncer prix et charges administratives.',
    reponses: [
      { id: 'aides-agriculteurs', libelle: 'Aides directes et simplification des normes', effets: { eco: -0.2, ecologie: -0.4 }, cout: -2.2 },
      { id: 'prix-plancher', libelle: 'Instaurer des prix planchers garantis', effets: { eco: 0.5 }, cout: -1.5 },
      { id: 'maintien-cap-vert', libelle: 'Maintenir le cap écologique sans concession', effets: { ecologie: 0.5, eco: 0.2 }, cout: 0 },
    ] },
  { id: 'secheresse', titre: 'Sécheresse sévère et restrictions d’eau', local: true,
    deptsPossibles: ['032', '048', '066', '084', '011'],
    texte: 'Une sécheresse prolongée touche un bassin agricole, restrictions d’eau et récoltes menacées.',
    reponses: [
      { id: 'indemnisation-secheresse', libelle: 'Indemniser les exploitants touchés', effets: { eco: 0.3 }, cout: -1.2 },
      { id: 'plan-eau-infrastructures', libelle: 'Plan d’infrastructures de gestion de l’eau', effets: { ecologie: 0.5, eco: 0.2 }, cout: -2.0 },
      { id: 'sobriete-eau-obligatoire', libelle: 'Imposer une sobriété hydrique généralisée', effets: { ecologie: 0.6, societe: -0.3 }, cout: -0.3 },
    ] },
  { id: 'crise-logement', titre: 'Crise du logement dans les zones tendues', local: false,
    texte: 'Les loyers et le prix du foncier s’envolent dans les grandes agglomérations.',
    reponses: [
      { id: 'encadrement-loyers-national', libelle: 'Étendre l’encadrement des loyers', effets: { eco: 0.4, societe: 0.2 }, cout: -0.5 },
      { id: 'construction-massive', libelle: 'Plan de construction massif', effets: { eco: -0.3, ecologie: -0.3 }, cout: -3.0 },
      { id: 'aides-accession', libelle: 'Aides ciblées à l’accession à la propriété', effets: { eco: -0.4 }, cout: -1.8 },
    ] },
  { id: 'degradation-dette', titre: 'Avertissement sur la trajectoire de la dette', local: false,
    texte: 'Une agence de notation signale un risque de dégradation si la trajectoire budgétaire ne s’infléchit pas.',
    reponses: [
      { id: 'plan-economies', libelle: 'Plan d’économies dans la dépense publique', effets: { eco: -0.6 }, cout: 3.5 },
      { id: 'hausse-ciblee-impots', libelle: 'Hausse ciblée sur les hauts revenus', effets: { eco: 0.5 }, cout: 2.0 },
      { id: 'statu-quo-assume', libelle: 'Assumer la trajectoire actuelle sans inflexion', effets: {}, cout: -0.5 },
    ] },
  { id: 'tensions-urbaines', titre: 'Tensions urbaines après une intervention policière', local: false,
    texte: 'Plusieurs nuits de tensions dans des quartiers populaires après un contrôle qui a mal tourné.',
    reponses: [
      { id: 'dialogue-mediation', libelle: 'Plan de médiation et de dialogue local', effets: { societe: 0.5 }, cout: -0.6 },
      { id: 'fermete-securitaire', libelle: 'Réponse ferme : renforts de police', effets: { societe: -0.6 }, cout: -1.0 },
      { id: 'enquete-independante', libelle: 'Ouvrir une enquête indépendante et transparente', effets: { societe: 0.3 }, cout: -0.1 },
    ] },
  { id: 'greve-transports', titre: 'Grève générale dans les transports', local: false,
    texte: 'Un mouvement social paralyse les transports publics sur fond de désaccord social.',
    reponses: [
      { id: 'negociation-sociale', libelle: 'Ouvrir une négociation sociale large', effets: { eco: 0.3, societe: 0.2 }, cout: -0.4 },
      { id: 'service-minimum', libelle: 'Imposer un service minimum strict', effets: { societe: -0.4 }, cout: 0 },
      { id: 'concessions-cibles', libelle: 'Concessions ciblées sur les points durs', effets: { eco: 0.2 }, cout: -1.0 },
    ] },
  { id: 'canicule', titre: 'Canicule exceptionnelle et surmortalité', local: true,
    deptsPossibles: ['013', '083', '030', '034', '084'],
    texte: 'Une vague de chaleur record frappe une région, hôpitaux et EHPAD sous tension.',
    reponses: [
      { id: 'plan-canicule-urgence', libelle: 'Plan canicule d’urgence (climatisation, personnel)', effets: { eco: 0.2, societe: 0.2 }, cout: -1.4 },
      { id: 'adaptation-long-terme', libelle: 'Investir dans l’adaptation au changement climatique', effets: { ecologie: 0.6 }, cout: -2.5 },
      { id: 'reponse-minimale', libelle: 'Réponse minimale, moyens existants', effets: {}, cout: 0 },
    ] },
  { id: 'inondations', titre: 'Inondations dévastatrices', local: true,
    deptsPossibles: ['062', '059', '076', '029', '022'],
    texte: 'Des crues rapides détruisent des habitations et des infrastructures locales.',
    reponses: [
      { id: 'aide-urgence-inondations', libelle: 'Aide d’urgence aux sinistrés', effets: { eco: 0.3, societe: 0.1 }, cout: -1.8 },
      { id: 'digues-prevention', libelle: 'Plan de prévention (digues, urbanisme)', effets: { ecologie: 0.4, eco: -0.1 }, cout: -2.4 },
      { id: 'solidarite-nationale', libelle: 'Déclencher la solidarité nationale a minima', effets: {}, cout: -0.6 },
    ] },
  { id: 'crise-accueil-migrants', titre: 'Tensions autour de l’accueil des migrants', local: false,
    texte: 'Un afflux ponctuel de demandeurs d’asile sature les dispositifs d’hébergement d’urgence.',
    reponses: [
      { id: 'accueil-digne', libelle: 'Renforcer les capacités d’accueil dignes', effets: { societe: 0.5, europe: 0.2 }, cout: -1.6 },
      { id: 'controle-renforce', libelle: 'Renforcer les contrôles et les reconduites', effets: { societe: -0.6, europe: -0.3 }, cout: -0.5 },
      { id: 'reponse-europeenne', libelle: 'Porter une réponse coordonnée au niveau européen', effets: { europe: 0.5 }, cout: -0.3 },
    ] },
  { id: 'tensions-retraites', titre: 'Manifestations sur l’équilibre des retraites', local: false,
    texte: 'Le déficit prévisionnel du système de retraites relance la contestation sociale.',
    reponses: [
      { id: 'geler-parametres', libelle: 'Geler les paramètres actuels, financer par l’impôt', effets: { eco: 0.4, societe: 0.2 }, cout: -1.5 },
      { id: 'ajuster-parametres', libelle: 'Ajuster durée de cotisation et âge de départ', effets: { eco: -0.4, societe: -0.3 }, cout: 2.0 },
      { id: 'concertation-longue', libelle: 'Lancer une concertation longue, décision différée', effets: {}, cout: -0.2 },
    ] },
  { id: 'prix-energie', titre: 'Flambée des prix de l’énergie', local: false,
    texte: 'Une tension sur les marchés de l’énergie fait grimper les factures des ménages et entreprises.',
    reponses: [
      { id: 'bouclier-tarifaire', libelle: 'Bouclier tarifaire généralisé', effets: { eco: 0.5 }, cout: -3.0 },
      { id: 'cheque-cible', libelle: 'Chèque énergie ciblé sur les ménages modestes', effets: { eco: 0.3, societe: 0.1 }, cout: -1.2 },
      { id: 'laisser-marche', libelle: 'Laisser jouer le marché, pas d’intervention', effets: { eco: -0.5 }, cout: 0.5 },
    ] },
  { id: 'fermeture-usine', titre: 'Fermeture d’un site industriel majeur', local: true,
    deptsPossibles: ['057', '059', '062', '076', '042'],
    texte: 'Un grand site industriel annonce sa fermeture, des centaines d’emplois menacés.',
    reponses: [
      { id: 'plan-reindustrialisation', libelle: 'Plan de reconversion et de réindustrialisation', effets: { eco: 0.5, ecologie: 0.2 }, cout: -2.5 },
      { id: 'nationalisation-temporaire', libelle: 'Nationalisation temporaire du site', effets: { eco: 0.8 }, cout: -4.0 },
      { id: 'accompagnement-social', libelle: 'Accompagnement social des salariés uniquement', effets: { societe: 0.2 }, cout: -0.9 },
    ] },
  { id: 'penurie-enseignants', titre: 'Pénurie d’enseignants à la rentrée', local: false,
    texte: 'De nombreux postes ne trouvent pas preneur, des classes restent sans professeur.',
    reponses: [
      { id: 'revalorisation-salariale', libelle: 'Revaloriser les salaires enseignants', effets: { eco: 0.5, societe: 0.2 }, cout: -2.8 },
      { id: 'recrutement-contractuels', libelle: 'Recruter massivement des contractuels', effets: { eco: -0.1, societe: -0.1 }, cout: -0.8 },
      { id: 'reorganisation-classes', libelle: 'Réorganiser les effectifs à moyens constants', effets: { societe: -0.3 }, cout: 0 },
    ] },
  { id: 'surpopulation-carcerale', titre: 'Surpopulation carcérale critique', local: false,
    texte: 'Le taux d’occupation des prisons atteint un niveau alarmant, dénoncé par les autorités indépendantes.',
    reponses: [
      { id: 'plan-construction-prisons', libelle: 'Plan de construction de places supplémentaires', effets: { societe: -0.3 }, cout: -2.0 },
      { id: 'alternatives-incarceration', libelle: 'Développer les alternatives à l’incarcération', effets: { societe: 0.5 }, cout: -0.6 },
      { id: 'statu-quo-carceral', libelle: 'Ne rien changer à la politique actuelle', effets: {}, cout: 0 },
    ] },
  { id: 'cyberattaque-administration', titre: 'Cyberattaque contre des services publics', local: false,
    texte: 'Une attaque informatique paralyse plusieurs administrations pendant plusieurs jours.',
    reponses: [
      { id: 'plan-cybersecurite', libelle: 'Plan d’investissement massif en cybersécurité', effets: { eco: -0.1, societe: -0.1 }, cout: -1.5 },
      { id: 'cooperation-europeenne-cyber', libelle: 'Renforcer la coopération européenne sur le sujet', effets: { europe: 0.4 }, cout: -0.5 },
      { id: 'reponse-minimale-cyber', libelle: 'Réponse technique minimale, pas de plan d’ampleur', effets: {}, cout: -0.2 },
    ] },
  { id: 'sommet-europeen-crise', titre: 'Sommet européen sous tension', local: false,
    texte: 'Un sommet européen doit trancher une question budgétaire ou migratoire qui divise les États membres.',
    reponses: [
      { id: 'ligne-integration', libelle: 'Défendre une ligne d’intégration renforcée', effets: { europe: 0.6 }, cout: -0.5 },
      { id: 'ligne-souveraineté', libelle: 'Défendre les prérogatives nationales', effets: { europe: -0.6 }, cout: 0 },
      { id: 'compromis-prudent', libelle: 'Chercher un compromis prudent', effets: { europe: 0.1 }, cout: -0.2 },
    ] },
  { id: 'cyclone-outremer', titre: 'Cyclone majeur en outre-mer', local: true,
    deptsPossibles: ['971', '972', '974', '987'],
    texte: 'Un cyclone dévaste des infrastructures et des habitations dans un territoire ultramarin.',
    reponses: [
      { id: 'reconstruction-urgence', libelle: 'Plan de reconstruction d’urgence', effets: { eco: 0.4, societe: 0.2 }, cout: -3.2 },
      { id: 'solidarite-nationale-outremer', libelle: 'Déclencher la solidarité nationale a minima', effets: {}, cout: -0.8 },
      { id: 'plan-resilience-outremer', libelle: 'Plan de résilience climatique pour l’outre-mer', effets: { ecologie: 0.5, eco: 0.1 }, cout: -2.6 },
    ] },
];

// REFORMES dérivées des 24 options de THEMES (mêmes `effets`) : l'agenda législatif
// du mode Gouverner reprend le même contenu pédagogique que la Boussole, avec un
// coût/rendement budgétaire ajouté. Heuristique volontairement simple et lisible :
// une mesure interventionniste (eco > 0) coûte au budget, une mesure de marché
// (eco < 0) l'allège ; un effort écologique ajoute un coût d'investissement modéré.
// Chiffres ronds, à but pédagogique — pas une prévision budgétaire réelle.
function coutReforme(effets) {
  const eco = effets.eco || 0;
  const ecologie = effets.ecologie || 0;
  return Math.round((-eco * 6 - Math.max(0, ecologie) * 2) * 10) / 10;
}

export const REFORMES = THEMES.flatMap((theme) =>
  theme.options.map((opt) => ({
    id: opt.id,
    themeId: theme.id,
    icone: theme.icone,
    titre: opt.libelle,
    effets: opt.effets,
    cout: coutReforme(opt.effets),
  }))
);
