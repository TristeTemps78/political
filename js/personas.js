// 10 personas fictifs du mode Gouverner — étiquetés comme tels, aucun rattachement
// à une personne ou un parti réel (cf. docs_architecture/01, invariant de neutralité).
// Ils couvrent des territoires, âges et métiers variés et surtout des RAPPORTS
// réels et documentés à la politique (défiance, abstention, vote de conviction…) :
// la pédagogie porte autant sur le comportement électoral que sur les opinions.

import { DEPARTEMENTS } from './data.js';

export const AXES_GOUVERNER = ['eco', 'societe', 'ecologie', 'europe'];

// Sensibilité du persona aux annonces gouvernementales, selon son rapport à la
// politique. Facteur multiplicatif de la réaction — volontairement modéré
// (0,5–1,3) pour qu'aucun persona ne domine seul la popularité nationale.
const SENSIBILITE = {
  intermittent: 1.0,   // vote parfois, réagit normalement aux annonces
  defiance: 0.6,        // méfiant par principe, peu impressionné par les annonces
  abstention: 0.5,       // faible engagement, réaction atténuée
  conviction: 1.3,        // vote sur ses valeurs, réagit fort et vite
  utile: 0.9,               // pragmatique, regarde le résultat d'ensemble
  fiscalite: 1.1,            // très sensible aux mesures qui touchent son activité
  eloignement: 0.5,           // se sent peu concerné par les décisions parisiennes
  protestataire: 1.2,          // réaction vive, souvent de colère
  engagement: 1.0,               // suit l'actualité, réaction posée et informée
};

export function sensibilite(rapport) {
  return SENSIBILITE[rapport] ?? 1.0;
}

export const PERSONAS = [
  { id: 'nadia', nom: 'Nadia', age: 34, emoji: '🏥', dept: '059', segment: 'santé hospitalière',
    vecteur: { eco: 0.5, societe: 0.3, ecologie: 0.2, europe: 0.1 }, rapport: 'intermittent',
    pedagogie: 'Le vote intermittent (présidentielle oui, législatives non) concerne une large part de l’électorat — il change pourtant la majorité qui gouverne au quotidien.',
    recits: {
      fortPos: ['« Enfin des moyens qui arrivent vraiment aux urgences. »', '« On respire un peu, pour la première fois depuis longtemps. »'],
      pos: ['« C’est un pas dans le bon sens pour l’hôpital. »', '« Pas parfait, mais ça va dans la bonne direction. »'],
      neg: ['« Encore des promesses qui ne changent rien au service. »', '« On nous demande toujours plus avec moins. »'],
      fortNeg: ['« C’est la goutte de trop, l’hôpital craque. »', '« Je ne vote plus pour ce genre de décisions. »'],
    } },
  { id: 'jean-marc', nom: 'Jean-Marc', age: 52, emoji: '🌾', dept: '032', segment: 'agriculture',
    vecteur: { eco: -0.2, societe: -0.5, ecologie: -0.4, europe: -0.5 }, rapport: 'defiance',
    pedagogie: 'La défiance envers les institutions est documentée comme plus forte dans les territoires ruraux éloignés des services publics.',
    recits: {
      fortPos: ['« Pour une fois, on a pensé à nous avant de décider. »', '« Ça faisait longtemps qu’on n’avait pas été entendus comme ça. »'],
      pos: ['« C’est un geste, on verra si ça tient dans la durée. »', '« Pas de quoi crier victoire, mais c’est reçu. »'],
      neg: ['« Encore une décision prise sans nous consulter. »', '« Ça sent la mesure de communication, pas de terrain. »'],
      fortNeg: ['« Ils ne comprennent rien à nos métiers. »', '« Ça confirme qu’on ne compte pour rien là-haut. »'],
    } },
  { id: 'lea', nom: 'Léa', age: 21, emoji: '🎓', dept: '035', segment: 'étudiants',
    vecteur: { eco: 0.4, societe: 0.7, ecologie: 0.8, europe: 0.5 }, rapport: 'abstention',
    pedagogie: 'Les 18-24 ans s’abstiennent nettement plus que la moyenne aux élections intermédiaires (européennes, municipales), alors qu’ils sont très mobilisés sur le climat.',
    recits: {
      fortPos: ['« Bon, là ça me donne presque envie de voter la prochaine fois. »', '« C’est exactement ce qu’on demandait dans les manifs. »'],
      pos: ['« Timide, mais c’est mieux que rien. »', '« Un pas, il en faut dix de plus. »'],
      neg: ['« Encore du greenwashing, franchement. »', '« Ça ne va pas assez loin, comme d’habitude. »'],
      fortNeg: ['« À quoi bon voter si c’est pour ça. »', '« Ma génération n’a plus confiance, et ça continue. »'],
    } },
  { id: 'karim', nom: 'Karim', age: 27, emoji: '🛵', dept: '093', segment: 'emploi précaire',
    vecteur: { eco: 0.6, societe: 0.1, ecologie: -0.1, europe: -0.3 }, rapport: 'defiance',
    pedagogie: 'La défiance politique est corrélée à la précarité de l’emploi : le sentiment de non-représentation nourrit à la fois l’abstention et le vote protestataire.',
    recits: {
      fortPos: ['« Ça change vraiment quelque chose pour moi, pour une fois. »', '« Je n’y croyais plus, mais là, si. »'],
      pos: ['« Un petit mieux, on prend. »', '« Ça aide un peu, tant mieux. »'],
      neg: ['« Ça ne changera rien à ma fin de mois. »', '« Encore des mesures pour les autres, pas pour nous. »'],
      fortNeg: ['« Ils ne savent même pas ce que c’est de galérer. »', '« Aucune confiance, jamais eu, jamais eue. »'],
    } },
  { id: 'martine', nom: 'Martine', age: 71, emoji: '👵', dept: '066', segment: 'retraites',
    vecteur: { eco: -0.3, societe: -0.4, ecologie: 0.1, europe: 0.2 }, rapport: 'conviction',
    pedagogie: 'Les retraités votent nettement plus que la moyenne nationale : leur poids électoral réel dépasse leur poids démographique.',
    recits: {
      fortPos: ['« Voilà un gouvernement qui a du courage et de la constance. »', '« Ça, c’est une politique dans laquelle je me reconnais. »'],
      pos: ['« C’est dans la bonne ligne, je continue de faire confiance. »', '« Cohérent avec ce que j’attendais. »'],
      neg: ['« Ce n’est pas ce pour quoi j’ai voté. »', '« Je commence à douter de la ligne suivie. »'],
      fortNeg: ['« C’est un reniement complet de mes convictions. »', '« Je ne reconnais plus rien de ce que je défends. »'],
    } },
  { id: 'thomas', nom: 'Thomas', age: 41, emoji: '💼', dept: '069', segment: 'cadres urbains',
    vecteur: { eco: -0.4, societe: 0.3, ecologie: 0.2, europe: 0.6 }, rapport: 'utile',
    pedagogie: 'Le « vote utile » privilégie un candidat jugé capable de gagner plutôt que le plus proche de ses idées — une stratégie qui façonne les scrutins à deux tours.',
    recits: {
      fortPos: ['« Enfin une politique pragmatique et lisible pour les entreprises. »', '« Ça envoie un bon signal aux investisseurs. »'],
      pos: ['« Raisonnable, ça va dans le sens de l’efficacité. »', '« Correct, sans plus, mais correct. »'],
      neg: ['« Pas très cohérent avec la ligne annoncée au départ. »', '« Ça manque de vision à moyen terme. »'],
      fortNeg: ['« C’est franchement contre-productif économiquement. »', '« Ça inquiète sérieusement pour la suite. »'],
    } },
  { id: 'sylvie', nom: 'Sylvie', age: 48, emoji: '🏪', dept: '025', segment: 'commerce',
    vecteur: { eco: -0.6, societe: -0.1, ecologie: -0.1, europe: 0.1 }, rapport: 'fiscalite',
    pedagogie: 'Les indépendants et commerçants sont particulièrement sensibles aux arbitrages de fiscalité et de charges, qui pèsent directement sur leur trésorerie.',
    recits: {
      fortPos: ['« Enfin un allègement qui va soulager ma trésorerie. »', '« Ça fait du bien, pour une fois qu’on pense aux petits commerces. »'],
      pos: ['« Un geste appréciable, même s’il reste modeste. »', '« Ça va dans le bon sens pour nous. »'],
      neg: ['« Encore une charge de plus sur nos épaules. »', '« On finit toujours par payer la note. »'],
      fortNeg: ['« C’est intenable pour un petit commerce comme le mien. »', '« Je vais devoir revoir tous mes prix à cause de ça. »'],
    } },
  { id: 'moetai', nom: 'Moetai', age: 39, emoji: '🎣', dept: '987', segment: 'pêche d’outre-mer',
    vecteur: { eco: 0.2, societe: 0.1, ecologie: 0.6, europe: -0.2 }, rapport: 'eloignement',
    pedagogie: 'Les décisions prises à Paris arrivent en outre-mer avec un décalage de calendrier et de perception ; le sentiment d’éloignement institutionnel y est structurel.',
    recits: {
      fortPos: ['« Pour une fois, on ne nous a pas oubliés dans la décision. »', '« Ça prouve qu’on existe aussi, là-bas à Paris. »'],
      pos: ['« C’est déjà ça, même si ça arrive toujours en dernier chez nous. »', '« Un geste, timide mais réel. »'],
      neg: ['« Encore une décision pensée sans nous, comme d’habitude. »', '« Ça ne tient pas compte de nos réalités. »'],
      fortNeg: ['« On n’existe vraiment pas dans leurs calculs. »', '« Paris est loin, et ça se voit encore une fois. »'],
    } },
  { id: 'bruno', nom: 'Bruno', age: 45, emoji: '🏭', dept: '057', segment: 'industrie',
    vecteur: { eco: 0.3, societe: -0.5, ecologie: -0.5, europe: -0.6 }, rapport: 'protestataire',
    pedagogie: 'Le vote protestataire progresse historiquement dans les bassins industriels frappés par les fermetures d’usines et les reconversions économiques.',
    recits: {
      fortPos: ['« Ça, c’est une décision qui protège vraiment nos emplois. »', '« On nous prend enfin au sérieux dans l’industrie. »'],
      pos: ['« C’est un geste, on va voir si ça tient dans le temps. »', '« Pas mal, mais faudra confirmer. »'],
      neg: ['« Encore une décision qui nous sacrifie pour d’autres intérêts. »', '« Ça continue de fragiliser nos usines. »'],
      fortNeg: ['« C’est une trahison pure et simple des travailleurs. »', '« Ils signent la mort de nos emplois, un point c’est tout. »'],
    } },
  { id: 'chantal', nom: 'Chantal', age: 58, emoji: '🏘️', dept: '048', segment: 'élus locaux',
    vecteur: { eco: 0.1, societe: 0.2, ecologie: 0.4, europe: -0.1 }, rapport: 'engagement',
    pedagogie: 'Les élus locaux sont, sondage après sondage, les élus en qui les Français disent avoir le plus confiance — très au-dessus des responsables nationaux.',
    recits: {
      fortPos: ['« C’est exactement le type de décision qui redonne du pouvoir aux territoires. »', '« Une vraie confiance faite aux élus de terrain, bravo. »'],
      pos: ['« Une décision cohérente, qui va dans le bon sens pour nos communes. »', '« C’est utile, on va pouvoir s’en servir localement. »'],
      neg: ['« Encore une réforme pensée depuis un bureau parisien. »', '« Ça complique notre travail sur le terrain. »'],
      fortNeg: ['« C’est une négation totale de la réalité des territoires. »', '« On nous prive encore un peu plus de nos marges de manœuvre. »'],
    } },
];

// Pondération déterministe d'un persona dans l'humeur d'un département : dérivée
// uniquement de DEPARTEMENTS (nombre de circonscriptions = proxy de taille/densité),
// rien n'est stocké. Deux départements de taille voisine se ressemblent davantage
// qu'un très rural et un très urbain ; le persona originaire du département pèse en
// plus directement dans son humeur locale.
export function poidsSegments(deptCode) {
  const cible = DEPARTEMENTS.find((d) => d.code === deptCode);
  const circosCible = cible ? cible.circos : 5;
  const maxCircos = DEPARTEMENTS.reduce((m, d) => Math.max(m, d.circos), 1);
  const poids = {};
  let total = 0;
  for (const p of PERSONAS) {
    const origine = DEPARTEMENTS.find((d) => d.code === p.dept);
    const circosOrigine = origine ? origine.circos : 5;
    const ecart = Math.abs(circosCible - circosOrigine) / maxCircos;
    let w = 1 - ecart; // ∈ [0,1], toujours ≥ 0
    if (p.dept === deptCode) w += 2; // le persona est directement de ce département
    poids[p.id] = w;
    total += w;
  }
  for (const id in poids) poids[id] = total ? poids[id] / total : 1 / PERSONAS.length;
  return poids;
}

// Réaction d'un persona à une décision : produit scalaire de son vecteur idéologique
// avec la DIRECTION des effets (normalisée, même logique cosinus que affinity.js/
// duels.js), pondéré par la sensibilité de son rapport à la politique, borné à ±25
// pour qu'aucune décision isolée ne bascule brutalement une humeur.
export function reagirPersona(persona, effets, kReaction) {
  const norme = Math.sqrt(AXES_GOUVERNER.reduce((s, a) => s + (effets[a] || 0) ** 2, 0));
  if (!norme) return 0;
  const dot = AXES_GOUVERNER.reduce((s, a) => s + (persona.vecteur[a] || 0) * ((effets[a] || 0) / norme), 0);
  const reaction = kReaction * dot * sensibilite(persona.rapport);
  return Math.max(-25, Math.min(25, reaction));
}

// Choix d'un récit selon le signe/l'intensité de la réaction, tiré par le PRNG
// seedé fourni par l'appelant (déterminisme total du mandat).
export function tirerRecit(persona, reaction, rng) {
  let bucket;
  if (reaction >= 15) bucket = 'fortPos';
  else if (reaction > 0) bucket = 'pos';
  else if (reaction <= -15) bucket = 'fortNeg';
  else bucket = 'neg';
  const options = persona.recits[bucket];
  return options[Math.floor(rng() * options.length)];
}
