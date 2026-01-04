export function debugLog(...args: unknown[]): void {
  const debug = process.env.ZOD_OPTION_PARSER_DEBUG === "true";
  if (debug) {
    console.debug(...args); // eslint-disable-line no-console
  }
}
