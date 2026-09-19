/**
 * Shared core for processors that extract embedded CSS into virtual `*.css`
 * files. The virtual files match `files: ["**\/*.css"]` configs, so any
 * "@eslint/css" rule — not just this plugin's — runs on them. Messages and
 * autofix ranges are mapped back into the host file (extracted text is a
 * verbatim substring, so mapping is pure offsetting).
 */

/**
 * A CSS segment found in a host file.
 *
 * @typedef {object} ExtractedBlock
 * @property {number} offset Start offset of the CSS text in the host file
 * @property {string} text The CSS text, verbatim
 */

/**
 * @param {object} fix An ESLint fix ({ range, text })
 * @param {number} offset Host-file offset of the block
 * @returns {object} The remapped fix
 */
function remapFix(fix, offset) {
  return { ...fix, range: [fix.range[0] + offset, fix.range[1] + offset] };
}

/**
 * Maps a lint message from block coordinates to host-file coordinates.
 *
 * @param {object} message An ESLint message
 * @param {number} offset Host-file offset of the block
 * @param {number} lineOffset Lines before the block in the host file
 * @param {number} columnOffset Column of the block start on its host line
 * @returns {object} The remapped message
 */
function remapMessage(message, offset, lineOffset, columnOffset) {
  const out = { ...message };
  if (typeof out.line === "number") {
    if (out.line === 1) out.column += columnOffset;
    out.line += lineOffset;
  }
  if (typeof out.endLine === "number") {
    if (out.endLine === 1) out.endColumn += columnOffset;
    out.endLine += lineOffset;
  }
  if (out.fix) out.fix = remapFix(out.fix, offset);
  if (out.suggestions) {
    out.suggestions = out.suggestions.map((suggestion) =>
      suggestion.fix
        ? { ...suggestion, fix: remapFix(suggestion.fix, offset) }
        : suggestion,
    );
  }
  return out;
}

/**
 * A virtual file emitted for a host file, as ESLint's processor API expects.
 *
 * @typedef {object} VirtualFile
 * @property {string} text The file content
 * @property {string} filename The virtual filename
 */

/**
 * Creates an ESLint processor extracting CSS blocks from a host file.
 *
 * @param {object} options
 * @param {string} options.name Processor name (for meta)
 * @param {function(string): ExtractedBlock[]} options.extract Finds CSS blocks
 * @param {boolean} options.emitSource Whether to re-emit the host file as a
 *   bare-string block, linted under the host filename so its own language (or a
 *   patching plugin such as eslint-plugin-html) keeps linting it. Enable only
 *   when some config handles the host file as non-CSS.
 * @returns {object} An ESLint processor
 */
export function createExtractionProcessor({ name, extract, emitSource }) {
  const state = new Map();

  return {
    meta: { name },
    supportsAutofix: true,

    /**
     * @param {string} text Host file content
     * @param {string} filename Host file path
     * @returns {VirtualFile[]} Virtual files
     */
    preprocess(text, filename) {
      const blocks = extract(text);
      state.set(filename, { blocks, text });
      const virtualFiles = blocks.map((block, i) => ({
        text: block.text,
        filename: `${i}.css`,
      }));
      if (emitSource) {
        // A bare string (ESLint's legacy block form) is verified under the
        // host filename through Linter's public un-processed path, so both the
        // host language and patch-based plugins (e.g. eslint-plugin-html)
        // still see the file. An object block would be routed through a
        // private method those plugins cannot intercept.
        virtualFiles.unshift(text);
      }
      return virtualFiles;
    },

    /**
     * @param {object[][]} messageLists One list per virtual file
     * @param {string} filename Host file path
     * @returns {object[]} Messages mapped to host-file coordinates
     */
    postprocess(messageLists, filename) {
      const { blocks, text } = state.get(filename);
      state.delete(filename);

      const messages = [];
      let cssLists = messageLists;
      if (emitSource) {
        // The source block is the host file itself: identity mapping.
        messages.push(...messageLists[0]);
        cssLists = messageLists.slice(1);
      }
      cssLists.forEach((list, i) => {
        const { offset } = blocks[i];
        const before = text.slice(0, offset);
        const lastNewline = before.lastIndexOf("\n");
        const lineOffset = before.split("\n").length - 1;
        const columnOffset =
          lastNewline === -1 ? offset : offset - lastNewline - 1;
        for (const message of list) {
          messages.push(
            remapMessage(message, offset, lineOffset, columnOffset),
          );
        }
      });
      return messages.sort(
        (a, b) =>
          (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0),
      );
    },
  };
}
