module.exports = {
  parser: "@typescript-eslint/parser",
  env: {
    es2022: true,
    node: true,
  },
  extends: ["standard-with-typescript", "prettier"],
  plugins: ["simple-import-sort"],
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": ["off"],
      },
    },
  ],
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    strict: ["error", "never"],
    "@typescript-eslint/array-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "@typescript-eslint/ban-types": [
      "error",
      {
        extendDefaults: true,
        types: {
          "{}": false,
        },
      },
    ],
  },
};
