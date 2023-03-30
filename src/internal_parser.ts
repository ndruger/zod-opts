import { ParseError } from "./error";
import { debugLog } from "./logger";
import type {
  InternalCommand,
  InternalOption,
  InternalPositionalArgument,
} from "./type";

export interface Candidate {
  name: string;
  value: string | string[] | undefined;
  isNegative: boolean;
}

export interface PositionalCandidate {
  name: string;
  value: string | string[];
}

export function isNumericValue(str: string): boolean {
  return !isNaN(str as unknown as number) && !isNaN(parseFloat(str));
}

function optionRequiresValue(option: InternalOption): boolean {
  return option.type !== "boolean";
}

export function findOptionByPrefixedName(
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

type ValidateOptionArgumentsResult =
  | { ok: true; value: string | string[] | undefined; shift: number }
  | { ok: false; message: string };

function validateOptionArguments(
  option: InternalOption,
  isNegative: boolean,
  optionArgCandidates: string[],
  isForcedValue: boolean
): ValidateOptionArgumentsResult {
  if (optionRequiresValue(option) && optionArgCandidates.length === 0) {
    // ex. --foo and foo is string
    return { ok: false, message: `Option '${option.name}' needs value` };
  }
  if (isForcedValue && !optionRequiresValue(option)) {
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

  const [value, shift] = !optionRequiresValue(option)
    ? [undefined, 0]
    : option.isArray
    ? [optionArgCandidates, optionArgCandidates.length]
    : [optionArgCandidates[0], 1];

  return {
    ok: true,
    value,
    shift,
  };
}

function removeOptionPrefix(prefixedName: string): string {
  return prefixedName.replace(/^-+/, "");
}

function parseLongNameOptionArgument(
  options: InternalOption[],
  arg: string,
  optionArgCandidates: string[]
): { candidate: Candidate; shift: number } {
  const match = arg.match(/^(?<prefixedName>[^=]+)(=(?<forcedValue>.*))?$/); // forcedValue may be empty string

  if (match == null) {
    throw new Error(`Invalid option: ${arg}`);
  }
  const { prefixedName, forcedValue } = match.groups as Record<string, string>;
  if (forcedValue !== undefined) {
    const result = findOptionByPrefixedName(options, prefixedName);
    if (result === undefined) {
      throw new ParseError(
        `Invalid option: ${removeOptionPrefix(prefixedName)}`
      );
    }
    const [option, isNegative] = result;
    const validateResult = validateOptionArguments(
      option,
      isNegative,
      [forcedValue],
      true
    );
    if (!validateResult.ok) {
      throw new ParseError(`${validateResult.message}: ${option.name}`);
    }
    return {
      candidate: {
        name: option.name,
        value: validateResult.value,
        isNegative,
      },
      shift: 1,
    };
  } else {
    const result = findOptionByPrefixedName(options, prefixedName);
    if (result === undefined) {
      throw new ParseError(
        `Invalid option: ${removeOptionPrefix(prefixedName)}`
      );
    }
    const [option, isNegative] = result;
    const validateResult = validateOptionArguments(
      option,
      isNegative,
      optionArgCandidates,
      false
    );
    if (!validateResult.ok) {
      throw new ParseError(`${validateResult.message}: ${option.name}`);
    }
    return {
      candidate: {
        name: option.name,
        value: validateResult.value,
        isNegative,
      },
      shift: validateResult.shift + 1,
    };
  }
}

// ex. -abc => -a, -b, -c: ok
// ex. -abc 10 => -a, -b, -c=10: ok
// ex. -abc 10 => -a, -b, -c, 10(next):ok
// ex. -abc 10 11 => -a, -b, -c=[10, 11]: ok
// ex. -abc 10 11 => -a, -b, -c, [10, 11](next):ok
// ex. -abc10 => -abc=10: ng
// ex. -a10 => -a=10: ok
// ex. -ab10 => -a, -b=10: ng
function parseShortNameMultipleOptionArgument(
  options: InternalOption[],
  arg: string,
  optionArgCandidates: string[]
): { candidates: Candidate[]; shift: number } {
  let shift = 1;
  const candidates: Candidate[] = [];

  debugLog("parseShortNameMultipleOptionArgument", arg, optionArgCandidates);

  const text = arg.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const result = findOptionByPrefixedName(options, `-${c}`);
    if (result === undefined) {
      throw new ParseError(`Invalid option: ${c}`);
    }
    const [option] = result;
    if (optionRequiresValue(option)) {
      const isLast = text[i + 1] === undefined;
      if (isLast && optionArgCandidates.length !== 0) {
        if (option.isArray) {
          candidates.push({
            name: option.name,
            value: optionArgCandidates,
            isNegative: false,
          });
          shift = optionArgCandidates.length + 1;
        } else {
          candidates.push({
            name: option.name,
            value: optionArgCandidates[0],
            isNegative: false,
          });
          shift = 2;
        }
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

function parseShortNameOptionArgument(
  options: InternalOption[],
  arg: string,
  optionArgCandidates: string[]
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
  // If findOptionByPrefixedName() returns matched option, it is treated as single option even if the validation fails.
  const result = findOptionByPrefixedName(options, prefixedName);
  if (result === undefined) {
    return parseShortNameMultipleOptionArgument(
      options,
      prefixedName,
      optionArgCandidates
    );
  }
  const [option] = result;
  const validateResult = validateOptionArguments(
    option,
    false,
    optionArgCandidates,
    false
  );
  if (!validateResult.ok) {
    throw new ParseError(`${validateResult.message}: ${option.name}`);
  }
  return {
    candidates: [
      {
        name: option.name,
        value: validateResult.value,
        isNegative: false,
      },
    ],
    shift: validateResult.shift + 1,
  };
}

function parseOptionArgument(
  options: InternalOption[],
  arg: string,
  optionArgCandidates: string[]
): { candidates: Candidate[]; shift: number } {
  if (arg.startsWith("--")) {
    const { candidate, shift } = parseLongNameOptionArgument(
      options,
      arg,
      optionArgCandidates
    );
    return {
      candidates: [candidate],
      shift,
    };
  }
  return parseShortNameOptionArgument(options, arg, optionArgCandidates);
}

export function pickPositionalArguments(
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

export function parsePositionalArguments(
  args: string[],
  positionalArgs: InternalPositionalArgument[]
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

function pickNextNonOptionArgumentCandidates(
  targets: string[],
  options: InternalOption[]
): string[] {
  const foundIndex = targets.findIndex((arg) => likesOptionArg(arg, options));
  if (foundIndex === -1) {
    return targets;
  }
  return targets.slice(0, foundIndex);
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
  if (isNumericValue(normalizedArg.slice(1))) {
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

function processDoubleDash(state: State): State {
  return {
    ...state,
    index: state.index + 1,
    hasDoubleDash: true,
  };
}

function processOption(
  state: State,
  args: string[],
  options: InternalOption[]
): State {
  const arg = args[state.index];
  const picked = pickNextNonOptionArgumentCandidates(
    args.slice(state.index + 1),
    options
  );

  const { candidates, shift } = parseOptionArgument(options, arg, picked);
  return {
    ...state,
    index: state.index + shift,
    candidates: state.candidates.concat(candidates),
  };
}

function processPositionalArguments(
  state: State,
  args: string[],
  options: InternalOption[],
  positionalArgs: InternalPositionalArgument[]
): State {
  if (state.positionalCandidates.length !== 0) {
    throw new ParseError("Positional arguments specified twice");
  }
  const { positionalArgs: picked, shift } = pickPositionalArguments(
    args.slice(state.index),
    options,
    state.hasDoubleDash
  );
  const positionalCandidates = parsePositionalArguments(picked, positionalArgs);

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

interface ParseToFindCommandResult {
  index: number;
  isHelp: boolean;
  isVersion: boolean;
  commandName: string | undefined;
}

function parseToFindCommand(
  args: string[],
  commandNames: string[]
): ParseToFindCommandResult {
  let state: ParseToFindCommandResult = {
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

export function parseMultipleCommands({
  args,
  commands,
}: {
  args: string[];
  commands: InternalCommand[];
}): CommandParsed {
  const searchResult = parseToFindCommand(
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
  positionalArgs: InternalPositionalArgument[];
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
      state = processPositionalArguments(state, args, options, positionalArgs);
    } else {
      if (arg === "--") {
        state = processDoubleDash(state);
      } else if (isHelpOption(arg)) {
        state = { ...state, isHelp: true };
        break;
      } else if (isVersionOption(arg)) {
        state = { ...state, isVersion: true };
        break;
      } else if (likesOptionArg(arg, options)) {
        state = processOption(state, args, options);
      } else {
        state = processPositionalArguments(
          state,
          args,
          options,
          positionalArgs
        );
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
