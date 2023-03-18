import { ParseError } from "./error";
import { debugLog } from "./logger";
import type {
  InternalCommand,
  InternalOption,
  InternalPositionalArg,
} from "./type";

interface Candidate {
  name: string;
  value: string | undefined;
  isNegative: boolean;
}

interface PositionalCandidate {
  name: string;
  value: string | string[];
}

export function isNumeric(str: string): boolean {
  return !isNaN(str as unknown as number) && !isNaN(parseFloat(str));
}

function needsValue(option: InternalOption): boolean {
  return option.type !== "boolean";
}

export function findOption(
  options: InternalOption[],
  prefixedName: string
): [InternalOption, boolean] | undefined {
  const option = options.find(
    (opt) =>
      `--${opt.name}` === prefixedName ||
      (opt.alias !== undefined ? `-${opt.alias}` === prefixedName : false)
  );
  if (option != null) {
    return [option, false];
  }
  const negativeMatch = prefixedName.match(/^--no-(?<name>.+)$/);
  if (negativeMatch == null) {
    return undefined;
  }
  const groups = negativeMatch.groups as Record<string, string>;
  const negativeName = groups.name;
  const negativeOption = options.find((opt) => opt.name === negativeName);
  if (negativeOption != null) {
    return [negativeOption, true];
  }
  return undefined;
}

type ValidateOptionArgResult =
  | { ok: true; value: "needsValue" | "noValue" }
  | { ok: false; message: string };

function validateOptionArg(
  option: InternalOption,
  isNegative: boolean,
  value: string | undefined,
  isForcedValue: boolean
): ValidateOptionArgResult {
  if (needsValue(option) && value === undefined) {
    // ex. --foo and foo is string
    return { ok: false, message: `Option '${option.name}' needs value` };
  }
  if (isForcedValue && !needsValue(option)) {
    // ex. --foo=bar and foo is boolean
    return {
      ok: false,
      message: `Boolean option '${option.name}' does not need value`,
    };
  }
  if (isNegative && option.type !== "boolean") {
    // ex. --no-foo=bar and foo is not boolean
    return {
      ok: false,
      message: `Non boolean option '${option.name}' does not accept --no- prefix`,
    };
  }

  return {
    ok: true,
    value: needsValue(option) ? "needsValue" : "noValue",
  };
}

function removePrefix(prefixedName: string): string {
  return prefixedName.replace(/^-+/, "");
}

function parseLongNameOptionArg(
  options: InternalOption[],
  arg: string,
  next: string | undefined
): { candidate: Candidate; shift: number } {
  const match = arg.match(/^(?<prefixedName>[^=]+)(=(?<forcedValue>.*))?$/); // forcedValue may be empty string

  if (match == null) {
    throw new Error(`Invalid option: ${arg}`);
  }
  const { prefixedName, forcedValue } = match.groups as Record<string, string>;
  if (forcedValue !== undefined) {
    const result = findOption(options, prefixedName);
    if (result === undefined) {
      throw new ParseError(`Invalid option: ${removePrefix(prefixedName)}`);
    }
    const [option, isNegative] = result;
    const validateResult = validateOptionArg(
      option,
      isNegative,
      forcedValue,
      true
    );
    if (!validateResult.ok) {
      throw new ParseError(`${validateResult.message}: ${option.name}`);
    }
    return {
      candidate: {
        name: option.name,
        value: forcedValue,
        isNegative,
      },
      shift: 1,
    };
  } else {
    const result = findOption(options, prefixedName);
    if (result === undefined) {
      throw new ParseError(`Invalid option: ${removePrefix(prefixedName)}`);
    }
    const [option, isNegative] = result;
    const validateResult = validateOptionArg(option, isNegative, next, false);
    if (!validateResult.ok) {
      throw new ParseError(`${validateResult.message}: ${option.name}`);
    }
    return {
      candidate: {
        name: option.name,
        value: validateResult.value === "needsValue" ? next : undefined,
        isNegative,
      },
      shift: validateResult.value === "needsValue" ? 2 : 1,
    };
  }
}

// ex. -abc => -a, -b, -c: ok
// ex. -abc 10 => -a, -b, -c=10: ok
// ex. -abc 10 => -a, -b, -c, 10(next):ok
// ex. -abc10 => -abc=10: ng
// ex. -a10 => -a=10: ok
// ex. -ab10 => -a, -b=10: ng
function parseShortNameMultipleOptionArg(
  options: InternalOption[],
  arg: string,
  next: string | undefined
): { candidates: Candidate[]; shift: number } {
  let shift = 1;
  const candidates: Candidate[] = [];

  debugLog("parseShortNameMultipleOptionArg", arg, next);

  const text = arg.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const result = findOption(options, `-${c}`);
    if (result === undefined) {
      throw new ParseError(`Invalid option: ${c}`);
    }
    const [option] = result;
    if (needsValue(option)) {
      const isLast = text[i + 1] === undefined;
      if (isLast && next !== undefined) {
        candidates.push({
          name: option.name,
          value: next,
          isNegative: false,
        });
        shift = 2;
        break;
      }
      const isFirst = i === 0;
      if (isFirst) {
        const value = text.slice(1);
        candidates.push({
          name: option.name,
          value,
          isNegative: false,
        });
        shift = 1;
        break;
      }
    } else {
      candidates.push({
        name: option.name,
        value: undefined,
        isNegative: false,
      });
      continue;
    }
  }
  return { candidates, shift };
}

function parseShortNameOptionArg(
  options: InternalOption[],
  arg: string,
  next: string | undefined
): { candidates: Candidate[]; shift: number } {
  const match = arg.match(/^(?<prefixedName>[^=]+)$/);

  if (match == null) {
    // -a=10 is ng
    throw new ParseError(`Invalid option: ${arg}`);
  }
  const { prefixedName } = match.groups as Record<string, string>;

  // option may be multiple
  // case 1. '-abc' => '-a -b -c'
  // case 2. '-abc' => '-abc'
  // If findOption() returns matched option, it is treated as single option even if the validation fails.
  const result = findOption(options, prefixedName);
  if (result === undefined) {
    return parseShortNameMultipleOptionArg(options, prefixedName, next);
  }
  const [option] = result;
  const validateResult = validateOptionArg(option, false, next, false);
  if (!validateResult.ok) {
    throw new ParseError(`${validateResult.message}: ${option.name}`);
  }
  return {
    candidates: [
      {
        name: option.name,
        value: validateResult.value === "needsValue" ? next : undefined,
        isNegative: false,
      },
    ],
    shift: validateResult.value === "needsValue" ? 2 : 1,
  };
}

function parseOptionArg(
  options: InternalOption[],
  arg: string,
  next: string | undefined
): { candidates: Candidate[]; shift: number } {
  if (arg.startsWith("--")) {
    const { candidate, shift } = parseLongNameOptionArg(options, arg, next);
    return {
      candidates: [candidate],
      shift,
    };
  }
  return parseShortNameOptionArg(options, arg, next);
}

export function pickPositionalArgs(
  targets: string[],
  options: InternalOption[],
  hasDoubleDash: boolean
): { positionalArgs: string[]; shift: number } {
  if (hasDoubleDash) {
    return { positionalArgs: targets, shift: targets.length };
  }
  const foundIndex = targets.findIndex((arg) => likesOptionArg(arg, options));
  if (foundIndex === -1) {
    return { positionalArgs: targets, shift: targets.length };
  }
  return { positionalArgs: targets.slice(0, foundIndex), shift: foundIndex };
}

export function parsePositionalArgs(
  args: string[],
  positionalArgs: InternalPositionalArg[]
): PositionalCandidate[] {
  let i = 0;
  let candidates: PositionalCandidate[] = [];
  while (i < args.length) {
    const arg = args[i];
    const option = positionalArgs[i];
    if (option === undefined) {
      throw new ParseError("Too many positional arguments");
    }
    if (option.isArray) {
      candidates = candidates.concat({
        name: option.name,
        value: args.slice(i),
      });
      break;
    }
    candidates = candidates.concat({ name: option.name, value: arg });
    i++;
  }

  return candidates;
}

export interface Parsed {
  candidates: Candidate[];
  positionalCandidates: PositionalCandidate[];
  isHelp: boolean;
  isVersion: boolean;
}

export type CommandParsed = Parsed & {
  commandName: string | undefined;
};

function pickNextNonOption(
  arg: string | undefined,
  options: InternalOption[]
): string | undefined {
  if (arg === undefined || likesOptionArg(arg, options)) {
    return undefined;
  }
  return arg;
}

export function likesOptionArg(
  arg: string,
  options: InternalOption[]
): boolean {
  if (arg === "--") {
    return false;
  }
  const normalizedArg = arg.split("=")[0];
  if (normalizedArg.startsWith("--")) {
    return true;
  }
  if (
    options.some((option) => {
      return option.alias !== undefined
        ? `-${option.alias}` === normalizedArg
        : false;
    })
  ) {
    return true;
  }
  if (!normalizedArg.startsWith("-")) {
    return false;
  }
  if (isNumeric(normalizedArg.slice(1))) {
    return false;
  }
  return true;
}

interface State {
  index: number;
  candidates: Candidate[];
  positionalCandidates: PositionalCandidate[];
  hasDoubleDash: boolean;
  isHelp: boolean;
  isVersion: boolean;
}

function handleDoubleDash(state: State): State {
  return {
    ...state,
    index: state.index + 1,
    hasDoubleDash: true,
  };
}

function handleOption(
  state: State,
  args: string[],
  options: InternalOption[]
): State {
  const arg = args[state.index];
  const next = pickNextNonOption(args[state.index + 1], options);

  const { candidates, shift } = parseOptionArg(options, arg, next);
  return {
    ...state,
    index: state.index + shift,
    candidates: state.candidates.concat(candidates),
  };
}

function handlePositional(
  state: State,
  args: string[],
  options: InternalOption[],
  positionalArgs: InternalPositionalArg[]
): State {
  if (state.positionalCandidates.length !== 0) {
    throw new ParseError("Positional arguments specified twice");
  }
  const { positionalArgs: picked, shift } = pickPositionalArgs(
    args.slice(state.index),
    options,
    state.hasDoubleDash
  );
  const positionalCandidates = parsePositionalArgs(picked, positionalArgs);

  return {
    ...state,
    positionalCandidates,
    index: state.index + shift,
  };
}

function isHelpOption(arg: string): boolean {
  return arg === "-h" || arg === "--help";
}

function isVersionOption(arg: string): boolean {
  return arg === "-V" || arg === "--version";
}

interface CommandSearchParserResult {
  index: number;
  isHelp: boolean;
  isVersion: boolean;
  commandName: string | undefined;
}

function commandSearchParser(
  args: string[],
  commandNames: string[]
): CommandSearchParserResult {
  let state: CommandSearchParserResult = {
    index: 0,
    isHelp: false,
    isVersion: false,
    commandName: undefined,
  };

  while (state.index < args.length) {
    const arg = args[state.index];
    debugLog("state", JSON.stringify(state));
    if (isHelpOption(arg)) {
      const next = args[state.index + 1];
      if (next === undefined) {
        // global help
        state = { ...state, isHelp: true };
        break;
      } else if (commandNames.includes(next)) {
        // command help
        state = { ...state, isHelp: true, commandName: next };
        break;
      }
      state = { ...state, isHelp: true, index: state.index + 1 };
    } else if (isVersionOption(arg)) {
      state = { ...state, isVersion: true };
      break;
    } else if (commandNames.includes(arg)) {
      state = { ...state, commandName: arg, index: state.index + 1 };
      break;
    } else {
      throw new ParseError(`Unknown argument: ${arg}`);
    }
  }

  return state;
}

export function parseMultiCommand({
  args,
  commands,
}: {
  args: string[];
  commands: InternalCommand[];
}): CommandParsed {
  const searchResult = commandSearchParser(
    args,
    commands.map((command) => command.name)
  );
  if (searchResult.isHelp || searchResult.isVersion) {
    return {
      candidates: [],
      positionalCandidates: [],
      isHelp: searchResult.isHelp,
      isVersion: searchResult.isVersion,
      commandName: searchResult.commandName,
    };
  }
  const foundCommand = commands.find(
    (command) => command.name === searchResult.commandName
  ) as InternalCommand;
  let parsed;
  try {
    parsed = parse({
      args: args.slice(searchResult.index),
      options: foundCommand.options,
      positionalArgs: foundCommand.positionalArgs,
    });
  } catch (e) {
    if (e instanceof ParseError) {
      e.commandName = searchResult.commandName;
    }
    throw e;
  }
  return { ...parsed, commandName: searchResult.commandName };
}

export function parse({
  args,
  options,
  positionalArgs,
}: {
  args: string[];
  options: InternalOption[];
  positionalArgs: InternalPositionalArg[];
}): Parsed {
  let state: State = {
    index: 0,
    candidates: [],
    positionalCandidates: [],
    hasDoubleDash: false,
    isHelp: false,
    isVersion: false,
  };

  while (state.index < args.length) {
    const arg = args[state.index];
    debugLog("state", JSON.stringify(state));
    if (state.hasDoubleDash) {
      state = handlePositional(state, args, options, positionalArgs);
    } else {
      if (arg === "--") {
        state = handleDoubleDash(state);
      } else if (isHelpOption(arg)) {
        state = { ...state, isHelp: true };
        break;
      } else if (isVersionOption(arg)) {
        state = { ...state, isVersion: true };
        break;
      } else if (likesOptionArg(arg, options)) {
        state = handleOption(state, args, options);
      } else {
        state = handlePositional(state, args, options, positionalArgs);
      }
    }
  }
  debugLog("state", JSON.stringify(state));

  return {
    candidates: state.candidates,
    positionalCandidates: state.positionalCandidates,
    isHelp: state.isHelp,
    isVersion: state.isVersion,
  };
}
