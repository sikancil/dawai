// @ts-check
import rootConfig from "../../eslint.config.js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...rootConfig,
  {
    files: ["src/**/*.ts"], // Apply type-aware linting only to .ts files in src
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.lib.json", // Corrected path
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Add any project-specific ESLint configurations or overrides here
  },
  // If there are JS files in this package that need specific rules (other than the root JS config),
  // they can be added in a separate configuration object here.
  {
    files: ["src/**/*.ts"], // <--- Added this line
    rules: {
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
    },
  }
);
