// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugLog(...args: any[]): void {
  const debug = process.env.ZOD_OPTION_PARSER_DEBUG === "true";
  if (debug) {
    console.debug(...args); // eslint-disable-line no-console
  }
}
