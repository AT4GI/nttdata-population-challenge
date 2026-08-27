// Smoke test: actually executes app.js in a simulated browser (jsdom) and
// fails if it throws during initial load. `node --check` only parses syntax
// and would NOT catch this class of bug (e.g. a top-level function call
// that references a `const` declared later in the file).
//
// Usage: node --experimental-loader ./scripts/firebase-stub-loader.mjs scripts/boot-smoke-test.mjs [siteDir]
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(process.argv[2] || path.join(scriptDir, ".."));
const html = fs.readFileSync(path.join(siteDir, "index.html"), "utf-8");

const dom = new JSDOM(html, {
  url: "https://at4gi.github.io/nttdata-population-challenge/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  resources: "usable",
});

const { window } = dom;

global.window = window;
global.document = window.document;
try {
  global.navigator = window.navigator;
} catch {
  Object.defineProperty(global, "navigator", { value: window.navigator, configurable: true });
}
global.HTMLElement = window.HTMLElement;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.location = window.location;
global.getComputedStyle = window.getComputedStyle.bind(window);
global.CustomEvent = window.CustomEvent;
global.Event = window.Event;

if (!global.crypto || !global.crypto.randomUUID) {
  const nodeCrypto = await import("node:crypto");
  global.crypto = { randomUUID: () => nodeCrypto.randomUUID() };
}

if (window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
}

let failed = false;
process.on("unhandledRejection", (err) => {
  failed = true;
  console.error("UNHANDLED REJECTION while booting app.js:");
  console.error(err);
});

try {
  const appUrl = pathToFileURL(path.join(siteDir, "app.js")).href;
  await import(appUrl);
} catch (err) {
  failed = true;
  console.error("app.js THREW while loading — this would break every button on the live site:");
  console.error(err);
}

if (failed) {
  process.exit(1);
}
console.log(`OK: ${path.join(siteDir, "app.js")} loaded and executed without throwing.`);
