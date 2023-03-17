export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./test/"],
  // injectGlobals: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.ts"],
};
