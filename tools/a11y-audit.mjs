// Audit d'accessibilité automatisé : parcours clavier complet + axe-core
// (WCAG 2.0/2.1 AA) sur chaque onglet.
// Prérequis : serveur statique lancé (python3 -m http.server 8080) et
// `npm install playwright-core axe-core` dans le répertoire d'exécution.
// Usage : node tools/a11y-audit.mjs [urlBase] [cheminChromium]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Les dépendances (playwright-core, axe-core) sont résolues depuis le
// répertoire d'exécution, pas depuis tools/ — le script peut vivre dans le
// dépôt tandis que les node_modules restent hors dépôt.
const requireCwd = createRequire(pathToFileURL(`${process.cwd()}/`));
const pw = await import(pathToFileURL(requireCwd.resolve('playwright-core')));
const chromium = (pw.default ?? pw).chromium;
const axeSource = readFileSync(requireCwd.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.argv[2] || 'http://localhost:8080/';
const CHROMIUM = process.argv[3] || process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const erreursJs = [];
page.on('pageerror', (e) => erreursJs.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle' });
let echecs = 0;
const attendre = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) echecs++; };

// --- Parcours clavier --------------------------------------------------------
await page.click('[data-theme="climat"]');
attendre((await page.evaluate(() => document.activeElement.id)) === 'titre-theme',
  'focus sur le titre du thème à l’ouverture');
await page.focus('[data-plus="renouvelables"]');
for (let i = 0; i < 12; i++) await page.keyboard.press('Enter');
attendre(await page.evaluate(() => document.querySelector('[data-plus="renouvelables"]').disabled),
  'bouton + désactivé à budget épuisé');
attendre((await page.textContent('#quiz-live')).includes('Budget restant : 0'),
  'région live annonçant l’allocation');
await page.click('#valider-theme');

await page.click('[data-onglet="profil"]');
await page.click('[data-guilde="eco-sociale"]');
await page.click('[data-onglet="carte"]');
attendre((await page.evaluate(() => document.querySelectorAll('#carte .cell[tabindex="0"]').length)) === 1,
  'la carte des 577 cellules n’expose qu’UN point de tabulation');
await page.focus('.cell[tabindex="0"]');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
attendre((await page.evaluate(() => document.activeElement.id)) === 'titre-circo',
  'Entrée ouvre le détail et y déplace le focus');
await page.focus('#btn-investir');
await page.keyboard.press('Enter');
attendre((await page.evaluate(() => document.activeElement.id)) === 'btn-investir',
  'focus conservé sur « Investir » après re-rendu (investissements répétés)');

// --- axe-core sur chaque onglet ----------------------------------------------
for (const onglet of ['quiz', 'carte', 'hemicycle', 'alliances', 'scrutins', 'profil']) {
  await page.click(`[data-onglet="${onglet}"]`);
  await page.waitForTimeout(400);
  // Neutraliser les toasts en cours de fondu : état transitoire hors périmètre WCAG,
  // source de faux positifs color-contrast.
  await page.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.classList.remove('visible'); t.textContent = ''; } });
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.html.slice(0, 120)) }));
  });
  attendre(violations.length === 0, `axe [${onglet}] : ${violations.length ? JSON.stringify(violations) : 'aucune violation'}`);
}
attendre(erreursJs.length === 0, `zéro erreur JavaScript (${erreursJs.join(' | ') || 'ok'})`);
await browser.close();
process.exit(echecs ? 1 : 0);
