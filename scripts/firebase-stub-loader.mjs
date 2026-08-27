// Node ESM loader used only by scripts/boot-smoke-test.mjs.
// Stubs the two Firebase CDN imports so app.js can be executed in Node
// without a real network/Firebase runtime.
const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
const FIREBASE_DB_URL = "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === FIREBASE_APP_URL) {
    return { url: "firebase-stub:app", shortCircuit: true };
  }
  if (specifier === FIREBASE_DB_URL) {
    return { url: "firebase-stub:database", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === "firebase-stub:app") {
    return {
      format: "module",
      shortCircuit: true,
      source: `export function initializeApp() { return {}; }`,
    };
  }
  if (url === "firebase-stub:database") {
    return {
      format: "module",
      shortCircuit: true,
      source: `
        export function getDatabase() { return {}; }
        export function ref() { return {}; }
        export function get() { return Promise.resolve({ exists: () => false, val: () => null }); }
        export function onValue() { return () => {}; }
        export function push() { return { key: "stub" }; }
        export function set() { return Promise.resolve(); }
        export function update() { return Promise.resolve(); }
        export function remove() { return Promise.resolve(); }
        export function serverTimestamp() { return 0; }
      `,
    };
  }
  return nextLoad(url, context);
}
