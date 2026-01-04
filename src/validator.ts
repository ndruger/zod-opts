import { ParseError } from "./error";
import type { Candidate, Parsed, PositionalCandidate } from "./internal_parser";
import { isNumericValue } from "./internal_parser";
import { debugLog } from "./logger";
import type {
  FormatValidOption,
  FormatValidPositionalArgument,
  InternalOption,
  InternalPositionalArgument,
} from "./type";
import * as util from "./util";

interface ValidValue {
  value: string | number | string[] | number[] | boolean;
}

interface ValidPositionalValue {
  value: string | number | string[] | number[];
}

export function validateCandidateValue(
  option: InternalOption,
  value: string | string[] | undefined,
  isNegative: boolean
): ValidValue | undefined {
  if (option.isArray) {
    if (value === undefined || !Array.isArray(value)) {
      return undefined;
    }
    switch (option.type) {
      case "string":
        // !isNegative is always true
        if (value.length === 0) {
          return undefined;
        }
        return { value };
      case "number":
        // !isNegative is always true
        if (
          value === undefined ||
          value.some((item) => !isNumericValue(item))
        ) {
          return undefined;
        }
        return { value: value.map((item) => parseFloat(item)) };
    }
  }

  if (Array.isArray(value)) {
    return undefined;
  }

  switch (option.type) {
    case "string":
      // !isNegative is always true
      if (value === undefined) {
        return undefined;
      }
      return { value };
    case "number":
      // !isNegative is always true
      if (value === undefined || !isNumericValue(value)) {
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
  option: InternalPositionalArgument,
  value: string | string[]
): ValidPositionalValue | undefined {
  if (option.isArray) {
    if (!Array.isArray(value)) {
      return undefined;
    }
    switch (option.type) {
      case "string":
        return { value };
      case "number":
        if (value.some((v) => !isNumericValue(v))) {
          return undefined;
        }
        return {
          value: value.map((v) => parseFloat(v)),
        };
    }
  }

  switch (option.type) {
    case "string":
      return { value };
    case "number":
      if (!isNumericValue(value as string)) {
        return undefined;
      }
      return { value: parseFloat(value as string) };
  }
}

export function validateMultipleCommands(
  parsed: Parsed,
  options: InternalOption[],
  positionalArgs: InternalPositionalArgument[],
  commandName: string
): {
  options: FormatValidOption[];
  positionalArgs: FormatValidPositionalArgument[];
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

function validateOptions(
  candidates: Candidate[],
  options: InternalOption[]
): FormatValidOption[] {
  const optionMap = new Map(options.map((option) => [option.name, option]));
  const validValues: Array<
    [string, string | number | boolean | string[] | number[] | undefined]
  > = candidates.map((candidate) => {
    const option = optionMap.get(candidate.name);
    if (option === undefined) {
      throw new ParseError(`Unknown option: ${candidate.name}`);
    }
    const validated = validateCandidateValue(
      option,
      candidate.value,
      candidate.isNegative
    );
    if (validated === undefined) {
      throw new ParseError(
        `Invalid option value. ${option.type} is expected: ${candidate.name}`
      );
    }
    return [candidate.name, validated.value];
  });

  debugLog("validateOptions", { validValues });

  const arrayTypeMerged: Array<
    [string, string | number | boolean | string[] | number[] | undefined]
  > = options.flatMap((opt) => {
    const nameValues = validValues.filter(([name]) => name === opt.name);
    if (!opt.isArray) {
      return nameValues;
    }
    const values = nameValues.map(([, value]) => value);
    if (values.length === 0) {
      return [];
    }
    return [[opt.name, values.flat()]] as Array<[string, string[] | number[]]>;
  });

  const duplicateOptionNames = util.findDuplicateValues(
    arrayTypeMerged.map(([name]) => name)
  );
  if (duplicateOptionNames.length !== 0) {
    throw new ParseError(
      `Duplicated option: ${duplicateOptionNames.join(", ")}`
    );
  }
  const validValueSet = new Map(arrayTypeMerged);

  return options.map((opt) => {
    if (!validValueSet.has(opt.name)) {
      if (!opt.required) {
        return { name: opt.name, value: undefined };
      }
      throw new ParseError(`Required option is missing: ${opt.name}`);
    }
    return { name: opt.name, value: validValueSet.get(opt.name) };
  });
}

function validatePositionalArguments(
  candidates: PositionalCandidate[],
  positionalArgs: InternalPositionalArgument[]
): FormatValidPositionalArgument[] {
  const positionalArgMap = new Map(
    positionalArgs.map((option) => [option.name, option])
  );
  const validValues: Array<[string, string | number | string[] | number[]]> =
    candidates.map((candidate) => {
      const name = candidate.name;
      const positionalOption = positionalArgMap.get(name);
      if (positionalOption === undefined) {
        throw new ParseError(`Unknown positional argument: ${name}`);
      }
      const validated = validatePositionalCandidateValue(
        positionalOption,
        candidate.value
      );
      if (validated === undefined) {
        throw new ParseError(`Invalid positional argument value: ${name}`);
      }
      return [candidate.name, validated.value];
    });

  debugLog("validatePositionalArguments", { validValues });

  const duplicatedPositionalArgNames = util.findDuplicateValues(
    validValues.map(([name]) => name)
  );
  if (duplicatedPositionalArgNames.length !== 0) {
    throw new ParseError(
      `Duplicated positional argument: ${duplicatedPositionalArgNames.join(
        ", "
      )}`
    );
  }

  const validValueSet = new Map(validValues);

  return positionalArgs.map((opt) => {
    if (!validValueSet.has(opt.name)) {
      if (!opt.required) {
        return { name: opt.name, value: undefined };
      }
    }

    if (!validValueSet.has(opt.name)) {
      throw new ParseError(`Required argument is missing: ${opt.name}`);
    }
    return {
      name: opt.name,
      value: validValueSet.get(opt.name),
    };
  });
}

export function validate(
  parsed: Parsed,
  options: InternalOption[],
  positionalArgs: InternalPositionalArgument[]
): {
  options: FormatValidOption[];
  positionalArgs: FormatValidPositionalArgument[];
} {
  return {
    options: validateOptions(parsed.candidates, options),
    positionalArgs: validatePositionalArguments(
      parsed.positionalCandidates,
      positionalArgs
    ),
  };
}
