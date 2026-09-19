import assert from "node:assert/strict";
import test from "node:test";

import css from "@eslint/css";
import { ESLint } from "eslint";

import plugin, { createHtmlProcessor } from "../index.js";
import { extractStyleTags } from "../src/processors/html.js";
import { extractCssTemplates } from "../src/processors/tagged-template.js";

// ─── Scanner unit tests ──────────────────────────────────────────────────────

test("extractStyleTags finds style blocks and their offsets", () => {
  const html = `<style>a{}</style><div></div><style media="print">b{}</style>`;
  const blocks = extractStyleTags(html);
  assert.deepEqual(
    blocks.map(({ text }) => text),
    ["a{}", "b{}"],
  );
  for (const { offset, text } of blocks) {
    assert.equal(html.slice(offset, offset + text.length), text);
  }
});

test("extractStyleTags skips comments, scripts, and non-CSS types", () => {
  const html = `
<!-- <style>ignored{}</style> -->
<script>const s = "<style>alsoIgnored{}</style>";</script>
<style type="text/plain">notCss{}</style>
<style type="text/css">real{}</style>
`;
  assert.deepEqual(
    extractStyleTags(html).map(({ text }) => text),
    ["real{}"],
  );
});

test("extractCssTemplates finds comment-annotated and tagged templates", () => {
  const js = [
    "const a = /* css */ `a{}`;",
    "const b = /*CSS*/`b{}`;",
    "const c = css`c{}`;",
    "const d = styled.css `d{}`;",
    "const e = `not extracted`;",
    "const f = other`not extracted`;",
  ].join("\n");
  const blocks = extractCssTemplates(js, ["css"]);
  assert.deepEqual(
    blocks.map(({ text }) => text),
    ["a{}", "b{}", "c{}", "d{}"],
  );
  for (const { offset, text } of blocks) {
    assert.equal(js.slice(offset, offset + text.length), text);
  }
});

test("extractCssTemplates skips substitutions, escapes, and markers in strings", () => {
  const js = [
    "const a = /* css */ `a{ color: ${color}; }`;", // substitution
    'const b = /* css */ `b{ content: \\"x\\"; }`;', // backslash escape
    'const c = "/* css */ `not a template`";', // marker inside a string
    "// /* css */ `not a template either`", // marker inside a comment
    "const d = css`d{}`;",
  ].join("\n");
  assert.deepEqual(
    extractCssTemplates(js, ["css"]).map(({ text }) => text),
    ["d{}"],
  );
});

test("extractCssTemplates honours custom tag names", () => {
  const js = "const a = style`a{}`; const b = css`b{}`;";
  assert.deepEqual(
    extractCssTemplates(js, ["style"]).map(({ text }) => text),
    ["a{}"],
  );
});

test("emitSource re-emits the host source as a bare-string block", () => {
  const processor = createHtmlProcessor({ emitSource: true });
  const html = `<style>a { color: red; }</style>`;
  const blocks = processor.preprocess(html, "page.html");
  // A bare string — not { text, filename } — so ESLint verifies it under the
  // host filename through the path patch-based plugins (eslint-plugin-html)
  // can intercept.
  assert.equal(blocks[0], html);
  assert.deepEqual(blocks[1], { text: "a { color: red; }", filename: "0.css" });
  processor.postprocess([[], []], "page.html");
});

// ─── ESLint integration ──────────────────────────────────────────────────────

/**
 * @param {object[]} extra extra config objects
 * @returns {ESLint}
 */
function createESLint(...extra) {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.css"],
        plugins: { css, "css-property-order": plugin },
        language: "css/css",
        rules: {
          "css-property-order/property-order": ["error", { order: "recess" }],
        },
      },
      ...extra,
    ],
    fix: true,
  });
}

test("html processor lints and fixes <style> blocks in place", async () => {
  const eslint = createESLint({
    files: ["**/*.html"],
    plugins: { "css-property-order": plugin },
    processor: "css-property-order/html",
  });
  const html = `<!doctype html>
<html><head>
<style>
  a {
    color: red;
    display: block;
    --x: 1;
  }
</style>
</head><body>
<p>text</p><style>b { width: 0; position: fixed; }</style>
</body></html>
`;
  const [result] = await eslint.lintText(html, { filePath: "page.html" });
  assert.equal(
    result.output,
    `<!doctype html>
<html><head>
<style>
  a {
    --x: 1;
    display: block;
    color: red;
  }
</style>
</head><body>
<p>text</p><style>b { position: fixed; width: 0; }</style>
</body></html>
`,
  );
  assert.deepEqual(result.messages, []);
});

test("html processor maps message positions to the host file", async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.css"],
        plugins: { css, "css-property-order": plugin },
        language: "css/css",
        rules: { "css-property-order/property-order": "error" },
      },
      {
        files: ["**/*.html"],
        plugins: { "css-property-order": plugin },
        processor: "css-property-order/html",
      },
    ],
  });
  const html = `<div></div>\n<style>a { display: block; position: fixed; }</style>\n`;
  const [result] = await eslint.lintText(html, { filePath: "page.html" });
  assert.equal(result.messages.length, 1);
  // "position" starts at column 28 of line 2 in the host file:
  // 7 chars of "<style>" + 20 chars of CSS before it, 1-based.
  assert.equal(result.messages[0].line, 2);
  assert.equal(result.messages[0].column, 28);
});

test("tagged-template processor fixes templates and keeps JS linting alive", async () => {
  const eslint = createESLint({
    files: ["**/*.js"],
    plugins: { "css-property-order": plugin },
    processor: "css-property-order/tagged-template",
    rules: { "no-debugger": "error" },
  });
  const js = `const styles = /* css */ \`
  a {
    color: red;
    display: block;
  }
\`;
debugger;
export default styles;
`;
  const [result] = await eslint.lintText(js, { filePath: "styles.js" });
  assert.equal(
    result.output,
    `const styles = /* css */ \`
  a {
    display: block;
    color: red;
  }
\`;
debugger;
export default styles;
`,
  );
  // The re-emitted source block keeps regular JS rules running, with
  // positions mapping straight through.
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].ruleId, "no-debugger");
  assert.equal(result.messages[0].line, 7);
});

test("tagged-template processor handles multiple templates in one file", async () => {
  const eslint = createESLint({
    files: ["**/*.js"],
    plugins: { "css-property-order": plugin },
    processor: "css-property-order/tagged-template",
  });
  const js = `export const a = css\`p { width: 0; display: block; }\`;
export const b = /* css */ \`q { color: red; position: fixed; }\`;
`;
  const [result] = await eslint.lintText(js, { filePath: "styles.js" });
  assert.equal(
    result.output,
    `export const a = css\`p { display: block; width: 0; }\`;
export const b = /* css */ \`q { position: fixed; color: red; }\`;
`,
  );
});
