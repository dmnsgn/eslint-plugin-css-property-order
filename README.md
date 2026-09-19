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

## Modules

<dl>
<dt><a href="#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_">eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- `recess` (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</a></dt>

<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#remapFix">remapFix(fix, offset)</a> ⇒ <code>object</code></dt>
<dd></dd>
<dt><a href="#remapMessage">remapMessage(message, offset, lineOffset, columnOffset)</a> ⇒ <code>object</code></dt>
<dd><p>Maps a lint message from block coordinates to host-file coordinates.</p>
</dd>
<dt><a href="#createExtractionProcessor">createExtractionProcessor(options)</a> ⇒ <code>object</code></dt>
<dd><p>Creates an ESLint processor extracting CSS blocks from a host file.</p>
</dd>
<dt><a href="#preprocess">preprocess(text, filename)</a> ⇒ <code><a href="#VirtualFile">Array.&lt;VirtualFile&gt;</a></code></dt>
<dd></dd>
<dt><a href="#postprocess">postprocess(messageLists, filename)</a> ⇒ <code>Array.&lt;object&gt;</code></dt>
<dd></dd>
<dt><a href="#extractStyleTags">extractStyleTags(text)</a> ⇒ <code><a href="#ExtractedBlock">Array.&lt;ExtractedBlock&gt;</a></code></dt>
<dd></dd>
<dt><a href="#createHtmlProcessor">createHtmlProcessor([options])</a> ⇒ <code>object</code></dt>
<dd><p>Creates the HTML processor.</p>
</dd>
<dt><a href="#skipString">skipString(text, start)</a> ⇒ <code>number</code></dt>
<dd></dd>
<dt><a href="#skipTemplate">skipTemplate(text, start)</a> ⇒ <code><a href="#TemplateSpan">TemplateSpan</a></code></dt>
<dd></dd>
<dt><a href="#skipSubstitution">skipSubstitution(text, start)</a> ⇒ <code>number</code></dt>
<dd></dd>
<dt><a href="#extractCssTemplates">extractCssTemplates(text, tags)</a> ⇒ <code><a href="#ExtractedBlock">Array.&lt;ExtractedBlock&gt;</a></code></dt>
<dd></dd>
<dt><a href="#createTaggedTemplateProcessor">createTaggedTemplateProcessor([options])</a> ⇒ <code>object</code></dt>
<dd><p>Creates the tagged-template processor.</p>
</dd>
<dt><a href="#alphabeticalKey">alphabeticalKey(name)</a> ⇒ <code>[string, number, string]</code></dt>
<dd><p>Alphabetical sort key: compares on the unprefixed name, with prefixed
variants right before their unprefixed property (&quot;-webkit-transform&quot; before
&quot;transform&quot;), matching the fallback order the cascade requires.</p>
</dd>
<dt><a href="#createOrderIndex">createOrderIndex(order)</a> ⇒ <code>Map.&lt;string, number&gt;</code></dt>
<dd><p>Flattens an order option into a property → index map.</p>
</dd>
<dt><a href="#isCustomProperty">isCustomProperty(decl)</a> ⇒ <code>boolean</code></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ExtractedBlock">ExtractedBlock</a> : <code>object</code></dt>
<dd><p>A CSS segment found in a host file.</p>
</dd>
<dt><a href="#VirtualFile">VirtualFile</a> : <code>object</code></dt>
<dd><p>A virtual file emitted for a host file, as ESLint&#39;s processor API expects.</p>
</dd>
<dt><a href="#TemplateSpan">TemplateSpan</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#NumberOrString">NumberOrString</a> : <code>number</code> | <code>string</code></dt>
<dd></dd>
<dt><a href="#SortKey">SortKey</a> : <code><a href="#NumberOrString">Array.&lt;NumberOrString&gt;</a></code></dt>
<dd><p>A declaration&#39;s ordering key: tier first, then tiebreakers, compared
element-wise against another key of the same shape.</p>
</dd>
</dl>

<a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_"></a>

## eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- `recess` (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.

* [eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- `recess` (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  - [~PropertyGroup](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyGroup) : <code>object</code>
  - [~PropertyOrderEntry](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrderEntry) : <code>string</code> \| <code>module:eslint~PropertyGroup</code>
  - [~CustomPropertyOrder](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..CustomPropertyOrder) : <code>Array.&lt;module:eslint~PropertyOrderEntry&gt;</code>
  - [~PropertyOrder](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrder) : <code>&quot;devtools&quot;</code> \| <code>&quot;recess&quot;</code> \| <code>&quot;alphabetical&quot;</code> \| <code>module:eslint~CustomPropertyOrder</code>
  - [~PropertyOrderRuleOptions](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrderRuleOptions) : <code>object</code>

<a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyGroup"></a>

### eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.~PropertyGroup : <code>object</code>
  A named group of properties within a custom order. Group boundaries have no
  effect on ordering; they only help organising the list.

**Kind**: inner typedef of [<code>eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</code>](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  **Properties**

| Name       | Type                              | Description                                  |
| ---------- | --------------------------------- | -------------------------------------------- |
| [name]     | <code>string</code>               | Group name, for documentation purposes only. |
| properties | <code>Array.&lt;string&gt;</code> | Property names in the group.                 |

<a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrderEntry"></a>

### eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.~~PropertyOrderEntry : <code>string</code> \| <code>module:eslint~~PropertyGroup</code>
  One entry of a custom order: a property name, or a group of property names.

**Kind**: inner typedef of [<code>eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</code>](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  <a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..CustomPropertyOrder"></a>

### eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.~~CustomPropertyOrder : <code>Array.&lt;module:eslint~~PropertyOrderEntry&gt;</code>
  A custom order: an array of property names and/or groups of property names.

**Kind**: inner typedef of [<code>eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</code>](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  <a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrder"></a>

### eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.~~PropertyOrder : <code>&quot;devtools&quot;</code> \| <code>&quot;recess&quot;</code> \| <code>&quot;alphabetical&quot;</code> \| <code>module:eslint~~CustomPropertyOrder</code>
  A built-in order name, or a custom order (see [module:eslint~CustomPropertyOrder](module:eslint~CustomPropertyOrder)).
  `"alphabetical"` needs no property list: it compares names directly
  (vendor-prefixed properties sort right before their unprefixed counterpart,
  as the cascade requires), so it covers every CSS property, present and
  future, and `unspecified` does not apply.

**Kind**: inner typedef of [<code>eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</code>](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  <a name="eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_..PropertyOrderRuleOptions"></a>

### eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.~PropertyOrderRuleOptions : <code>object</code>
  Options for the `css-property-order/property-order` rule.

**Kind**: inner typedef of [<code>eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https://github.com/eslint/css) language plugin.

Ships two built-in orders:

- &#x60;recess&#x60; (default): the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- &#x60;devtools&#x60;: the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.</code>](#eslint-plugin-css-property-order

ESLint plugin enforcing CSS declaration order, for use with the official
[@eslint/css](https_//github.com/eslint/css) language plugin.

Ships two built-in orders_

- `recess` (default)_ the Recess/Bootstrap logical order — positioning,
  box model, typography, visual, animation, misc.
- `devtools`_ the order Chrome DevTools uses in the Computed panels
  grouped view, generated from the DevTools sources.module_)
  **Properties**

| Name               | Type                                                                                                                                              | Default                         | Description                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [order]            | <code>module:eslint~PropertyOrder</code>                                                                                                          | <code>&quot;recess&quot;</code> | The property order to enforce.                                                                                                                                                                        |
| [unspecified]      | <code>&quot;ignore&quot;</code> \| <code>&quot;top&quot;</code> \| <code>&quot;bottom&quot;</code> \| <code>&quot;bottomAlphabetical&quot;</code> | <code>&quot;ignore&quot;</code> | Where properties absent from the order (e.g. newer than the list) belong: left where they are, before all listed properties, after them (keeping their relative order), or after them alphabetically. |
| [customProperties] | <code>&quot;top&quot;</code> \| <code>&quot;ignore&quot;</code>                                                                                   | <code>&quot;top&quot;</code>    | Whether custom properties (`--*`) must come first in a block (keeping their relative order), or are left where they are.                                                                              |

<a name="remapFix"></a>

## remapFix(fix, offset) ⇒ <code>object</code>

**Kind**: global function
**Returns**: <code>object</code> - The remapped fix

| Param  | Type                | Description                     |
| ------ | ------------------- | ------------------------------- |
| fix    | <code>object</code> | An ESLint fix ({ range, text }) |
| offset | <code>number</code> | Host-file offset of the block   |

<a name="remapMessage"></a>

## remapMessage(message, offset, lineOffset, columnOffset) ⇒ <code>object</code>

Maps a lint message from block coordinates to host-file coordinates.

**Kind**: global function
**Returns**: <code>object</code> - The remapped message

| Param        | Type                | Description                                |
| ------------ | ------------------- | ------------------------------------------ |
| message      | <code>object</code> | An ESLint message                          |
| offset       | <code>number</code> | Host-file offset of the block              |
| lineOffset   | <code>number</code> | Lines before the block in the host file    |
| columnOffset | <code>number</code> | Column of the block start on its host line |

<a name="createExtractionProcessor"></a>

## createExtractionProcessor(options) ⇒ <code>object</code>

Creates an ESLint processor extracting CSS blocks from a host file.

**Kind**: global function
**Returns**: <code>object</code> - An ESLint processor

| Param              | Type                  | Description                                                                                                                                                                                                                                    |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options            | <code>object</code>   |                                                                                                                                                                                                                                                |
| options.name       | <code>string</code>   | Processor name (for meta)                                                                                                                                                                                                                      |
| options.extract    | <code>function</code> | Finds CSS blocks                                                                                                                                                                                                                               |
| options.emitSource | <code>boolean</code>  | Whether to re-emit the host file as a bare-string block, linted under the host filename so its own language (or a patching plugin such as eslint-plugin-html) keeps linting it. Enable only when some config handles the host file as non-CSS. |

<a name="preprocess"></a>

## preprocess(text, filename) ⇒ [<code>Array.&lt;VirtualFile&gt;</code>](#VirtualFile)

**Kind**: global function
**Returns**: [<code>Array.&lt;VirtualFile&gt;</code>](#VirtualFile) - Virtual files

| Param    | Type                | Description       |
| -------- | ------------------- | ----------------- |
| text     | <code>string</code> | Host file content |
| filename | <code>string</code> | Host file path    |

<a name="postprocess"></a>

## postprocess(messageLists, filename) ⇒ <code>Array.&lt;object&gt;</code>

**Kind**: global function
**Returns**: <code>Array.&lt;object&gt;</code> - Messages mapped to host-file coordinates

| Param        | Type                                            | Description               |
| ------------ | ----------------------------------------------- | ------------------------- |
| messageLists | <code>Array.&lt;Array.&lt;object&gt;&gt;</code> | One list per virtual file |
| filename     | <code>string</code>                             | Host file path            |

<a name="extractStyleTags"></a>

## extractStyleTags(text) ⇒ [<code>Array.&lt;ExtractedBlock&gt;</code>](#ExtractedBlock)

**Kind**: global function

| Param | Type                | Description |
| ----- | ------------------- | ----------- |
| text  | <code>string</code> | HTML source |

<a name="createHtmlProcessor"></a>

## createHtmlProcessor([options]) ⇒ <code>object</code>

Creates the HTML processor.

**Kind**: global function
**Returns**: <code>object</code> - An ESLint processor

| Param                | Type                 | Default            | Description                                                                                                                                                                                                                                            |
| -------------------- | -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [options]            | <code>object</code>  |                    |                                                                                                                                                                                                                                                        |
| [options.emitSource] | <code>boolean</code> | <code>false</code> | Also re-emit the HTML source so whatever handles the host file (an HTML language config, or a patching plugin such as eslint-plugin-html) keeps linting it. Leave off unless such a config exists: the source would otherwise be parsed as JavaScript. |

<a name="skipString"></a>

## skipString(text, start) ⇒ <code>number</code>

**Kind**: global function
**Returns**: <code>number</code> - Index after the closing quote (or line end if unterminated)

| Param | Type                | Description                |
| ----- | ------------------- | -------------------------- |
| text  | <code>string</code> | Source                     |
| start | <code>number</code> | Index of the opening quote |

<a name="skipTemplate"></a>

## skipTemplate(text, start) ⇒ [<code>TemplateSpan</code>](#TemplateSpan)

**Kind**: global function

| Param | Type                | Description                   |
| ----- | ------------------- | ----------------------------- |
| text  | <code>string</code> | Source                        |
| start | <code>number</code> | Index of the opening backtick |

<a name="skipSubstitution"></a>

## skipSubstitution(text, start) ⇒ <code>number</code>

**Kind**: global function
**Returns**: <code>number</code> - Index after the matching "}"

| Param | Type                | Description      |
| ----- | ------------------- | ---------------- |
| text  | <code>string</code> | Source           |
| start | <code>number</code> | Index after "${" |

<a name="extractCssTemplates"></a>

## extractCssTemplates(text, tags) ⇒ [<code>Array.&lt;ExtractedBlock&gt;</code>](#ExtractedBlock)

**Kind**: global function

| Param | Type                              | Description                      |
| ----- | --------------------------------- | -------------------------------- |
| text  | <code>string</code>               | JavaScript/TypeScript source     |
| tags  | <code>Array.&lt;string&gt;</code> | Template tag names that mark CSS |

<a name="createTaggedTemplateProcessor"></a>

## createTaggedTemplateProcessor([options]) ⇒ <code>object</code>

Creates the tagged-template processor.

**Kind**: global function
**Returns**: <code>object</code> - An ESLint processor

| Param                | Type                              | Default                        | Description                                                                            |
| -------------------- | --------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| [options]            | <code>object</code>               |                                |                                                                                        |
| [options.tags]       | <code>Array.&lt;string&gt;</code> | <code>[&quot;css&quot;]</code> | Template tag names to extract. The `\/* css *\/` comment form is always recognised.    |
| [options.emitSource] | <code>boolean</code>              | <code>true</code>              | Also re-emit the JS/TS source so regular JavaScript linting keeps running on the file. |

<a name="alphabeticalKey"></a>

## alphabeticalKey(name) ⇒ <code>[string, number, string]</code>

Alphabetical sort key: compares on the unprefixed name, with prefixed
variants right before their unprefixed property ("-webkit-transform" before
"transform"), matching the fallback order the cascade requires.

**Kind**: global function

| Param | Type                | Description              |
| ----- | ------------------- | ------------------------ |
| name  | <code>string</code> | Lowercased property name |

<a name="createOrderIndex"></a>

## createOrderIndex(order) ⇒ <code>Map.&lt;string, number&gt;</code>

Flattens an order option into a property → index map.

**Kind**: global function

| Param | Type                       |
| ----- | -------------------------- |
| order | <code>PropertyOrder</code> |

<a name="isCustomProperty"></a>

## isCustomProperty(decl) ⇒ <code>boolean</code>

**Kind**: global function

| Param | Type                | Description        |
| ----- | ------------------- | ------------------ |
| decl  | <code>object</code> | A Declaration node |

<a name="ExtractedBlock"></a>

## ExtractedBlock : <code>object</code>

A CSS segment found in a host file.

**Kind**: global typedef
**Properties**

| Name   | Type                | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| offset | <code>number</code> | Start offset of the CSS text in the host file |
| text   | <code>string</code> | The CSS text, verbatim                        |

<a name="VirtualFile"></a>

## VirtualFile : <code>object</code>

A virtual file emitted for a host file, as ESLint's processor API expects.

**Kind**: global typedef
**Properties**

| Name     | Type                | Description          |
| -------- | ------------------- | -------------------- |
| text     | <code>string</code> | The file content     |
| filename | <code>string</code> | The virtual filename |

<a name="TemplateSpan"></a>

## TemplateSpan : <code>object</code>

**Kind**: global typedef
**Properties**

| Name  | Type                 | Description                                                          |
| ----- | -------------------- | -------------------------------------------------------------------- |
| end   | <code>number</code>  | Index after the closing backtick                                     |
| clean | <code>boolean</code> | Whether the template body is verbatim CSS (no substitutions/escapes) |

<a name="NumberOrString"></a>

## NumberOrString : <code>number</code> \| <code>string</code>

**Kind**: global typedef
<a name="SortKey"></a>

## SortKey : [<code>Array.&lt;NumberOrString&gt;</code>](#NumberOrString)

A declaration's ordering key: tier first, then tiebreakers, compared
element-wise against another key of the same shape.

**Kind**: global typedef

<!-- api-end -->

## License

MIT. See [license file](https://github.com/dmnsgn/eslint-plugin-css-property-order/blob/main/LICENSE.md).
