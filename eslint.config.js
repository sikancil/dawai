// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 0. Global ignores
  {
    ignores: [
      "**/dist/**",
      "packages/types/**",
      "**/node_modules/**",
    ],
  },

  // 1. ESLint recommended for all non-ignored files
  eslint.configs.recommended,

  // 2. TypeScript configurations
  // Spread the array of configs from recommendedTypeChecked.
  // These provide base TS linting, including type-aware rules.
  // We modify each of these configs to explicitly ignore eslint.config.js
  // to prevent type-aware linting on the config file itself.
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    ignores: [...(config.ignores || []), "**/eslint.config.js"],
  })),

  // 3. Project-specific TypeScript settings (applies to .ts/.tsx files)
  // This layer provides the parserOptions needed for type-aware linting
  // and allows overriding rules specifically for TS files.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./packages/*/tsconfig.json",
          "./packages/*/tsconfig.lib.json",
          "./examples/*/tsconfig.json"
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Overrides and additions to recommendedTypeChecked
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "dot-notation": "off", // Ensure base rule is off if @typescript-eslint/dot-notation is used
      "@typescript-eslint/dot-notation": ["error", { allowKeywords: true }],
    },
  },

  // 4. JS specific config (including .config.js files)
  // This must come after type-aware configs to correctly override for JS files.
  // It uses disableTypeChecked to turn off type-aware rules and parser options for JS.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked, // Disables type-checking and type-aware rules
    rules: {
      // Turn off TypeScript-specific rules that don't apply to JS or are handled differently
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off", // Or a more JS-appropriate setting
      "@typescript-eslint/dot-notation": "off",
      // Add any JS-specific rule adjustments here
      // e.g., "no-undef": "off" if using CommonJS globals not recognized
    },
  }
);
