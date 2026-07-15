// Référentiel de données de PolitiQuest 2027.
// - DEPARTEMENTS : répartition réelle des 577 circonscriptions (découpage 2010),
//   à re-valider contre le référentiel officiel avant publication (cf. docs_architecture/01).
// - FAMILLES / THEMES : contenu pédagogique générique (pas de partis réels).
// - DEPUTES_DEMO / SCRUTINS_DEMO : données FICTIVES de démonstration, étiquetées dans l'UI.

export const MAJORITE_ABSOLUE = 289;

// [code, nom, région, nb de circonscriptions]
const D = [
  ['001', 'Ain', 'Auvergne-Rhône-Alpes', 5],
  ['002', 'Aisne', 'Hauts-de-France', 5],
  ['003', 'Allier', 'Auvergne-Rhône-Alpes', 3],
  ['004', 'Alpes-de-Haute-Provence', 'Provence-Alpes-Côte d’Azur', 2],
  ['005', 'Hautes-Alpes', 'Provence-Alpes-Côte d’Azur', 2],
  ['006', 'Alpes-Maritimes', 'Provence-Alpes-Côte d’Azur', 9],
  ['007', 'Ardèche', 'Auvergne-Rhône-Alpes', 3],
  ['008', 'Ardennes', 'Grand Est', 3],
  ['009', 'Ariège', 'Occitanie', 2],
  ['010', 'Aube', 'Grand Est', 3],
  ['011', 'Aude', 'Occitanie', 3],
  ['012', 'Aveyron', 'Occitanie', 3],
  ['013', 'Bouches-du-Rhône', 'Provence-Alpes-Côte d’Azur', 16],
  ['014', 'Calvados', 'Normandie', 6],
  ['015', 'Cantal', 'Auvergne-Rhône-Alpes', 2],
  ['016', 'Charente', 'Nouvelle-Aquitaine', 3],
  ['017', 'Charente-Maritime', 'Nouvelle-Aquitaine', 5],
  ['018', 'Cher', 'Centre-Val de Loire', 3],
  ['019', 'Corrèze', 'Nouvelle-Aquitaine', 2],
  ['02A', 'Corse-du-Sud', 'Corse', 2],
  ['02B', 'Haute-Corse', 'Corse', 2],
  ['021', 'Côte-d’Or', 'Bourgogne-Franche-Comté', 5],
  ['022', 'Côtes-d’Armor', 'Bretagne', 5],
  ['023', 'Creuse', 'Nouvelle-Aquitaine', 1],
  ['024', 'Dordogne', 'Nouvelle-Aquitaine', 4],
  ['025', 'Doubs', 'Bourgogne-Franche-Comté', 5],
  ['026', 'Drôme', 'Auvergne-Rhône-Alpes', 4],
  ['027', 'Eure', 'Normandie', 5],
  ['028', 'Eure-et-Loir', 'Centre-Val de Loire', 4],
  ['029', 'Finistère', 'Bretagne', 8],
  ['030', 'Gard', 'Occitanie', 6],
  ['031', 'Haute-Garonne', 'Occitanie', 10],
  ['032', 'Gers', 'Occitanie', 2],
  ['033', 'Gironde', 'Nouvelle-Aquitaine', 12],
  ['034', 'Hérault', 'Occitanie', 9],
  ['035', 'Ille-et-Vilaine', 'Bretagne', 8],
  ['036', 'Indre', 'Centre-Val de Loire', 2],
  ['037', 'Indre-et-Loire', 'Centre-Val de Loire', 5],
  ['038', 'Isère', 'Auvergne-Rhône-Alpes', 10],
  ['039', 'Jura', 'Bourgogne-Franche-Comté', 3],
  ['040', 'Landes', 'Nouvelle-Aquitaine', 3],
  ['041', 'Loir-et-Cher', 'Centre-Val de Loire', 3],
  ['042', 'Loire', 'Auvergne-Rhône-Alpes', 6],
  ['043', 'Haute-Loire', 'Auvergne-Rhône-Alpes', 2],
  ['044', 'Loire-Atlantique', 'Pays de la Loire', 10],
  ['045', 'Loiret', 'Centre-Val de Loire', 6],
  ['046', 'Lot', 'Occitanie', 2],
  ['047', 'Lot-et-Garonne', 'Nouvelle-Aquitaine', 3],
  ['048', 'Lozère', 'Occitanie', 1],
  ['049', 'Maine-et-Loire', 'Pays de la Loire', 7],
  ['050', 'Manche', 'Normandie', 4],
  ['051', 'Marne', 'Grand Est', 5],
  ['052', 'Haute-Marne', 'Grand Est', 2],
  ['053', 'Mayenne', 'Pays de la Loire', 3],
  ['054', 'Meurthe-et-Moselle', 'Grand Est', 6],
  ['055', 'Meuse', 'Grand Est', 2],
  ['056', 'Morbihan', 'Bretagne', 6],
  ['057', 'Moselle', 'Grand Est', 9],
  ['058', 'Nièvre', 'Bourgogne-Franche-Comté', 2],
  ['059', 'Nord', 'Hauts-de-France', 21],
  ['060', 'Oise', 'Hauts-de-France', 7],
  ['061', 'Orne', 'Normandie', 3],
  ['062', 'Pas-de-Calais', 'Hauts-de-France', 12],
  ['063', 'Puy-de-Dôme', 'Auvergne-Rhône-Alpes', 5],
  ['064', 'Pyrénées-Atlantiques', 'Nouvelle-Aquitaine', 6],
  ['065', 'Hautes-Pyrénées', 'Occitanie', 2],
  ['066', 'Pyrénées-Orientales', 'Occitanie', 4],
  ['067', 'Bas-Rhin', 'Grand Est', 9],
  ['068', 'Haut-Rhin', 'Grand Est', 6],
  ['069', 'Rhône', 'Auvergne-Rhône-Alpes', 14],
  ['070', 'Haute-Saône', 'Bourgogne-Franche-Comté', 2],
  ['071', 'Saône-et-Loire', 'Bourgogne-Franche-Comté', 5],
  ['072', 'Sarthe', 'Pays de la Loire', 5],
  ['073', 'Savoie', 'Auvergne-Rhône-Alpes', 4],
  ['074', 'Haute-Savoie', 'Auvergne-Rhône-Alpes', 6],
  ['075', 'Paris', 'Île-de-France', 18],
  ['076', 'Seine-Maritime', 'Normandie', 10],
  ['077', 'Seine-et-Marne', 'Île-de-France', 11],
  ['078', 'Yvelines', 'Île-de-France', 12],
  ['079', 'Deux-Sèvres', 'Nouvelle-Aquitaine', 3],
  ['080', 'Somme', 'Hauts-de-France', 5],
  ['081', 'Tarn', 'Occitanie', 3],
  ['082', 'Tarn-et-Garonne', 'Occitanie', 2],
  ['083', 'Var', 'Provence-Alpes-Côte d’Azur', 8],
  ['084', 'Vaucluse', 'Provence-Alpes-Côte d’Azur', 5],
  ['085', 'Vendée', 'Pays de la Loire', 5],
  ['086', 'Vienne', 'Nouvelle-Aquitaine', 4],
  ['087', 'Haute-Vienne', 'Nouvelle-Aquitaine', 3],
  ['088', 'Vosges', 'Grand Est', 4],
  ['089', 'Yonne', 'Bourgogne-Franche-Comté', 3],
  ['090', 'Territoire de Belfort', 'Bourgogne-Franche-Comté', 2],
  ['091', 'Essonne', 'Île-de-France', 10],
  ['092', 'Hauts-de-Seine', 'Île-de-France', 13],
  ['093', 'Seine-Saint-Denis', 'Île-de-France', 12],
  ['094', 'Val-de-Marne', 'Île-de-France', 11],
  ['095', 'Val-d’Oise', 'Île-de-France', 10],
  ['971', 'Guadeloupe', 'Outre-mer', 4],
  ['972', 'Martinique', 'Outre-mer', 4],
  ['973', 'Guyane', 'Outre-mer', 2],
  ['974', 'La Réunion', 'Outre-mer', 7],
  ['975', 'Saint-Pierre-et-Miquelon', 'Outre-mer', 1],
  ['976', 'Mayotte', 'Outre-mer', 2],
  ['977', 'Saint-Barthélemy et Saint-Martin', 'Outre-mer', 1],
  ['986', 'Wallis-et-Futuna', 'Outre-mer', 1],
  ['987', 'Polynésie française', 'Outre-mer', 3],
  ['988', 'Nouvelle-Calédonie', 'Outre-mer', 2],
  ['099', 'Français de l’étranger', 'Français de l’étranger', 11],
];

export const DEPARTEMENTS = D.map(([code, nom, region, circos]) => ({ code, nom, region, circos }));

export const CIRCOS = DEPARTEMENTS.flatMap((d) =>
  Array.from({ length: d.circos }, (_, i) => ({
    id: `${d.code}-${String(i + 1).padStart(2, '0')}`,
    dept: d.code,
    num: i + 1,
    nom: `${d.nom} — ${i + 1}ᵉ circonscription`,
    region: d.region,
  }))
);

if (CIRCOS.length !== 577) {
  throw new Error(`Référentiel invalide : ${CIRCOS.length} circonscriptions au lieu de 577`);
}

// 7 familles idéologiques génériques. Axes ∈ [-1, 1] :
// eco      : -1 marché libre        … +1 intervention publique
// societe  : -1 conservateur        … +1 libéral (sociétal)
// ecologie : -1 productivisme       … +1 priorité écologique
// europe   : -1 souveraineté        … +1 intégration européenne
export const FAMILLES = [
  { id: 'gauche-rupture', nom: 'Gauche de rupture', couleur: '#c0392b',
    vecteur: { eco: 0.9, societe: 0.7, ecologie: 0.6, europe: -0.3 },
    description: 'Redistribution forte, planification publique, critique des traités européens actuels.' },
  { id: 'eco-sociale', nom: 'Écologie sociale', couleur: '#27ae60',
    vecteur: { eco: 0.6, societe: 0.8, ecologie: 0.95, europe: 0.4 },
    description: 'La transition écologique comme projet de justice sociale, sobriété organisée.' },
  { id: 'social-democrate', nom: 'Social-démocratie', couleur: '#e0648e',
    vecteur: { eco: 0.4, societe: 0.6, ecologie: 0.4, europe: 0.7 },
    description: 'Compromis marché/État-providence, réformisme, ancrage européen.' },
  { id: 'lib-europeen', nom: 'Libéralisme européen', couleur: '#e67e22',
    vecteur: { eco: -0.5, societe: 0.4, ecologie: 0.1, europe: 0.9 },
    description: 'Économie de l’offre, innovation, approfondissement de l’Union européenne.' },
  { id: 'droite-gouvernement', nom: 'Droite de gouvernement', couleur: '#2980b9',
    vecteur: { eco: -0.6, societe: -0.4, ecologie: -0.1, europe: 0.3 },
    description: 'Maîtrise budgétaire, autorité de l’État, attachement aux corps intermédiaires.' },
  { id: 'souverainiste', nom: 'Souverainisme', couleur: '#34495e',
    vecteur: { eco: 0.1, societe: -0.7, ecologie: -0.3, europe: -0.9 },
    description: 'Primauté de la souveraineté nationale, protectionnisme, frontières.' },
  { id: 'localiste', nom: 'Localisme décentralisateur', couleur: '#8e6bbf',
    vecteur: { eco: 0.2, societe: 0.2, ecologie: 0.5, europe: -0.1 },
    description: 'Pouvoir aux territoires, circuits courts, démocratie de proximité.' },
];

// 6 thèmes. L'utilisateur répartit `budget` points entre 4 options : le coût
// d'opportunité est la mécanique pédagogique centrale (cf. docs_architecture/03).
export const THEMES = [
  { id: 'climat', titre: 'Transition énergétique', budget: 12, icone: '🌍',
    contexte: 'Vous arbitrez le plan d’investissement énergie-climat. Chaque point est un milliard d’euros : les dépenser ici, c’est ne pas les dépenser là.',
    options: [
      { id: 'renouvelables', libelle: 'Déploiement massif des renouvelables', effets: { ecologie: 0.9, eco: 0.3 } },
      { id: 'nucleaire', libelle: 'Relance du programme nucléaire', effets: { ecologie: 0.2, eco: 0.4, societe: -0.2 } },
      { id: 'sobriete', libelle: 'Sobriété : rénovation, transports publics', effets: { ecologie: 0.8, eco: 0.6 } },
      { id: 'marche-carbone', libelle: 'Prix du carbone et incitations de marché', effets: { ecologie: 0.4, eco: -0.7, europe: 0.5 } },
    ] },
  { id: 'fiscalite', titre: 'Fiscalité et budget', budget: 12, icone: '💶',
    contexte: 'Le déficit se creuse. Où faites-vous porter l’effort ?',
    options: [
      { id: 'imposer-patrimoine', libelle: 'Imposer davantage patrimoines et hauts revenus', effets: { eco: 0.9 } },
      { id: 'baisser-depense', libelle: 'Réduire la dépense publique', effets: { eco: -0.9 } },
      { id: 'baisser-production', libelle: 'Alléger les impôts de production des entreprises', effets: { eco: -0.7, europe: 0.2 } },
      { id: 'lutte-fraude', libelle: 'Lutte renforcée contre la fraude et l’évasion', effets: { eco: 0.4, europe: 0.4 } },
    ] },
  { id: 'securite', titre: 'Sécurité et justice', budget: 12, icone: '⚖️',
    contexte: 'Un plan quinquennal sécurité-justice : répartissez les moyens.',
    options: [
      { id: 'police-proximite', libelle: 'Police de proximité et prévention', effets: { societe: 0.7, eco: 0.3 } },
      { id: 'fermete-penale', libelle: 'Durcissement pénal et places de prison', effets: { societe: -0.8 } },
      { id: 'justice-moyens', libelle: 'Moyens pour la justice (délais, insertion)', effets: { societe: 0.5, eco: 0.4 } },
      { id: 'cyber-frontieres', libelle: 'Cybersécurité et contrôle aux frontières', effets: { societe: -0.4, europe: -0.3 } },
    ] },
  { id: 'travail', titre: 'Travail et protection sociale', budget: 12, icone: '🛠️',
    contexte: 'Réforme du marché du travail : quel équilibre entre flexibilité et protection ?',
    options: [
      { id: 'hausse-salaires', libelle: 'Hausse du SMIC et conditionnement des aides', effets: { eco: 0.8 } },
      { id: 'flexibilite', libelle: 'Assouplir l’embauche et le licenciement', effets: { eco: -0.8 } },
      { id: 'formation', libelle: 'Formation, reconversion, sécurité des parcours', effets: { eco: 0.3, societe: 0.3 } },
      { id: 'temps-travail', libelle: 'Réduction négociée du temps de travail', effets: { eco: 0.6, societe: 0.4, ecologie: 0.3 } },
    ] },
  { id: 'europe', titre: 'Europe et souveraineté', budget: 12, icone: '🇪🇺',
    contexte: 'Le prochain cycle européen s’ouvre. Quelle position de la France ?',
    options: [
      { id: 'federalisme', libelle: 'Approfondir : budget commun, défense intégrée', effets: { europe: 0.9 } },
      { id: 'europe-sociale', libelle: 'Réorienter : harmonisation sociale et fiscale', effets: { europe: 0.5, eco: 0.6 } },
      { id: 'souverainete', libelle: 'Reprendre des compétences à l’UE', effets: { europe: -0.9, societe: -0.3 } },
      { id: 'protectionnisme-vert', libelle: 'Protectionnisme écologique aux frontières de l’UE', effets: { europe: 0.2, ecologie: 0.6, eco: 0.4 } },
    ] },
  { id: 'institutions', titre: 'Institutions et démocratie', budget: 12, icone: '🏛️',
    contexte: 'Une réforme institutionnelle est sur la table. Que priorisez-vous ?',
    options: [
      { id: 'proportionnelle', libelle: 'Proportionnelle aux législatives', effets: { societe: 0.5 } },
      { id: 'ric', libelle: 'Référendum d’initiative citoyenne', effets: { societe: 0.4, europe: -0.3 } },
      { id: 'decentralisation', libelle: 'Décentralisation et pouvoir local', effets: { societe: 0.3, ecologie: 0.2 } },
      { id: 'executif-fort', libelle: 'Stabilité : renforcer l’exécutif', effets: { societe: -0.7 } },
    ] },
];

// ---------------------------------------------------------------------------
// DONNÉES DE DÉMONSTRATION (fictives) — remplacées par RemoteAdapter en phase 2.
// Les noms sont générés et ne désignent aucune personne réelle.
// ---------------------------------------------------------------------------

const PRENOMS = ['Camille', 'Louane', 'Adama', 'Théo', 'Inès', 'Marius', 'Salomé', 'Rayan',
  'Maëlle', 'Gaspard', 'Awa', 'Côme', 'Lila', 'Noa', 'Bérénice', 'Ilyes',
  'Capucine', 'Sacha', 'Fatou', 'Ulysse', 'Ambre', 'Malo', 'Nour', 'Victoire'];
const NOMS = ['Vasseur', 'Kaboré', 'Lemoine', 'Djemaï', 'Roussel', 'Bianchi', 'Guivarch',
  'Ndiaye', 'Perrot', 'Slimani', 'Chauvel', 'Okafor', 'Marchetti', 'Le Gall',
  'Toussaint', 'Bakary', 'Delcourt', 'Yildiz', 'Morvan', 'Diallo', 'Rambert',
  'Costa', 'Hamon', 'Zeroual'];

// PRNG déterministe (mulberry32) partagé par la génération démo et les IA de guilde.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20270415);

export const DEPUTES_DEMO = PRENOMS.map((prenom, i) => {
  const famille = FAMILLES[i % FAMILLES.length];
  const circo = CIRCOS[Math.floor(rng() * CIRCOS.length)];
  return {
    id: `dep-${i + 1}`,
    nom: `${prenom} ${NOMS[i]}`,
    groupe: famille.id,
    circoId: circo.id,
    circoNom: circo.nom,
    loyaute: 0.55 + rng() * 0.4, // probabilité de voter avec son groupe
  };
});

export const SCRUTINS_DEMO = [
  { id: 'sc-1', titre: 'PL de programmation énergie-climat (lecture définitive)',
    statut: 'a_venir', cote: 0.62,
    resume: 'Trajectoire de sortie des énergies fossiles et financement de la rénovation thermique.' },
  { id: 'sc-2', titre: 'PPL encadrement des loyers dans les zones tendues',
    statut: 'a_venir', cote: 0.48,
    resume: 'Extension du dispositif d’encadrement à 28 agglomérations supplémentaires.' },
  { id: 'sc-3', titre: 'PL organique — introduction d’une dose de proportionnelle',
    statut: 'a_venir', cote: 0.35,
    resume: 'Élection de 15 % des députés au scrutin de liste national.' },
  { id: 'sc-4', titre: 'Motion de censure sur le budget rectificatif',
    statut: 'clos', resultat: 'rejete', cote: 0.2,
    resume: 'La motion a recueilli 241 voix, en deçà des 289 requises.' },
];

// Positions de vote démo par groupe et scrutin ('pour' | 'contre' | 'abstention').
export const CONSIGNES_DEMO = {
  'sc-1': { 'gauche-rupture': 'pour', 'eco-sociale': 'pour', 'social-democrate': 'pour', 'lib-europeen': 'pour', 'droite-gouvernement': 'abstention', 'souverainiste': 'contre', 'localiste': 'pour' },
  'sc-2': { 'gauche-rupture': 'pour', 'eco-sociale': 'pour', 'social-democrate': 'pour', 'lib-europeen': 'contre', 'droite-gouvernement': 'contre', 'souverainiste': 'abstention', 'localiste': 'pour' },
  'sc-3': { 'gauche-rupture': 'pour', 'eco-sociale': 'pour', 'social-democrate': 'abstention', 'lib-europeen': 'pour', 'droite-gouvernement': 'contre', 'souverainiste': 'pour', 'localiste': 'pour' },
  'sc-4': { 'gauche-rupture': 'pour', 'eco-sociale': 'abstention', 'social-democrate': 'contre', 'lib-europeen': 'contre', 'droite-gouvernement': 'contre', 'souverainiste': 'pour', 'localiste': 'abstention' },
};
