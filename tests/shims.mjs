// Doublures minimales du DOM/localStorage pour tester le code du jeu sous Node.
// À importer AVANT js/store.js ou js/guilds.js.

const memoire = new Map();

globalThis.localStorage ??= {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
};

globalThis.document ??= {
  dispatchEvent: () => {},
  getElementById: () => null,
  createElement: () => ({
    classList: { add() {}, remove() {}, contains: () => false },
    style: {},
    set textContent(v) {},
    setAttribute() {},
    appendChild() {},
  }),
  body: { appendChild: () => {} },
};

globalThis.location ??= { reload: () => {} };

export function resetStorage() {
  memoire.clear();
}
