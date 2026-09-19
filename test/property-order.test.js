import test from "node:test";

import css from "@eslint/css";
import { RuleTester } from "eslint";

import rule from "../src/rules/property-order.js";

const ruleTester = new RuleTester({
  plugins: { css },
  language: "css/css",
});

test("property-order rule", () => {
  ruleTester.run("property-order", rule, {
    valid: [
      // Recess order (default).
      "a { position: absolute; display: block; width: 0; color: red; }",
      // Case-insensitive matching.
      "a { POSITION: absolute; Width: 0; }",
      // Custom properties first by default, relative order preserved.
      "a { --zeta: 1; --alpha: 2; display: block; }",
      // Unspecified properties are ignored by default.
      "a { display: block; unknown-future-property: 1; width: 0; }",
      {
        code: "a { width: 0; display: block; }",
        options: [{ order: ["width", "display"] }],
      },
      // Groups in custom orders are flattened.
      {
        code: "a { width: 0; display: block; }",
        options: [
          {
            order: [
              { name: "size", properties: ["width"] },
              { properties: ["display"] },
            ],
          },
        ],
      },
      // DevTools preset: Layout before Text, alphabetical within groups.
      {
        code: "a { display: block; width: 0; font-size: 1rem; color: red; }",
        options: [{ order: "devtools" }],
      },
      // Nested rules are boundaries: runs are checked independently.
      "a { display: block; &:hover { color: red; } position: absolute; }",
      // Unspecified at the bottom, keeping relative order.
      {
        code: "a { display: block; zebra-x: 1; apple-x: 2; }",
        options: [{ unspecified: "bottom" }],
      },
      {
        code: "a { color: red; --x: 1; }",
        options: [{ customProperties: "ignore" }],
      },
      // Alphabetical: every property participates, no list involved.
      {
        code: "a { --a: 1; --b: 2; color: red; display: block; width: 0; }",
        options: [{ order: "alphabetical" }],
      },
      // Alphabetical: prefixed properties sort right before their
      // unprefixed counterpart (cascade-correct fallback order).
      {
        code: "a { -moz-transform: none; -webkit-transform: none; transform: none; unknown-future-property: 1; }",
        options: [{ order: "alphabetical" }],
      },
    ],

    invalid: [
      {
        code: "a { display: block; position: absolute; }",
        output: "a { position: absolute; display: block; }",
        errors: [
          {
            messageId: "expectedOrder",
            data: { property: "position", beforeProperty: "display" },
          },
        ],
      },
      // A single fix pass reorders the whole run.
      {
        code: "a { color: red; width: 0; display: block; position: absolute; }",
        output:
          "a { position: absolute; display: block; width: 0; color: red; }",
        errors: [
          { messageId: "expectedOrder" },
          { messageId: "expectedOrder" },
          { messageId: "expectedOrder" },
        ],
      },
      // Custom properties move to the top.
      {
        code: "a { display: block; --x: 1; }",
        output: "a { --x: 1; display: block; }",
        errors: [{ messageId: "expectedOrder" }],
      },
      // Unspecified properties after listed ones, alphabetically.
      {
        code: "a { zebra-x: 1; apple-x: 2; display: block; }",
        output: "a { display: block; apple-x: 2; zebra-x: 1; }",
        options: [{ unspecified: "bottomAlphabetical" }],
        errors: [{ messageId: "expectedOrder" }, { messageId: "expectedOrder" }],
      },
      // Unspecified properties before listed ones.
      {
        code: "a { position: absolute; unknown-x: 1; }",
        output: "a { unknown-x: 1; position: absolute; }",
        options: [{ unspecified: "top" }],
        errors: [{ messageId: "expectedOrder" }],
      },
      // Comments stay in place; declarations move around them.
      {
        code: "a { display: block; /* c */ position: absolute; }",
        output: "a { position: absolute; /* c */ display: block; }",
        errors: [{ messageId: "expectedOrder" }],
      },
      // DevTools preset inversion.
      {
        code: "a { color: red; display: block; }",
        output: "a { display: block; color: red; }",
        options: [{ order: "devtools" }],
        errors: [
          {
            messageId: "expectedOrder",
            data: { property: "display", beforeProperty: "color" },
          },
        ],
      },
      // Alphabetical inversions, including custom properties.
      {
        code: "a { width: 0; display: block; --b: 1; --a: 2; }",
        output: "a { --a: 2; --b: 1; display: block; width: 0; }",
        options: [{ order: "alphabetical" }],
        errors: [
          { messageId: "expectedOrder" },
          { messageId: "expectedOrder" },
          { messageId: "expectedOrder" },
        ],
      },
      // Alphabetical keeps prefixed fallbacks before the standard property.
      {
        code: "a { transform: none; -webkit-transform: none; }",
        output: "a { -webkit-transform: none; transform: none; }",
        options: [{ order: "alphabetical" }],
        errors: [
          {
            messageId: "expectedOrder",
            data: {
              property: "-webkit-transform",
              beforeProperty: "transform",
            },
          },
        ],
      },
      // Only the run after the nested rule is out of order.
      {
        code: "a { display: block; &:hover { color: red; } width: 0; position: absolute; }",
        output:
          "a { display: block; &:hover { color: red; } position: absolute; width: 0; }",
        errors: [{ messageId: "expectedOrder" }],
      },
    ],
  });
});
