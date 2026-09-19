/**
 * @module eslint-plugin-css-property-order
 *
 * ESLint plugin enforcing CSS declaration order, for use with the official
 * [@eslint/css](https://github.com/eslint/css) language plugin.
 *
 * Ships two built-in orders:
 * - `"recess"` (default): the Recess/Bootstrap "logical" order — positioning,
 *   box model, typography, visual, animation, misc.
 * - `"devtools"`: the order Chrome DevTools uses in the Computed panel's
 *   grouped view, generated from the DevTools sources.
 */

import propertyOrder from "./src/rules/property-order.js";
import devtoolsOrder from "./src/orders/devtools.js";
import recessOrder from "./src/orders/recess.js";
import { createHtmlProcessor } from "./src/processors/html.js";
import { createTaggedTemplateProcessor } from "./src/processors/tagged-template.js";

let defaultHtmlProcessor;
let defaultTaggedTemplateProcessor;

/**
 * A named group of properties within a custom order. Group boundaries have no
 * effect on ordering; they only help organising the list.
 *
 * @typedef {object} PropertyGroup
 * @property {string} [name] Group name, for documentation purposes only.
 * @property {string[]} properties Property names in the group.
 */

/**
 * One entry of a custom order: a property name, or a group of property names.
 *
 * @typedef {string | PropertyGroup} PropertyOrderEntry
 */

/**
 * A custom order: an array of property names and/or groups of property names.
 *
 * @typedef {PropertyOrderEntry[]} CustomPropertyOrder
 */

/**
 * A built-in order name, or a custom order (see {@link CustomPropertyOrder}).
 * `"alphabetical"` needs no property list: it compares names directly
 * (vendor-prefixed properties sort right before their unprefixed counterpart,
 * as the cascade requires), so it covers every CSS property, present and
 * future, and `unspecified` does not apply.
 *
 * @typedef {"devtools" | "recess" | "alphabetical" | CustomPropertyOrder} PropertyOrder
 */

/**
 * Options for the `css-property-order/property-order` rule.
 *
 * @typedef {object} PropertyOrderRuleOptions
 * @property {PropertyOrder} [order="recess"] The property order to enforce.
 * @property {"ignore" | "top" | "bottom" | "bottomAlphabetical"} [unspecified="ignore"]
 *   Where properties absent from the order (e.g. newer than the list) belong:
 *   left where they are, before all listed properties, after them (keeping
 *   their relative order), or after them alphabetically.
 * @property {"top" | "ignore"} [customProperties="top"] Whether custom
 *   properties (`--*`) must come first in a block (keeping their relative
 *   order), or are left where they are.
 */

const plugin = {
  meta: {
    name: "eslint-plugin-css-property-order",
  },
  rules: {
    "property-order": propertyOrder,
  },
  // Extract embedded CSS (HTML <style> tags, /* css */ or css-tagged template
  // literals) into virtual *.css files so that any "@eslint/css" config —
  // this plugin's rule included — lints and fixes it in place. Getters keep
  // instantiation lazy; use the create*Processor factories for options.
  processors: {
    /**
     * HTML `<style>` tag extraction.
     *
     * @returns {object} Processor
     */
    get html() {
      defaultHtmlProcessor ??= createHtmlProcessor();
      return defaultHtmlProcessor;
    },
    /**
     * JS/TS template-literal extraction (`\/* css *\/` or `css` tag).
     *
     * @returns {object} Processor
     */
    get "tagged-template"() {
      defaultTaggedTemplateProcessor ??= createTaggedTemplateProcessor();
      return defaultTaggedTemplateProcessor;
    },
  },
  // Getters so each config can self-reference the plugin without top-level
  // side effects.
  /** @type {Record<string, import("eslint").Linter.Config>} */
  configs: {
    /**
     * Recess/Bootstrap order, unknown properties ignored.
     *
     * @returns {import("eslint").Linter.Config} Config object
     */
    get recommended() {
      return {
        name: "css-property-order/recommended",
        plugins: { "css-property-order": plugin },
        rules: {
          "css-property-order/property-order": ["error", { order: "recess" }],
        },
      };
    },
    /**
     * Plain alphabetical order, prefixed properties before their unprefixed
     * counterpart. Covers every property without needing a list.
     *
     * @returns {import("eslint").Linter.Config} Config object
     */
    get alphabetical() {
      return {
        name: "css-property-order/alphabetical",
        plugins: { "css-property-order": plugin },
        rules: {
          "css-property-order/property-order": [
            "error",
            { order: "alphabetical" },
          ],
        },
      };
    },
    /**
     * Chrome DevTools order, unknown properties alphabetical at the bottom.
     *
     * @returns {import("eslint").Linter.Config} Config object
     */
    get devtools() {
      return {
        name: "css-property-order/devtools",
        plugins: { "css-property-order": plugin },
        rules: {
          "css-property-order/property-order": [
            "error",
            { order: "devtools", unspecified: "bottomAlphabetical" },
          ],
        },
      };
    },
  },
};

export default plugin;
export {
  devtoolsOrder,
  recessOrder,
  createHtmlProcessor,
  createTaggedTemplateProcessor,
};
