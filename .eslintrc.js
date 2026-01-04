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
    "no-console": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "@typescript-eslint/array-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-return-this-type": "off",
    "@typescript-eslint/non-nullable-type-assertion-style": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
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
