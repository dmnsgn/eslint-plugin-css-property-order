/**
 * Processor extracting CSS-bearing template literals from JavaScript/TypeScript
 * files as virtual `*.css` files. Two forms are recognised:
 *
 *     const a = \/* css *\/ `...`;   // comment-annotated template
 *     const b = css`...`;            // tagged template (configurable tag names)
 *
 * A small scanner walks the source skipping strings and comments, so the
 * markers are never matched inside other tokens. Templates containing `${}`
 * substitutions or backslash escapes are skipped: their runtime value differs
 * from the source text, so positions and fixes could not be mapped reliably.
 * (Known limit: regular-expression literals containing quotes or backticks can
 * desynchronise the scanner.)
 */

import { createExtractionProcessor } from "./extract-css.js";

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;
const CSS_COMMENT = /^\s*css\s*$/i;

/**
 * @param {string} text Source
 * @param {number} start Index of the opening quote
 * @returns {number} Index after the closing quote (or line end if unterminated)
 */
function skipString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") i++;
    else if (ch === quote || ch === "\n") return i + 1;
  }
  return text.length;
}

/**
 * @typedef {object} TemplateSpan
 * @property {number} end Index after the closing backtick
 * @property {boolean} clean Whether the template body is verbatim CSS (no
 *   substitutions/escapes)
 */

/**
 * @param {string} text Source
 * @param {number} start Index of the opening backtick
 * @returns {TemplateSpan}
 */
function skipTemplate(text, start) {
  let clean = true;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      clean = false;
      i++;
    } else if (ch === "`") {
      return { end: i + 1, clean };
    } else if (ch === "$" && text[i + 1] === "{") {
      clean = false;
      i = skipSubstitution(text, i + 2) - 1;
    }
  }
  return { end: text.length, clean: false };
}

/**
 * @param {string} text Source
 * @param {number} start Index after "${"
 * @returns {number} Index after the matching "}"
 */
function skipSubstitution(text, start) {
  let depth = 1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    switch (ch) {
      case "{": {
        depth++;
        break;
      }
      case "}": {
        depth--;
        if (depth === 0) return i + 1;

        break;
      }
      case '"':
      case "'": {
        i = skipString(text, i) - 1;
        break;
      }
      case "`": {
        i = skipTemplate(text, i).end - 1;
        break;
      }
      default:
        if (ch === "/" && text[i + 1] === "*") {
          const close = text.indexOf("*/", i + 2);
          i = close === -1 ? text.length : close + 1;
        } else if (ch === "/" && text[i + 1] === "/") {
          const newline = text.indexOf("\n", i);
          i = newline === -1 ? text.length : newline;
        }
    }
  }
  return text.length;
}

/**
 * @param {string} text JavaScript/TypeScript source
 * @param {string[]} tags Template tag names that mark CSS
 * @returns {import("./extract-css.js").ExtractedBlock[]}
 */
export function extractCssTemplates(text, tags) {
  const blocks = [];
  // Candidate marker directly (whitespace apart) before a template literal.
  let pendingEnd = -1;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === "/" && text[i + 1] === "/") {
      const newline = text.indexOf("\n", i);
      i = newline === -1 ? text.length : newline;
      pendingEnd = -1;
    } else if (ch === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      const body = close === -1 ? text.slice(i + 2) : text.slice(i + 2, close);
      i = close === -1 ? text.length : close + 2;
      pendingEnd = CSS_COMMENT.test(body) ? i : -1;
    } else if (ch === '"' || ch === "'") {
      i = skipString(text, i);
      pendingEnd = -1;
    } else if (ch === "`") {
      const { end, clean } = skipTemplate(text, i);
      const marked =
        pendingEnd !== -1 && /^\s*$/.test(text.slice(pendingEnd, i));
      if (marked && clean) {
        blocks.push({ offset: i + 1, text: text.slice(i + 1, end - 1) });
      }
      i = end;
      pendingEnd = -1;
    } else if (IDENTIFIER_START.test(ch)) {
      let j = i + 1;
      while (j < text.length && IDENTIFIER_PART.test(text[j])) j++;
      pendingEnd = tags.includes(text.slice(i, j)) ? j : -1;
      i = j;
    } else {
      if (!/\s/.test(ch)) pendingEnd = -1;
      i++;
    }
  }
  return blocks;
}

/**
 * Creates the tagged-template processor.
 *
 * @param {object} [options]
 * @param {string[]} [options.tags=["css"]] Template tag names to extract. The
 *   `\/* css *\/` comment form is always recognised.
 * @param {boolean} [options.emitSource=true] Also re-emit the JS/TS source so
 *   regular JavaScript linting keeps running on the file.
 * @returns {object} An ESLint processor
 */
export function createTaggedTemplateProcessor({
  tags = ["css"],
  emitSource = true,
} = {}) {
  return createExtractionProcessor({
    name: "css-property-order/tagged-template",
    extract: (text) => extractCssTemplates(text, tags),
    emitSource,
  });
}
