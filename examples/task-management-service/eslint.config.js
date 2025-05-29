// @ts-check
import rootConfig from "../../eslint.config.js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...rootConfig,
  {
    files: ["src/**/*.ts"], // Apply type-aware linting only to .ts files in src
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json", // Point to the tsconfig.json in this example project
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
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
