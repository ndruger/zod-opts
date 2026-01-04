export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./test/"],
  // injectGlobals: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Skip type checking for Zod v3/v4 compatibility
        isolatedModules: true,
      },
    ],
  },
};
