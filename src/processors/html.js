/**
 * Processor extracting `<style>` tag contents from HTML files as virtual
 * `*.css` files.
 *
 * Extraction is regex-based with pragmatic limits: `<style>` tags inside HTML
 * comments or `<script>` bodies are ignored; tags with a non-CSS `type`
 * attribute are skipped. A full HTML parse is deliberately avoided.
 */

import { createExtractionProcessor } from "./extract-css.js";

const COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g;
const SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi;
const STYLE_PATTERN = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
const TYPE_PATTERN = /\btype\s*=\s*["']?\s*([^"'\s>]+)/i;

/**
 * @param {string} text HTML source
 * @returns {import("./extract-css.js").ExtractedBlock[]}
 */
export function extractStyleTags(text) {
  const excludedRanges = [];
  for (const pattern of [COMMENT_PATTERN, SCRIPT_PATTERN]) {
    for (const match of text.matchAll(pattern)) {
      excludedRanges.push([match.index, match.index + match[0].length]);
    }
  }

  const blocks = [];
  for (const match of text.matchAll(STYLE_PATTERN)) {
    if (
      excludedRanges.some(
        ([start, end]) => match.index >= start && match.index < end,
      )
    ) {
      continue;
    }
    const type = TYPE_PATTERN.exec(match[1])?.[1];
    if (type && type.toLowerCase() !== "text/css") continue;
    blocks.push({
      // "<style" + attributes + ">"
      offset: match.index + 6 + match[1].length + 1,
      text: match[2],
    });
  }
  return blocks;
}

/**
 * Creates the HTML processor.
 *
 * @param {object} [options]
 * @param {boolean} [options.emitSource=false] Also re-emit the HTML source so
 *   whatever handles the host file (an HTML language config, or a patching
 *   plugin such as eslint-plugin-html) keeps linting it. Leave off unless such
 *   a config exists: the source would otherwise be parsed as JavaScript.
 * @returns {object} An ESLint processor
 */
export function createHtmlProcessor({ emitSource = false } = {}) {
  return createExtractionProcessor({
    name: "css-property-order/html",
    extract: extractStyleTags,
    emitSource,
  });
}
