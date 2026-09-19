/**
 * Rule: enforce a CSS declaration order within blocks.
 *
 * Works on the CSSTree AST provided by the "@eslint/css" language plugin.
 * Declarations are only reordered within a contiguous run: nested rules and
 * at-rules act as boundaries, so fixing never moves a declaration across a
 * nested rule (which could change the cascade). Comments do not break runs but
 * are not moved by the fixer.
 */

import devtoolsOrder from "../orders/devtools.js";
import recessOrder from "../orders/recess.js";

const PRESETS = { devtools: devtoolsOrder, recess: recessOrder };
const ALPHABETICAL = "alphabetical";

const CUSTOM_PROPERTIES_TIER = 0;
const UNSPECIFIED_TOP_TIER = 1;
const LISTED_TIER = 2;
const UNSPECIFIED_BOTTOM_TIER = 3;

const VENDOR_PREFIX_PATTERN = /^-[a-z]+-/;

/** @typedef {number | string} NumberOrString */

/**
 * A declaration's ordering key: tier first, then tiebreakers, compared
 * element-wise against another key of the same shape.
 *
 * @typedef {NumberOrString[]} SortKey
 */

/**
 * Alphabetical sort key: compares on the unprefixed name, with prefixed
 * variants right before their unprefixed property ("-webkit-transform" before
 * "transform"), matching the fallback order the cascade requires.
 *
 * @param {string} name Lowercased property name
 * @returns {[string, number, string]}
 */
function alphabeticalKey(name) {
  const base = name.replace(VENDOR_PREFIX_PATTERN, "");
  return [base, base === name ? 1 : 0, name];
}

/**
 * Flattens an order option into a property → index map.
 *
 * @param {import("../../index.js").PropertyOrder} order
 * @returns {Map<string, number>}
 */
export function createOrderIndex(order) {
  const preset = typeof order === "string" ? PRESETS[order] : null;
  const entries = preset ? preset.groups : order;

  const index = new Map();
  for (const entry of entries) {
    const properties = typeof entry === "string" ? [entry] : entry.properties;
    for (const property of properties) {
      const name = property.toLowerCase();
      // First occurrence wins, like stylelint-order.
      if (!index.has(name)) index.set(name, index.size);
    }
  }
  return index;
}

/**
 * @param {object} decl A Declaration node
 * @returns {boolean}
 */
function isCustomProperty(decl) {
  return decl.property.startsWith("--");
}

export default {
  meta: {
    type: "suggestion",
    fixable: "code",

    docs: {
      description: "Enforce a CSS declaration order within blocks",
      url: "https://github.com/dmnsgn/eslint-plugin-css-property-order",
    },

    schema: [
      {
        type: "object",
        properties: {
          order: {
            oneOf: [
              { enum: [...Object.keys(PRESETS), ALPHABETICAL] },
              {
                type: "array",
                items: {
                  oneOf: [
                    { type: "string" },
                    {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        properties: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["properties"],
                      additionalProperties: false,
                    },
                  ],
                },
              },
            ],
          },
          unspecified: {
            enum: ["ignore", "top", "bottom", "bottomAlphabetical"],
          },
          customProperties: {
            enum: ["top", "ignore"],
          },
        },
        additionalProperties: false,
      },
    ],

    defaultOptions: [
      { order: "recess", unspecified: "ignore", customProperties: "top" },
    ],

    messages: {
      expectedOrder:
        'Expected "{{property}}" to come before "{{beforeProperty}}".',
    },
  },

  create(context) {
    const [{ order, unspecified, customProperties }] = context.options;
    const { sourceCode } = context;
    const alphabetical = order === ALPHABETICAL;
    const orderIndex = alphabetical ? null : createOrderIndex(order);

    /**
     * Sort key for a declaration, or null when it does not participate in
     * ordering. Keys compare by tier first, then element-wise within the tier.
     * In alphabetical mode every property participates ("unspecified" does not
     * apply) and custom properties are alphabetized too.
     *
     * @param {object} decl A Declaration node
     * @returns {SortKey | null}
     */
    function sortKey(decl) {
      if (isCustomProperty(decl)) {
        if (customProperties !== "top") return null;
        return [CUSTOM_PROPERTIES_TIER, alphabetical ? decl.property : 0];
      }
      const name = decl.property.toLowerCase();
      if (alphabetical) return [LISTED_TIER, ...alphabeticalKey(name)];
      const index = orderIndex.get(name);
      if (index !== undefined) return [LISTED_TIER, index];
      switch (unspecified) {
        case "top":
          return [UNSPECIFIED_TOP_TIER, 0];
        case "bottom":
          return [UNSPECIFIED_BOTTOM_TIER, 0];
        case "bottomAlphabetical":
          return [UNSPECIFIED_BOTTOM_TIER, name];
        default:
          return null;
      }
    }

    /**
     * @param {SortKey} a
     * @param {SortKey} b
     * @returns {number}
     */
    function compareKeys(a, b) {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
      }
      return 0;
    }

    /**
     * Checks one contiguous run of declarations and reports inversions. The
     * whole-run reorder fix is attached to the first report only; ESLint
     * re-lints after applying fixes, so one pass resolves the run.
     *
     * @param {object[]} declarations
     */
    function checkRun(declarations) {
      const participating = declarations
        .map((decl) => ({ decl, key: sortKey(decl) }))
        .filter(({ key }) => key !== null);
      if (participating.length < 2) return;

      const sorted = [...participating].sort((a, b) =>
        compareKeys(a.key, b.key),
      );

      const fix = (fixer) =>
        participating
          .map(({ decl }, i) => {
            if (sorted[i].decl === decl) return null;
            return fixer.replaceTextRange(
              sourceCode.getRange(decl),
              sourceCode.getText(sorted[i].decl),
            );
          })
          .filter(Boolean);

      let reported = false;
      for (let i = 1; i < participating.length; i++) {
        const previous = participating[i - 1];
        const current = participating[i];
        if (compareKeys(previous.key, current.key) > 0) {
          context.report({
            loc: current.decl.loc,
            messageId: "expectedOrder",
            data: {
              property: current.decl.property,
              beforeProperty: previous.decl.property,
            },
            fix: reported ? undefined : fix,
          });
          reported = true;
        }
      }
    }

    return {
      Block(node) {
        let run = [];
        for (const child of node.children) {
          if (child.type === "Declaration") {
            run.push(child);
          } else if (child.type !== "Comment") {
            // Nested rules, at-rules, and raw (unparseable) segments end the
            // current run: declarations are never reordered across them.
            checkRun(run);
            run = [];
          }
        }
        checkRun(run);
      },
    };
  },
};
