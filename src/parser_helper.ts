import { type z } from "zod";

import { ParseError } from "./error";
import { generateGlobalHelp } from "./help";
import { parse } from "./internal_parser";
import { debugLog } from "./logger";
import type {
  InternalOption,
  InternalPositionalArg,
  Options,
  ParseResult,
  PositionalArgs,
} from "./type";
import { validate } from "./validator";
import * as zodUtil from "./zod_util";

export function generateInternalOptions(options: Options): InternalOption[] {
  return Object.entries(options).map(([name, option]) => {
    return zodUtil.optionToInternal(option, name);
  });
}

export function generateInternalPositionalArgs(
  positionalArgs: PositionalArgs
): InternalPositionalArg[] {
  return positionalArgs.map(zodUtil.positionalArgToInternal);
}

export function generateZodShape(
  options?: Options,
  positionalArgs?: PositionalArgs
): z.ZodRawShape {
  const optionShape = Object.fromEntries(
    Object.entries(options === undefined ? {} : options)
      .map(([name, { type }]) => {
        return [name, type];
      })
      .concat(
        positionalArgs === undefined
          ? []
          : positionalArgs.map((option) => [option.name, option.type])
      )
  );
  return optionShape;
}

export function generateInternalParserAndParse({
  options,
  positionalArgs,
  args,
  name,
  description,
  version,
}: {
  options: Options;
  positionalArgs: PositionalArgs;
  args: string[];
  name?: string;
  description?: string;
  version?: string;
}): ParseResult<object> {
  const internalOptions = generateInternalOptions(options);
  const internalPositionalArgs = generateInternalPositionalArgs(positionalArgs);

  const help = generateGlobalHelp({
    options: internalOptions,
    positionalArgs: internalPositionalArgs,
    name,
    description,
    version,
  });

  try {
    const parsed = parse({
      args,
      options: internalOptions,
      positionalArgs: internalPositionalArgs,
    });
    debugLog("generateInternalParserAndParse", {
      parsed: JSON.stringify(parsed),
    });
    if (parsed.isHelp) {
      return {
        type: "help",
        help,
        exitCode: 0,
      };
    }

    if (parsed.isVersion) {
      return {
        type: "version",
        help,
        exitCode: 0,
      };
    }

    const { options: validOptions, positionalArgs: validPositionalArgs } =
      validate(parsed, internalOptions, internalPositionalArgs);
    debugLog("generateInternalParserAndParse", {
      validOptions: JSON.stringify(validOptions),
      validPositionalArgs: JSON.stringify(validPositionalArgs),
    });
    const validOptionMap = Object.fromEntries(
      validOptions.map((option) => [option.name, option.value])
    );
    const validPositionalArgMap = Object.fromEntries(
      validPositionalArgs.map((option) => [option.name, option.value])
    );

    return {
      type: "match",
      parsed: {
        ...validOptionMap,
        ...validPositionalArgMap,
      },
      help,
    };
  } catch (e) {
    debugLog("generateInternalParserAndParse handle error", e);
    if (!(e instanceof ParseError)) {
      throw e;
    }
    return {
      type: "error",
      error: e,
      exitCode: 1,
      help,
    };
  }
}
