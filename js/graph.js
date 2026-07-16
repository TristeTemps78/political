// Phase 3 — Graphe de réseau des alliances de vote (nœuds = députés,
// arêtes = similarité de vote > seuil). Simulation de forces maison,
// exécutée hors ligne à l'initialisation (pas de dépendance D3).

import { FAMILLES } from './data.js';
import { adapter } from './adapter.js';
import { consulterDepute } from './guilds.js';

const SEUIL_SIMILARITE = 0.7;

export async function renderGraph(root) {
  root.innerHTML = `
    <div class="panel">
      <h3>Alliances objectives dans l’hémicycle</h3>
      <p class="hint">Deux député·es sont relié·es si leurs votes concordent sur plus de
      ${Math.round(SEUIL_SIMILARITE * 100)} % des scrutins. Les coalitions de circonstance et les
      dissidences internes apparaissent d’elles-mêmes.
      <strong>⚠️ ${adapter.label}</strong> — la donnée réelle arrive en phase 2 (+1 capital par fiche consultée).</p>
      <div id="graph-svg">Calcul du graphe…</div>
      <div id="depute-detail"></div>
    </div>`;

  const [deputes, scrutins] = await Promise.all([adapter.getDeputes(), adapter.getScrutins()]);
  const votesParScrutin = await Promise.all(scrutins.map((sc) => adapter.getVotes(sc.id)));

  // Matrice de similarité (taux d'accord positions identiques).
  const positions = new Map(); // deputeId -> [positions]
  for (const votes of votesParScrutin) {
    for (const v of votes) {
      if (!positions.has(v.deputeId)) positions.set(v.deputeId, []);
      positions.get(v.deputeId).push(v.position);
    }
  }
  const edges = [];
  for (let i = 0; i < deputes.length; i++) {
    for (let j = i + 1; j < deputes.length; j++) {
      const a = positions.get(deputes[i].id) || [];
      const b = positions.get(deputes[j].id) || [];
      const n = Math.min(a.length, b.length);
      if (!n) continue;
      let accord = 0;
      for (let k = 0; k < n; k++) if (a[k] === b[k]) accord += 1;
      const sim = accord / n;
      if (sim > SEUIL_SIMILARITE) edges.push({ source: i, target: j, poids: sim });
    }
  }

  // Simulation de forces : répulsion globale + ressorts sur les arêtes.
  const W = 700, H = 500;
  const nodes = deputes.map((d, i) => ({
    ...d,
    x: W / 2 + 180 * Math.cos((2 * Math.PI * i) / deputes.length),
    y: H / 2 + 180 * Math.sin((2 * Math.PI * i) / deputes.length),
    vx: 0, vy: 0,
  }));
  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const d2 = Math.max(100, dx * dx + dy * dy);
        const f = 2600 / d2;
        const dl = Math.sqrt(d2);
        nodes[i].vx -= (f * dx) / dl; nodes[i].vy -= (f * dy) / dl;
        nodes[j].vx += (f * dx) / dl; nodes[j].vy += (f * dy) / dl;
      }
    }
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = 0.02 * e.poids * (dist - 70);
      a.vx += (f * dx) / dist; a.vy += (f * dy) / dist;
      b.vx -= (f * dx) / dist; b.vy -= (f * dy) / dist;
    }
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.003; n.vy += (H / 2 - n.y) * 0.003; // gravité centrale
      n.x = Math.max(20, Math.min(W - 20, n.x + n.vx * 0.85));
      n.y = Math.max(20, Math.min(H - 20, n.y + n.vy * 0.85));
      n.vx *= 0.6; n.vy *= 0.6;
    }
  }

  // role="group" (et non "img") : les nœuds internes sont focusables et
  // interactifs — un role img les rendrait invisibles aux lecteurs d'écran.
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Graphe des alliances de vote — chaque nœud est un député activable">`;
  for (const e of edges) {
    const a = nodes[e.source], b = nodes[e.target];
    svg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
      stroke="var(--edge)" stroke-width="${(0.5 + (e.poids - SEUIL_SIMILARITE) * 8).toFixed(1)}" opacity="0.5"/>`;
  }
  nodes.forEach((n, i) => {
    const f = FAMILLES.find((x) => x.id === n.groupe);
    svg += `<circle class="node" data-i="${i}" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="10"
      fill="${f.couleur}" tabindex="0" role="button" aria-label="${n.nom}"><title>${n.nom} — ${f.nom}</title></circle>`;
  });
  svg += '</svg>';
  root.querySelector('#graph-svg').innerHTML = svg;

  const detail = root.querySelector('#depute-detail');
  root.querySelectorAll('.node').forEach((c) => {
    const ouvrir = (auClavier = false) => {
      const n = nodes[Number(c.dataset.i)];
      const f = FAMILLES.find((x) => x.id === n.groupe);
      const voisins = edges
        .filter((e) => nodes[e.source].id === n.id || nodes[e.target].id === n.id)
        .map((e) => {
          const autre = nodes[e.source].id === n.id ? nodes[e.target] : nodes[e.source];
          return { autre, poids: e.poids };
        })
        .sort((a, b) => b.poids - a.poids)
        .slice(0, 5);
      detail.innerHTML = `
        <div class="panel">
          <h4 id="titre-depute" tabindex="-1"><span class="pastille" style="background:${f.couleur}"></span> ${n.nom} <em>(fiche de démonstration)</em></h4>
          <p>${f.nom} — ${n.circoNom}. Loyauté de groupe : ${Math.round(n.loyaute * 100)} %.</p>
          <p><strong>Alliés de vote les plus proches :</strong></p>
          ${voisins.map((v) => `<div class="affinite-row">
            <span class="pastille" style="background:${FAMILLES.find((x) => x.id === v.autre.groupe).couleur}"></span>
            <span class="affinite-nom">${v.autre.nom}</span>
            <span class="affinite-score">${Math.round(v.poids * 100)} % d’accord</span></div>`).join('') || '<p>Aucune alliance au-dessus du seuil.</p>'}
        </div>`;
      if (auClavier) detail.querySelector('#titre-depute').focus();
      consulterDepute();
    };
    c.addEventListener('click', () => ouvrir(false));
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ouvrir(true); } });
  });
}
