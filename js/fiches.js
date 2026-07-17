// Fiches pédagogiques « Le saviez-vous ? » du mode Gouverner.
// Module pur : aucune manipulation du DOM, aucune logique d'état (la récompense
// capital à la première lecture est gérée ailleurs, cf. docs_architecture/03).
// Neutralité politique stricte : aucun parti ni personnalité nommés, aucun
// jugement de valeur sur l'usage des mécanismes institutionnels. Les exemples
// historiques restent factuels et anonymisés (« un gouvernement a… »), sauf
// dates. Connaissance arrêtée début 2026 : les ordres de grandeur cumulatifs
// sont datés (« au 1er janvier 2026 ») plutôt qu'annoncés au chiffre près.

export const FICHES = [
  {
    id: 'majorite-absolue',
    titre: 'C’est quoi, la majorité absolue ?',
    article: null,
    texte: 'À l’Assemblée nationale, la majorité absolue correspond à la moitié des 577 sièges plus un, soit 289 députés. C’est le seuil nécessaire pour adopter certains textes ou voter une motion de censure sans dépendre du nombre de votants présents ce jour-là. Un groupe ou une coalition qui atteint 289 sièges peut gouverner sans avoir besoin de voix supplémentaires à chaque vote. En dessous de ce seuil, il faut chercher des alliances au cas par cas, texte par texte.',
    reperes: [
      '577 sièges au total à l’Assemblée nationale',
      'Majorité absolue = 289 sièges (577 / 2, arrondi au supérieur)',
      'Seuil utilisé notamment pour la motion de censure',
    ],
  },
  {
    id: 'majorite-relative-coalitions',
    titre: 'Gouverner sans majorité absolue, comment ça marche ?',
    article: null,
    texte: 'Une Assemblée peut être élue sans qu’aucun groupe n’atteigne 289 sièges : on parle alors de majorité relative ou d’Assemblée fragmentée. Le gouvernement doit alors bâtir des majorités de circonstance, texte par texte, en convainquant des groupes extérieurs à sa base habituelle. Cette situation s’est produite à plusieurs reprises sous la Ve République, y compris au niveau national à partir de 2022. Elle rend l’examen des textes plus long et plus incertain, et pousse à des compromis ou à des outils comme l’article 49 alinéa 3.',
    reperes: [
      'Majorité relative : le premier groupe n’a pas 289 sièges',
      'Situation vécue au niveau national à partir de 2022',
      'Conséquence fréquente : négociations texte par texte',
    ],
  },
  {
    id: 'vote-texte-assemblee',
    titre: 'Comment un texte est-il adopté à l’Assemblée ?',
    article: null,
    texte: 'Un projet ou une proposition de loi est adopté quand il recueille la majorité des suffrages exprimés lors du vote en séance, c’est-à-dire des votes « pour » et « contre » réellement exprimés, en excluant les abstentions du décompte. Il ne faut donc pas 289 voix « pour » pour faire passer un texte ordinaire : il faut simplement plus de « pour » que de « contre » parmi les députés qui prennent position. Un texte peut ainsi être adopté avec un nombre de voix bien inférieur à 289 si l’hémicycle est peu rempli ou si beaucoup de députés s’abstiennent. Ce mécanisme est différent de celui de la motion de censure, qui exige lui un seuil absolu.',
    reperes: [
      'Seuil : majorité des suffrages exprimés (pour vs contre)',
      'Les abstentions ne comptent pas dans le calcul',
      'À distinguer de la motion de censure (seuil fixe de 289)',
    ],
  },
  {
    id: 'navette-parlementaire-senat',
    titre: 'Pourquoi un texte fait-il des allers-retours entre les deux chambres ?',
    article: null,
    texte: 'Une loi doit en principe être votée dans les mêmes termes par l’Assemblée nationale et par le Sénat : c’est la navette parlementaire. Si les deux chambres ne s’accordent pas, le texte repasse d’une assemblée à l’autre jusqu’à un accord, ou jusqu’à ce que le gouvernement décide de convoquer une commission mixte paritaire pour trouver un compromis. En cas d’échec persistant, le gouvernement peut demander à l’Assemblée nationale de statuer définitivement, qui a alors le dernier mot sur le Sénat. Le Sénat, élu au suffrage universel indirect par les grands électeurs, ne peut pas être dissous par le président de la République.',
    reperes: [
      'Deux chambres : Assemblée nationale et Sénat',
      'Commission mixte paritaire = 7 députés + 7 sénateurs pour trouver un compromis',
      'En dernier ressort, l’Assemblée nationale a le dernier mot',
    ],
  },
  {
    id: 'article-49-3',
    titre: 'C’est quoi, le 49.3 ?',
    article: 'Article 49 alinéa 3 de la Constitution',
    texte: 'Le 49.3 permet au Premier ministre d’engager la responsabilité de son gouvernement sur un projet de loi de finances ou de financement de la sécurité sociale, et sur un seul autre texte par session. Concrètement, le texte est considéré comme adopté sans vote des députés, sauf si une motion de censure est déposée dans les 24 heures et obtient la majorité absolue de 289 voix. Si la motion échoue, le texte est adopté ; si elle réussit, le gouvernement tombe et le texte est rejeté. C’est donc un outil qui inverse la charge de la preuve : ce n’est plus au gouvernement de rassembler une majorité pour faire voter le texte, mais à l’opposition de rassembler 289 voix pour le censurer.',
    reperes: [
      'Motion de censure obligatoire en réponse, sous 24 heures',
      'Seuil de la motion : 289 voix « pour »',
      'Usage illimité pour les textes budgétaires depuis la révision de 2008 ; limité à un texte par session pour les autres',
    ],
  },
  {
    id: 'motion-de-censure',
    titre: 'Comment fait-on tomber un gouvernement ?',
    article: 'Article 49 (alinéas 2 et 3) de la Constitution',
    texte: 'Une motion de censure est une procédure par laquelle les députés peuvent renverser le gouvernement. Pour être recevable, elle doit être signée par au moins un dixième des députés, soit 58 signataires sur 577. Le vote a lieu au moins 48 heures après le dépôt, et seuls les votes « pour » sont comptés : il faut atteindre la majorité absolue de 289 voix pour que la motion soit adoptée et le gouvernement démissionne. Un député ne peut pas signer plus de trois motions de censure lors d’une même session ordinaire (hors motions liées au 49.3).',
    reperes: [
      'Signatures nécessaires pour déposer : 1/10e des députés, soit 58',
      'Seuil d’adoption : 289 voix « pour »',
      'Deux motions de censure adoptées depuis 1958 : en 1962, puis en décembre 2024',
    ],
  },
  {
    id: 'dissolution',
    titre: 'Le président peut-il dissoudre l’Assemblée quand il veut ?',
    article: 'Article 12 de la Constitution',
    texte: 'Le président de la République peut décider seul de dissoudre l’Assemblée nationale, après avoir consulté le Premier ministre et les présidents des deux assemblées, sans que cet avis ne le lie. La dissolution provoque de nouvelles élections législatives dans un délai de 20 à 40 jours. Une seule limite constitutionnelle existe : il ne peut pas y avoir de nouvelle dissolution dans l’année qui suit une élection consécutive à une dissolution précédente. En dehors de cette contrainte d’un an, rien n’empêche juridiquement plusieurs dissolutions sous un même mandat.',
    reperes: [
      'Nouvelles élections organisées entre 20 et 40 jours après la dissolution',
      'Interdiction d’une nouvelle dissolution dans l’année suivant les élections issues d’une dissolution',
      'Plusieurs dissolutions ont eu lieu depuis 1958 (dont 1962, 1968, 1981, 1988, 1997, 2024)',
    ],
  },
  {
    id: 'referendum-article-11',
    titre: 'Comment un référendum national est-il déclenché ?',
    article: 'Article 11 de la Constitution',
    texte: 'Le président de la République peut soumettre au référendum certains projets de loi, sur proposition du gouvernement ou des deux assemblées, dans des domaines limités par la Constitution : organisation des pouvoirs publics, réformes économiques, sociales ou environnementales, ou encore autorisation de ratifier un traité. Depuis une révision de 2008, un référendum d’initiative partagée peut aussi être déclenché à l’initiative d’un cinquième des parlementaires soutenus par un dixième des électeurs inscrits sur les listes électorales, mais cette procédure reste très encadrée et lourde à mettre en œuvre. Un référendum adopté à la majorité des suffrages exprimés a directement force de loi, sans nouveau vote du Parlement.',
    reperes: [
      'Référendum d’initiative partagée : soutien d’1/5e des parlementaires + 1/10e du corps électoral',
      'Procédure introduite par la révision constitutionnelle de 2008',
      'Plusieurs référendums nationaux organisés depuis 1958 sur des sujets variés',
    ],
  },
  {
    id: 'plf-calendrier-budgetaire',
    titre: 'Comment le budget de l’État est-il voté chaque année ?',
    article: 'Article 47 de la Constitution',
    texte: 'Le projet de loi de finances (PLF) fixe les recettes et les dépenses de l’État pour l’année suivante. Il est déposé à l’Assemblée nationale avant la fin du mois d’octobre et doit être examiné dans un délai global de 70 jours entre les deux chambres, faute de quoi le gouvernement peut le mettre en œuvre par ordonnance. Si le budget n’est pas adopté avant le 1er janvier, une loi spéciale peut autoriser l’État à continuer de percevoir les impôts existants le temps que le PLF complet soit voté. Le budget fait souvent l’objet d’un usage du 49.3, car il doit impérativement aboutir dans les délais constitutionnels.',
    reperes: [
      'Délai global d’examen du PLF : 70 jours',
      'Dépôt attendu avant la fin octobre pour une entrée en vigueur au 1er janvier',
      'Une loi spéciale peut permettre de continuer à percevoir l’impôt en l’absence de budget voté',
    ],
  },
  {
    id: 'abstention-participation',
    titre: 'Pourquoi parle-t-on autant du taux de participation ?',
    article: null,
    texte: 'Le taux de participation mesure la part des électeurs inscrits qui votent effectivement, par opposition à l’abstention. En France, la participation varie fortement selon le type de scrutin : elle est généralement plus élevée à l’élection présidentielle qu’aux élections européennes, municipales ou législatives, en particulier lors du second tour des législatives quand le résultat local semble déjà joué. Une abstention élevée ne change pas les règles de majorité : un texte ou un candidat peut être adopté ou élu avec un nombre de voix réduit si peu d’électeurs se déplacent. Elle interroge en revanche la représentativité du résultat, sujet largement débattu par les chercheurs en sciences politiques.',
    reperes: [
      'Participation habituellement plus forte à la présidentielle qu’aux autres scrutins nationaux',
      'L’abstention ne modifie pas les seuils légaux de majorité',
      'Le vote blanc est comptabilisé séparément et n’est pas assimilé à un suffrage exprimé pour l’élection présidentielle',
    ],
  },
  {
    id: 'conseil-constitutionnel',
    titre: 'À quoi sert le Conseil constitutionnel ?',
    article: 'Articles 56 à 62 de la Constitution',
    texte: 'Le Conseil constitutionnel vérifie que les lois respectent la Constitution, avant leur promulgation (contrôle a priori) ou à l’occasion d’un procès en cours via la question prioritaire de constitutionnalité (contrôle a posteriori, depuis 2010). Il est composé de neuf membres nommés pour neuf ans non renouvelables, renouvelés par tiers tous les trois ans, à parts égales par le président de la République et les présidents des deux assemblées ; les anciens présidents de la République peuvent également en être membres de droit. Il contrôle aussi la régularité des élections présidentielle et législatives, et proclame les résultats de l’élection présidentielle. Une loi qu’il juge contraire à la Constitution ne peut pas être promulguée en l’état.',
    reperes: [
      '9 membres nommés, mandat de 9 ans non renouvelable',
      'Question prioritaire de constitutionnalité (QPC) instaurée en 2010',
      'Renouvellement par tiers tous les 3 ans',
    ],
  },
  {
    id: 'election-presidentielle',
    titre: 'Comment devient-on candidat à la présidentielle, et comment se déroule le vote ?',
    article: 'Article 7 de la Constitution',
    texte: 'Pour être candidat à l’élection présidentielle, il faut obtenir au moins 500 signatures d’élus habilités (parrainages), provenant d’au moins 30 départements ou collectivités d’outre-mer différents, sans qu’un même département puisse fournir plus d’un dixième de ces signatures. L’élection se déroule en principe en deux tours si aucun candidat n’obtient la majorité absolue des suffrages exprimés au premier tour, seuls les deux candidats arrivés en tête étant qualifiés pour le second. Le mandat présidentiel dure cinq ans depuis la révision constitutionnelle de 2000 (quinquennat), contre sept ans auparavant (septennat).',
    reperes: [
      'Parrainages requis : 500 élus, dans au moins 30 départements ou collectivités',
      'Second tour entre les deux candidats arrivés en tête, sauf majorité absolue au premier tour',
      'Quinquennat depuis 2000 (auparavant septennat de 7 ans)',
    ],
  },
  {
    id: 'autres-scrutins',
    titre: 'Européennes, sénatoriales, municipales : quelles différences ?',
    article: null,
    texte: 'Les élections européennes désignent les représentants français au Parlement européen au scrutin proportionnel, sur une liste nationale unique, pour un mandat de cinq ans. Les élections sénatoriales n’impliquent pas l’ensemble des citoyens : les sénateurs sont élus au suffrage universel indirect par un collège de grands électeurs, essentiellement des élus locaux, renouvelé par moitié tous les trois ans, pour un mandat de six ans. Les élections municipales, au suffrage universel direct, désignent les conseillers municipaux qui élisent ensuite le maire ; le mode de scrutin diffère selon la taille de la commune (scrutin de liste avec prime majoritaire dans les communes de 1 000 habitants et plus). Chacun de ces scrutins répond à un calendrier et à un mode de désignation propres, indépendants de celui des élections présidentielle et législatives.',
    reperes: [
      'Européennes : proportionnelle, liste nationale, mandat de 5 ans',
      'Sénatoriales : suffrage universel indirect, renouvellement par moitié tous les 3 ans, mandat de 6 ans',
      'Municipales : suffrage universel direct, seuil de scrutin de liste à 1 000 habitants',
    ],
  },
  {
    id: 'premier-ministre-responsabilite',
    titre: 'Quel est le rôle du Premier ministre face à l’Assemblée ?',
    article: 'Articles 20, 21 et 49 de la Constitution',
    texte: 'Le Premier ministre dirige l’action du gouvernement et est nommé par le président de la République, sans vote formel d’investiture obligatoire par l’Assemblée nationale. En revanche, le gouvernement est responsable devant l’Assemblée nationale : elle peut le renverser par une motion de censure, ou le Premier ministre peut lui-même engager sa responsabilité sur son programme ou une déclaration de politique générale. Si l’Assemblée ne partage pas la couleur politique du président, un Premier ministre peut être nommé dans une autre orientation que la sienne : c’est ce qu’on appelle la cohabitation, déjà survenue à plusieurs reprises sous la Ve République. Dans tous les cas, un gouvernement qui perd la confiance de l’Assemblée doit démissionner.',
    reperes: [
      'Nomination par le président, sans investiture obligatoire par l’Assemblée',
      'Responsabilité effective : motion de censure (art. 49.2) ou engagement volontaire (art. 49.1 et 49.3)',
      'Trois cohabitations nationales depuis 1958 (1986-1988, 1993-1995, 1997-2002)',
    ],
  },
];

/**
 * Retourne la fiche correspondant à l'identifiant donné, ou undefined si absente.
 * @param {string} id
 * @returns {{id: string, titre: string, article: string|null, texte: string, reperes: string[]}|undefined}
 */
export function ficheParId(id) {
  return FICHES.find((f) => f.id === id);
}
