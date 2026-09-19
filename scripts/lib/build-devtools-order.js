/**
 * Pure logic replicating how Chrome DevTools' Computed panel (grouped view)
 * assigns CSS properties to categories and orders them.
 *
 * Upstream references (devtools-frontend):
 *
 * - `front_end/panels/elements/PropertyNameCategories.ts`
 *   categorizePropertyName(), CategorizedProperties, DefaultCategoryOrder
 * - `front_end/core/sdk/CSSMetadata.ts` CSSMetadata constructor (eligibility +
 *   shorthand map), canonicalPropertyName()
 * - `front_end/panels/elements/ComputedStyleWidget.ts` rebuildGroupedList() —
 *   iterates the browser's computed style (Blink enumerates it alphabetically,
 *   prefixed properties last), pushes each property into every matching
 *   category, renders categories in DefaultCategoryOrder.
 */

export const CSS_VARIABLES_CATEGORY = "CSS Variables";
export const OTHER_CATEGORY = "Other";

/**
 * Blink's computed-style enumeration order: unprefixed properties first in
 * code-unit alphabetical order, then prefixed ("-webkit-…") properties, also
 * alphabetical. This is the order properties appear in within a DevTools
 * category group.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function enumerationCompare(a, b) {
  const aPrefixed = a.startsWith("-");
  const bPrefixed = b.startsWith("-");
  if (aPrefixed !== bPrefixed) return aPrefixed ? 1 : -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Replicates the eligibility filter in CSSMetadata's constructor. (The
 * `CSS.supports(name, 'initial')` runtime check cannot be replicated offline;
 * filtering non-stable runtime flags and internal properties is the static
 * equivalent.)
 *
 * @param {object} property
 * @returns {boolean}
 */
function isEligible(property) {
  // DevTools only skips when BOTH keys are present: entries with bare
  // `is_descriptor: true` (e.g. font-family) are real properties too.
  if (
    "is_descriptor" in property &&
    "is_property" in property &&
    property.is_descriptor &&
    !property.is_property
  ) {
    return false;
  }
  if (property.runtime_flag_status && property.runtime_flag_status !== "stable")
    return false;
  if (property.name.startsWith("-internal-")) return false;
  return true;
}

/**
 * Builds the metadata CSSMetadata derives from SupportedCSSProperties.js
 * (itself generated from Blink's css_properties.json5).
 *
 * @param {{ name: string; longhands?: string[] }[]} generatedProperties
 * @param {Map<string, string>} generatedAliasesFor Alias → canonical name
 * @returns {object}
 */
export function createMetadata(generatedProperties, generatedAliasesFor) {
  const propertyNames = [];
  const shorthandsFor = new Map(); // longhand → [shorthand, …] in file order

  for (const property of generatedProperties) {
    if (!isEligible(property)) continue;
    propertyNames.push(property.name);
    if (!property.longhands) continue;
    for (const longhand of property.longhands) {
      let shorthands = shorthandsFor.get(longhand);
      if (!shorthands) {
        shorthands = [];
        shorthandsFor.set(longhand, shorthands);
      }
      shorthands.push(property.name);
    }
  }

  const eligible = new Set(propertyNames);
  const aliasesFor = new Map(
    [...generatedAliasesFor].filter(([, canonical]) => eligible.has(canonical)),
  );

  return { propertyNames, shorthandsFor, aliasesFor };
}

/**
 * Replicates categorizePropertyName() from PropertyNameCategories.ts. Dead
 * entries upstream (the 'Outline-width' capitalisation typo, the stray '≈',
 * unprefixed 'font-smoothing'/'tap-highlight-color', the aliased 'word-wrap')
 * are kept verbatim and simply never match — exactly as in DevTools, where
 * lookups go through lowercased canonical names.
 *
 * @param {Map<string, string[]>} categorizedProperties Category → names
 * @param {object} metadata Result of createMetadata()
 * @returns {(name: string) => string[]}
 */
export function createCategorizer(categorizedProperties, metadata) {
  const categoriesByPropertyName = new Map();
  for (const [category, names] of categorizedProperties) {
    for (const name of names) {
      let categories = categoriesByPropertyName.get(name);
      if (!categories) {
        categories = [];
        categoriesByPropertyName.set(name, categories);
      }
      categories.push(category);
    }
  }

  return function categorize(propertyName) {
    // CSSMetadata.canonicalPropertyName(): custom properties are returned
    // as-is; others are lowercased and alias-resolved.
    let canonicalName = propertyName;
    if (!propertyName.startsWith("--")) {
      canonicalName = propertyName.toLowerCase();
      canonicalName = metadata.aliasesFor.get(canonicalName) ?? canonicalName;
    }

    const direct = categoriesByPropertyName.get(canonicalName);
    if (direct) return [...direct];
    if (canonicalName.startsWith("--")) return [CSS_VARIABLES_CATEGORY];

    const shorthands = metadata.shorthandsFor.get(canonicalName);
    if (shorthands) {
      for (const shorthand of shorthands) {
        const fromShorthand = categoriesByPropertyName.get(shorthand);
        if (fromShorthand) return [...fromShorthand];
      }
    }

    return [OTHER_CATEGORY];
  };
}

/**
 * Builds the final ordered groups for every property Blink supports, plus
 * aliases whose canonical property is categorized (so '-webkit-transition' gets
 * the same placement as 'transition').
 *
 * DevTools shows a multi-category property (e.g. 'flex' → Layout + Flex) in
 * every matching group; an ordering needs each property exactly once, so it
 * goes to the earliest of its categories in categoryOrder. 'CSS Variables' and
 * 'Other' are excluded: custom properties and unknown properties are handled at
 * lint time, which keeps the list stable as new uncategorized properties ship
 * in Blink.
 *
 * @param {object} options
 * @param {string[]} options.categoryOrder
 * @param {Map<string, string[]>} options.categorizedProperties
 * @param {object} options.metadata
 * @returns {{ name: string; properties: string[] }[]} Non-empty groups in
 *   categoryOrder order, each sorted in Blink enumeration order.
 */
export function buildGroups({
  categoryOrder,
  categorizedProperties,
  metadata,
}) {
  const categorize = createCategorizer(categorizedProperties, metadata);

  const universe = [...metadata.propertyNames, ...metadata.aliasesFor.keys()];

  const byCategory = new Map(categoryOrder.map((name) => [name, []]));
  for (const propertyName of universe) {
    const categories = categorize(propertyName);
    const first = categoryOrder.find((category) =>
      categories.includes(category),
    );
    if (!first || first === CSS_VARIABLES_CATEGORY || first === OTHER_CATEGORY)
      continue;
    byCategory.get(first).push(propertyName);
  }

  return categoryOrder
    .map((name) => ({
      name,
      properties: byCategory.get(name).sort(enumerationCompare),
    }))
    .filter((group) => group.properties.length > 0);
}
