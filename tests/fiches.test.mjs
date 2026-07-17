import test from 'node:test';
import assert from 'node:assert/strict';
import { FICHES, ficheParId } from '../js/fiches.js';
import { MAJORITE_ABSOLUE, CIRCOS } from '../js/data.js';

// Sigles de partis réels (liste noire simple) : la neutralité politique interdit
// de nommer un parti ou une personnalité, même sous forme de sigle courant.
const SIGLES_INTERDITS = [
  'RN', 'LFI', 'LR', 'PS', 'EELV', 'UDI', 'MoDem', 'Renaissance', 'REC',
  'Reconquête', 'NUPES', 'Ensemble', 'LREM', 'UMP', 'PCF',
];

test('au moins 14 fiches sont présentes', () => {
  assert.ok(FICHES.length >= 14, `seulement ${FICHES.length} fiches`);
});

test('les identifiants de fiche sont uniques et en kebab-case', () => {
  const ids = new Set(FICHES.map((f) => f.id));
  assert.equal(ids.size, FICHES.length, 'des ids sont dupliqués');
  for (const f of FICHES) {
    assert.match(f.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `id non kebab-case : ${f.id}`);
  }
});

test('chaque fiche a les champs requis, non vides', () => {
  for (const f of FICHES) {
    assert.equal(typeof f.id, 'string');
    assert.ok(f.id.length > 0, 'id vide');
    assert.equal(typeof f.titre, 'string');
    assert.ok(f.titre.trim().length > 0, `${f.id} : titre vide`);
    assert.ok(f.article === null || typeof f.article === 'string', `${f.id} : article invalide`);
    if (typeof f.article === 'string') assert.ok(f.article.trim().length > 0, `${f.id} : article vide`);
    assert.equal(typeof f.texte, 'string');
    assert.ok(f.texte.trim().length > 0, `${f.id} : texte vide`);
    assert.ok(Array.isArray(f.reperes), `${f.id} : reperes doit être un tableau`);
  }
});

test('le texte de chaque fiche fait entre 200 et 900 caractères', () => {
  for (const f of FICHES) {
    assert.ok(
      f.texte.length >= 200 && f.texte.length <= 900,
      `${f.id} : texte de ${f.texte.length} caractères (attendu 200–900)`
    );
  }
});

test('chaque fiche a entre 2 et 4 repères, tous non vides', () => {
  for (const f of FICHES) {
    assert.ok(f.reperes.length >= 2 && f.reperes.length <= 4, `${f.id} : ${f.reperes.length} repères`);
    for (const r of f.reperes) {
      assert.equal(typeof r, 'string');
      assert.ok(r.trim().length > 0, `${f.id} : repère vide`);
    }
  }
});

test('les constantes citées (289, 577) sont cohérentes avec js/data.js', () => {
  assert.equal(MAJORITE_ABSOLUE, 289);
  assert.equal(CIRCOS.length, 577);
  for (const f of FICHES) {
    const blob = `${f.texte} ${f.reperes.join(' ')}`;
    if (blob.includes('289')) {
      // La présence de « 289 » doit toujours correspondre à la majorité absolue réelle.
      assert.equal(MAJORITE_ABSOLUE, 289, `${f.id} cite 289`);
    }
    if (blob.includes('577')) {
      assert.equal(CIRCOS.length, 577, `${f.id} cite 577`);
    }
  }
});

test('ficheParId retourne la bonne fiche ou undefined', () => {
  const premiere = FICHES[0];
  assert.deepEqual(ficheParId(premiere.id), premiere);
  assert.equal(ficheParId('id-inexistant-xyz'), undefined);
});

test('aucun sigle de parti réel ne figure dans les textes ou titres', () => {
  for (const f of FICHES) {
    const blob = `${f.titre} ${f.texte} ${f.reperes.join(' ')}`;
    for (const sigle of SIGLES_INTERDITS) {
      // Casse respectée (pas de flag "i") : les sigles de partis s'écrivent en
      // capitales dans un texte réel, alors que certains (« Ensemble »,
      // « Renaissance ») sont aussi des mots français courants en minuscules.
      const re = new RegExp(`\\b${sigle}\\b`);
      assert.ok(!re.test(blob), `${f.id} : mention suspecte de « ${sigle} »`);
    }
  }
});

test('la fiche 49.3 mentionne bien le seuil de 289 et la motion de censure', () => {
  const f = ficheParId('article-49-3');
  assert.ok(f, 'fiche article-49-3 introuvable');
  assert.match(f.texte, /289/);
  assert.match(f.texte, /motion de censure/i);
});
