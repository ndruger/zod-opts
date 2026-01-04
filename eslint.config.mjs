import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

const tsRecommended = tsPlugin.configs.recommended?.rules ?? {};
const tsStylistic = tsPlugin.configs.stylistic?.rules ?? {};

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      strict: ["error", "never"],
      "no-console": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
      "import/no-unresolved": "off",
      "import/no-extraneous-dependencies": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  eslintConfigPrettier,
];
