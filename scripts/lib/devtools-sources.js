/**
 * Fetches and parses the two authoritative Chrome DevTools sources:
 *
 * 1. `front_end/panels/elements/PropertyNameCategories.ts` The hand-curated
 *    category lists and category display order used by the Computed panel's
 *    "Group" mode.
 * 2. `front_end/generated/SupportedCSSProperties.js` Generated from Blink's
 *    css_properties.json5 — every property Chrome supports, shorthand →
 *    longhand relationships, and alias → canonical mappings. This is what
 *    CSSMetadata reads at runtime, and it is how new CSS properties are picked
 *    up: rerun the generator and any property newly shipped in Blink flows
 *    through.
 *
 * Fetched files are cached in vendor/ (committed) so generation works offline
 * and is reproducible.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GITILES_BASE =
  "https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/main";

const SOURCE_FILES = [
  "front_end/panels/elements/PropertyNameCategories.ts",
  "front_end/generated/SupportedCSSProperties.js",
];

/**
 * @param {string} rootDir
 * @returns {string}
 */
export function vendorDir(rootDir) {
  return path.join(rootDir, "vendor");
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Downloads the sources (plus the current main commit hash) into vendor/.
 *
 * @param {string} rootDir
 * @returns {Promise<object>} The written metadata
 */
export async function refreshSources(rootDir) {
  const dir = vendorDir(rootDir);
  await mkdir(dir, { recursive: true });

  // Gitiles returns raw file contents base64-encoded with ?format=TEXT.
  for (const filePath of SOURCE_FILES) {
    const base64 = await fetchText(`${GITILES_BASE}/${filePath}?format=TEXT`);
    const name = filePath.split("/").pop();
    await writeFile(path.join(dir, name), Buffer.from(base64, "base64"));
  }

  // Commit metadata: gitiles JSON responses are prefixed with `)]}'`.
  let commit = null;
  try {
    const json = await fetchText(`${GITILES_BASE}?format=JSON`);
    commit = JSON.parse(json.replace(/^\)\]\}'/, "")).commit ?? null;
  } catch {
    // Commit hash is informational only.
  }

  const meta = {
    repository: GITILES_BASE,
    commit,
    fetchedAt: new Date().toISOString(),
    files: SOURCE_FILES,
  };
  await writeFile(
    path.join(dir, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
  );
  return meta;
}

/**
 * Parses PropertyNameCategories.ts (regex-based — the file is TypeScript with
 * const enums, so it cannot be imported directly). Throws loudly if the
 * upstream structure changes, which is the signal to update this parser.
 *
 * @param {string} source
 * @returns {{
 *   categoryOrder: string[];
 *   categorizedProperties: Map<string, string[]>;
 * }}
 */
export function parsePropertyNameCategories(source) {
  const enumBlock = source.match(/export const enum Category \{([\s\S]*?)\}/);
  if (!enumBlock) {
    throw new Error(
      "PropertyNameCategories.ts: could not find `export const enum Category` — upstream format changed",
    );
  }
  const enumValues = new Map(
    [...enumBlock[1].matchAll(/(\w+)\s*=\s*'([^']*)'/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );

  const orderBlock = source.match(
    /export const DefaultCategoryOrder = \[([\s\S]*?)\];/,
  );
  if (!orderBlock) {
    throw new Error(
      "PropertyNameCategories.ts: could not find `DefaultCategoryOrder` — upstream format changed",
    );
  }
  const categoryOrder = [...orderBlock[1].matchAll(/Category\.(\w+)/g)].map(
    (m) => {
      const value = enumValues.get(m[1]);
      if (!value) throw new Error(`Unknown Category enum member: ${m[1]}`);
      return value;
    },
  );

  const mapBlock = source.match(
    /const CategorizedProperties = new Map\(\[([\s\S]*?)\]\);/,
  );
  if (!mapBlock) {
    throw new Error(
      "PropertyNameCategories.ts: could not find `CategorizedProperties` — upstream format changed",
    );
  }
  const categorizedProperties = new Map();
  for (const entry of mapBlock[1].matchAll(
    /Category\.(\w+),\s*\[([^\]]*)\]/g,
  )) {
    const category = enumValues.get(entry[1]);
    if (!category) throw new Error(`Unknown Category enum member: ${entry[1]}`);
    const names = [...entry[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(
      (m) => m[1],
    );
    categorizedProperties.set(category, names);
  }
  if (categorizedProperties.size === 0) {
    throw new Error(
      "PropertyNameCategories.ts: parsed zero categories — upstream format changed",
    );
  }

  return { categoryOrder, categorizedProperties };
}

/**
 * Loads and parses the vendored sources.
 *
 * @param {string} rootDir
 * @returns {Promise<object>}
 */
export async function loadSources(rootDir) {
  const dir = vendorDir(rootDir);

  const categoriesSource = await readFile(
    path.join(dir, "PropertyNameCategories.ts"),
    "utf8",
  );
  const { categoryOrder, categorizedProperties } =
    parsePropertyNameCategories(categoriesSource);

  // SupportedCSSProperties.js is plain ESM — import it directly instead of
  // parsing. Cache-bust so a refresh within the same process is picked up.
  const supported = await import(
    pathToFileURL(path.join(dir, "SupportedCSSProperties.js")).href +
      `?t=${Date.now()}`
  );

  const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8"));

  return {
    categoryOrder,
    categorizedProperties,
    generatedProperties: supported.generatedProperties,
    generatedAliasesFor: supported.generatedAliasesFor,
    meta,
  };
}
