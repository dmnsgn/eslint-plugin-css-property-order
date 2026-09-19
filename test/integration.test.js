import assert from "node:assert/strict";
import test from "node:test";

import css from "@eslint/css";
import { ESLint } from "eslint";

import plugin, { devtoolsOrder, recessOrder } from "../index.js";
import { createOrderIndex } from "../src/rules/property-order.js";

/**
 * @param {object[]} overrides extra config objects
 * @returns {ESLint}
 */
function createESLint(...overrides) {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.css"],
        plugins: { css, "css-property-order": plugin },
        language: "css/css",
      },
      ...overrides,
    ],
    fix: true,
  });
}

test("recommended config fixes to the Recess order", async () => {
  const eslint = createESLint(plugin.configs.recommended);
  const code = `a {
  color: red;
  width: 0;
  --x: 1;
  display: grid;
  position: absolute;
  height: 2px;
}
`;
  const [result] = await eslint.lintText(code, { filePath: "input.css" });
  assert.equal(
    result.output,
    `a {
  --x: 1;
  position: absolute;
  display: grid;
  width: 0;
  height: 2px;
  color: red;
}
`,
  );
  assert.deepEqual(result.messages, [], "fix converges in one ESLint run");
});

test("devtools config sorts like the DevTools Computed panel", async () => {
  const eslint = createESLint(plugin.configs.devtools);
  const code = `a {
  transform: none;
  content: "";
  border-collapse: collapse;
  font-size: 1rem;
  transition: all 1s;
  color: red;
  overflow-wrap: break-word;
  place-items: center;
  width: 0;
  display: grid;
}
`;
  const [result] = await eslint.lintText(code, { filePath: "input.css" });
  // Layout → Text → Appearance → Animation → Grid → Generated Content →
  // unspecified ("Other") alphabetical at the bottom.
  assert.equal(
    result.output,
    `a {
  display: grid;
  width: 0;
  font-size: 1rem;
  color: red;
  transition: all 1s;
  place-items: center;
  border-collapse: collapse;
  content: "";
  overflow-wrap: break-word;
  transform: none;
}
`,
  );
});

test("alphabetical config sorts every property without a list", async () => {
  const eslint = createESLint(plugin.configs.alphabetical);
  const code = `a {
  width: 0;
  transform: none;
  --b: 1;
  -webkit-transform: none;
  corner-shape: squircle;
  --a: 2;
  display: block;
}
`;
  const [result] = await eslint.lintText(code, { filePath: "input.css" });
  assert.equal(
    result.output,
    `a {
  --a: 2;
  --b: 1;
  corner-shape: squircle;
  display: block;
  -webkit-transform: none;
  transform: none;
  width: 0;
}
`,
  );
  assert.deepEqual(result.messages, []);
});

test("reporting without fix names the misplaced properties", async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.css"],
        plugins: { css, "css-property-order": plugin },
        language: "css/css",
        rules: { "css-property-order/property-order": "error" },
      },
    ],
  });
  const [result] = await eslint.lintText("a { color: red; display: block; }", {
    filePath: "input.css",
  });
  assert.equal(result.messages.length, 1);
  assert.match(
    result.messages[0].message,
    /Expected "display" to come before "color"/,
  );
});

test("exported orders are well-formed", () => {
  for (const order of [devtoolsOrder, recessOrder]) {
    assert.ok(order.groups.length > 0);
    const properties = order.groups.flatMap((g) => g.properties);
    assert.ok(properties.length > 200);
    const index = createOrderIndex(order.name);
    assert.equal(index.size, new Set(properties).size);
  }
  // Sanity: the pain point that motivated the Recess default.
  const recess = createOrderIndex("recess");
  // width … min/max-width, block-size … height: 6 apart, same sizing cluster.
  assert.equal(
    Math.abs(recess.get("width") - recess.get("height")) <= 6,
    true,
    "width and height are neighbours in the Recess order",
  );
  assert.ok(recess.get("position") < recess.get("display"));
  const devtools = createOrderIndex("devtools");
  assert.ok(devtools.get("display") < devtools.get("font-size"));
});
