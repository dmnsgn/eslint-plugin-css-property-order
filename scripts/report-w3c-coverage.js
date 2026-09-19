#!/usr/bin/env node
/**
 * Reports how the built-in presets cover the official W3C CSS property index
 * (https://www.w3.org/Style/CSS/all-properties.en.json — every property from
 * every CSS specification, at every maturity level).
 *
 * This is a reporting tool only: presets are not amended from it. The Recess
 * preset is an upstream snapshot and the DevTools preset a faithful replication
 * — properties they don't list are handled at lint time by the `unspecified`
 * option, and the `alphabetical` order needs no list at all.
 *
 * By default only properties that reached at least Working Draft in some spec
 * are considered (ED/FPWD/NOTE-only properties are mostly unimplemented).
 *
 * Usage: node scripts/report-w3c-coverage.js # WD and later node
 * scripts/report-w3c-coverage.js --all # every spec status node
 * scripts/report-w3c-coverage.js --refresh # re-download the index
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import devtoolsOrder from "../src/orders/devtools.js";
import recessOrder from "../src/orders/recess.js";

const W3C_URL = "https://www.w3.org/Style/CSS/all-properties.en.json";
const MATURE_STATUSES = new Set(["WD", "CR", "CRD", "PR", "REC"]);

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cachePath = path.join(rootDir, "vendor", "w3c-all-properties.en.json");
const args = new Set(process.argv.slice(2));

let json;
try {
  if (args.has("--refresh")) throw new Error("refresh requested");
  json = await readFile(cachePath, "utf8");
} catch {
  console.log(`Fetching ${W3C_URL} …`);
  const response = await fetch(W3C_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${W3C_URL}: ${response.status}`);
  }
  json = await response.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, json);
}

/** @type {{ property: string; status: string }[]} */
const entries = JSON.parse(json);

const w3cProperties = new Set(
  entries
    .filter(
      ({ property, status }) =>
        property !== "--*" &&
        (args.has("--all") || MATURE_STATUSES.has(status)),
    )
    .map(({ property }) => property.toLowerCase()),
);

console.log(
  `W3C index: ${w3cProperties.size} unique properties (${
    args.has("--all") ? "all statuses" : "WD and later"
  })\n`,
);

for (const order of [recessOrder, devtoolsOrder]) {
  const listed = new Set(
    order.groups.flatMap((g) => g.properties.map((p) => p.toLowerCase())),
  );
  const missing = [...w3cProperties].filter((p) => !listed.has(p)).sort();
  const extra = [...listed].filter((p) => !w3cProperties.has(p)).sort();

  console.log(`── ${order.name} (${listed.size} properties)`);
  console.log(
    `   covers ${w3cProperties.size - missing.length}/${w3cProperties.size} W3C properties`,
  );
  console.log(
    `   missing ${missing.length} (fall back to the \`unspecified\` option):`,
  );
  for (const property of missing) console.log(`     ${property}`);
  console.log(
    `   lists ${extra.length} properties outside the W3C index (vendor-prefixed/non-standard):`,
  );
  for (const property of extra) console.log(`     ${property}`);
  console.log("");
}
