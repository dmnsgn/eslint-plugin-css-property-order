# eslint-plugin-css-property-order

[![npm version](https://img.shields.io/npm/v/eslint-plugin-css-property-order)](https://www.npmjs.com/package/eslint-plugin-css-property-order)
[![stability-stable](https://img.shields.io/badge/stability-stable-green.svg)](https://www.npmjs.com/package/eslint-plugin-css-property-order)
[![npm minzipped size](https://img.shields.io/bundlephobia/minzip/eslint-plugin-css-property-order)](https://bundlephobia.com/package/eslint-plugin-css-property-order)
[![dependencies](https://img.shields.io/librariesio/release/npm/eslint-plugin-css-property-order)](https://github.com/dmnsgn/eslint-plugin-css-property-order/blob/main/package.json)
[![types](https://img.shields.io/npm/types/eslint-plugin-css-property-order)](https://github.com/microsoft/TypeScript)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://conventionalcommits.org)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![license](https://img.shields.io/github/license/dmnsgn/eslint-plugin-css-property-order)](https://github.com/dmnsgn/eslint-plugin-css-property-order/blob/main/LICENSE.md)

ESLint plugin enforcing CSS declaration order for [@eslint/css](https://github.com/eslint/css): Recess/Bootstrap logical order, Chrome DevTools panel order, alphabetical, or your own. Autofixable. Includes processors to lint and fix CSS embedded in HTML `<style>` tags and in `/* css */`-annotated or `css`-tagged template literals.

[![paypal](https://img.shields.io/badge/donate-paypal-informational?logo=paypal)](https://paypal.me/dmnsgn)
[![coinbase](https://img.shields.io/badge/donate-coinbase-informational?logo=coinbase)](https://commerce.coinbase.com/checkout/56cbdf28-e323-48d8-9c98-7019e72c97f3)
[![twitter](https://img.shields.io/twitter/follow/dmnsgn?style=social)](https://twitter.com/dmnsgn)
[![bluesky](https://img.shields.io/badge/-blue?logo=bluesky&label=Follow%20%40dmnsgn.me&style=social)](https://bsky.app/profile/dmnsgn.me)

## Installation

```bash
npm install -D eslint-plugin-css-property-order @eslint/css
```

## Usage

```js
// eslint.config.js
import { defineConfig } from "eslint/config";
import css from "@eslint/css";
import cssPropertyOrder from "eslint-plugin-css-property-order";

export default defineConfig([
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: [cssPropertyOrder.configs.recommended],
  },
]);
```

> [!NOTE]
> Use `extends` (or a separate config object) rather than spreading `configs.recommended` into an object that also declares `plugins`: the spread would replace the `plugins` key, unregistering the `css` plugin that `language: "css/css"` refers to.

Run `eslint --fix` to reorder declarations automatically.

### Built-in orders

- **`"recess"`** (default, used by `configs.recommended`): the Recess/Bootstrap "logical" order — positioning, box model, typography, visual, animation, misc. Snapshot of [stylelint-config-recess-order](https://github.com/stormwarning/stylelint-config-recess-order).
- **`"devtools"`** (used by `configs.devtools`): the order Chrome DevTools shows in the Computed panel's grouped view — Layout, Text, Appearance, Animation, Grid, Table, Generated Content — generated from the [DevTools sources](https://chromium.googlesource.com/devtools/devtools-frontend/) themselves (`PropertyNameCategories.ts` + Blink's property metadata).
- **`"alphabetical"`** (used by `configs.alphabetical`): plain alphabetical order. No property list is involved — names are compared directly, so every CSS property (present and future, standard or not) is covered and the `unspecified` option does not apply. Vendor-prefixed properties sort right before their unprefixed counterpart (`-webkit-transform` before `transform`), the order the cascade requires for fallbacks; custom properties are alphabetized at the top.

### Options

```js
{
  files: ["**/*.css"],
  plugins: { css, "css-property-order": cssPropertyOrder },
  language: "css/css",
  rules: {
    "css-property-order/property-order": [
      "error",
      {
        // "recess", "devtools", or an array of property names and/or
        // { properties: [...] } groups:
        order: "recess",
        // Where properties absent from the order belong — "ignore" (leave
        // them where they are), "top", "bottom", or "bottomAlphabetical".
        // New CSS properties degrade gracefully: they are simply unspecified
        // until the order lists them.
        unspecified: "ignore",
        // Custom properties (--*) must come first ("top", default) or are
        // left alone ("ignore"). Their relative order is preserved.
        customProperties: "top",
      },
    ],
  },
}
```

### Embedded CSS: HTML `<style>` tags and template literals

`@eslint/css` only lints `.css` files ([HTML support is "not planned"](https://github.com/eslint/css/issues/283)). This plugin bridges the gap with two ESLint processors that extract embedded CSS into virtual `*.css` files — so your whole `files: ["**/*.css"]` config applies to them, **every** `@eslint/css` rule included, with autofix mapped back into the host file:

```js
// eslint.config.js
export default defineConfig([
  // Your CSS config lints the extracted blocks too:
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: [cssPropertyOrder.configs.recommended],
  },
  // <style> tags in HTML files:
  {
    files: ["**/*.html"],
    plugins: { "css-property-order": cssPropertyOrder },
    processor: "css-property-order/html",
  },
  // /* css */ `…` and css`…` template literals in JS/TS files:
  {
    files: ["**/*.js"],
    plugins: { "css-property-order": cssPropertyOrder },
    processor: "css-property-order/tagged-template",
  },
]);
```

Both processors have factories for options (import them from the package):

- `createTaggedTemplateProcessor({ tags: ["css"], emitSource: true })` — `tags` sets which template tags mark CSS (the `/* css */` comment form is always recognised); `emitSource` (default on) re-emits the JS/TS source so regular JavaScript linting keeps running on the file.
- `createHtmlProcessor({ emitSource: false })` — enable `emitSource` only if something else handles your HTML files — an HTML language config (e.g. [html-eslint](https://html-eslint.org/)) or [eslint-plugin-html](https://github.com/BenoitZugmeyer/eslint-plugin-html) for `<script>` linting — so it keeps linting them; without one the re-emitted source would be parsed as JavaScript.

Extraction limits (by design): template literals containing `${}` substitutions or backslash escapes are skipped (their runtime value differs from the source, so fixes could not be mapped safely); HTML extraction is regex-based and ignores `<style>` inside comments and scripts; type-aware TypeScript linting does not work on processor virtual files (an ESLint-wide limitation).

### Behavior notes

- Declarations are only reordered within a contiguous run: nested rules and at-rules act as boundaries, so a fix never moves a declaration across a nested rule (which could change the cascade).
- Comments are left in place; declarations move around them.
- Matching is case-insensitive; duplicate properties keep their relative order.

### Updating the built-in orders

`npm run generate:refresh` re-downloads the DevTools sources (vendored in `vendor/`, provenance recorded in the generated files) and re-snapshots the Recess order, so newly shipped CSS properties flow into `src/orders/`.

`npm run report:w3c` compares the list-based presets against the official [W3C CSS property index](https://www.w3.org/Style/CSS/all-properties.en.json) and reports which specified properties they do not list (those fall back to the `unspecified` option at lint time). The index spans every spec at every maturity level, so the report is informational — presets are never amended from it.

## API

<!-- api-start -->

Auto-generated API content.

<!-- api-end -->

## License

MIT. See [license file](https://github.com/dmnsgn/eslint-plugin-css-property-order/blob/main/LICENSE.md).
