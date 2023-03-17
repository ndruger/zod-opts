import { ParseError } from "./error";
import type { Parsed } from "./internal_parser";
import { isNumeric } from "./internal_parser";
import { debugLog } from "./logger";
import type {
  FormatValidOption,
  FormatValidPositionalArg,
  InternalOption,
  InternalPositionalArg,
} from "./type";

interface ValidValue {
  value: string | number | boolean;
}

interface ValidPositionalValue {
  value: string | number | string[] | number[];
}

export function validateCandidateValue(
  option: InternalOption,
  value: string | undefined,
  isNegative: boolean
): ValidValue | undefined {
  switch (option.type) {
    case "string":
      // !isNegative is always true
      if (value === undefined) {
        return undefined;
      }
      return { value };
    case "number":
      // !isNegative is always true
      if (value === undefined || !isNumeric(value)) {
        return undefined;
      }
      return { value: parseFloat(value) };
    case "boolean":
      if (value !== undefined) {
        // --flag=10 is invalid
        return undefined;
      }
      if (isNegative) return { value: false };
      return { value: true };
  }
}

export function validatePositionalCandidateValue(
  option: InternalPositionalArg,
  value: string | string[] | undefined
): ValidPositionalValue | undefined {
  if (option.isArray) {
    if (value === undefined || !Array.isArray(value)) {
      return undefined;
    }
    switch (option.type) {
      case "string":
        return { value };
      case "number":
        if (value.some((v) => !isNumeric(v))) {
          return undefined;
        }
        return {
          value: value.map((v) => parseFloat(v)),
        };
    }
  }

  switch (option.type) {
    case "string":
      if (value === undefined) {
        return undefined;
      }
      return { value };
    case "number":
      if (value === undefined || !isNumeric(value as string)) {
        return undefined;
      }
      return { value: parseFloat(value as string) };
  }
}

export function validateMultiCommand(
  parsed: Parsed,
  options: InternalOption[],
  positionalArgs: InternalPositionalArg[],
  commandName: string
): {
  options: FormatValidOption[];
  positionalArgs: FormatValidPositionalArg[];
} {
  try {
    return validate(parsed, options, positionalArgs);
  } catch (e) {
    if (e instanceof ParseError) {
      e.commandName = commandName;
    }
    throw e;
  }
}

export function validate(
  parsed: Parsed,
  options: InternalOption[],
  positionalArgs: InternalPositionalArg[]
): {
  options: FormatValidOption[];
  positionalArgs: FormatValidPositionalArg[];
} {
  const optionMap = new Map(options.map((option) => [option.name, option]));
  const validOptionValues: Array<
    [string, string | number | boolean | undefined]
  > = parsed.candidates.map((candidate) => {
    const option = optionMap.get(candidate.name) as InternalOption;
    const validated = validateCandidateValue(
      option,
      candidate.value,
      candidate.isNegative
    );
    if (validated === undefined) {
      throw new ParseError(
        `Invalid option value. ${option.type} is expected: ${candidate.name}`
      ); // todo:
    }
    return [candidate.name, validated.value];
  });

  const positionalArgMap = new Map(
    positionalArgs.map((option) => [option.name, option])
  );
  const validPositionalArgValues: Array<
    [string, string | number | string[] | number[]]
  > = parsed.positionalCandidates.map((candidate) => {
    const name = candidate.name;
    const validated = validatePositionalCandidateValue(
      positionalArgMap.get(name) as InternalPositionalArg,
      candidate.value
    );
    if (validated === undefined) {
      throw new ParseError(`Invalid positional option: ${name}`); // todo:
    }
    return [candidate.name, validated.value];
  });

  debugLog("validate", { validOptionValues, validPositionalArgValues });

  const uniqValidOptionNames = Object.keys(
    Object.fromEntries(validOptionValues)
  );
  if (validOptionValues.length !== uniqValidOptionNames.length) {
    throw new ParseError("Duplicate option"); // todo:
  }

  const uniqValidPositionalArgNames = Object.keys(
    Object.fromEntries(validPositionalArgValues)
  );
  if (validPositionalArgValues.length !== uniqValidPositionalArgNames.length) {
    throw new ParseError("Duplicate positional option"); // todo:
  }

  const validOptionValueSet = new Map(validOptionValues);

  const validPositionalArgValueSet = new Map(validPositionalArgValues);

  const optionsResult = options.map((opt) => {
    if (!validOptionValueSet.has(opt.name)) {
      if (!opt.required) {
        return { name: opt.name, value: undefined };
      }
      throw new ParseError(`Required option is missing: ${opt.name}`);
    }
    return { name: opt.name, value: validOptionValueSet.get(opt.name) };
  });

  const positionalArgsResult = positionalArgs.map((opt) => {
    if (!validPositionalArgValueSet.has(opt.name)) {
      if (!opt.required) {
        return { name: opt.name, value: undefined };
      }
    }

    if (!validPositionalArgValueSet.has(opt.name)) {
      throw new ParseError(`Required option is missing: ${opt.name}`);
    }
    return {
      name: opt.name,
      value: validPositionalArgValueSet.get(opt.name),
    };
  });

  return { options: optionsResult, positionalArgs: positionalArgsResult };
}
