import { type z } from "zod";

import { ParseError } from "./error";
import { generateGlobalHelp } from "./help";
import { parse } from "./internal_parser";
import { debugLog } from "./logger";
import type {
  InternalOption,
  InternalPositionalArgument,
  Options,
  ParseResult,
  PositionalArguments,
} from "./type";
import { validate } from "./validator";
import * as zodUtil from "./zod_util";

export function generateInternalOptions(options: Options): InternalOption[] {
  return Object.entries(options).map(([name, option]) => {
    return zodUtil.optionToInternal(option, name);
  });
}

export function generateInternalPositionalArguments(
  positionalArgs: PositionalArguments
): InternalPositionalArgument[] {
  return positionalArgs.map(zodUtil.positionalArgumentToInternal);
}

export function generateZodShape(
  options?: Options,
  positionalArgs?: PositionalArguments
): z.ZodRawShape {
  const optionShape = Object.fromEntries(
    Object.entries(options ?? {})
      .map(([name, { type }]) => {
        return [name, type];
      })
      .concat(positionalArgs?.map((option) => [option.name, option.type]) ?? [])
  );
  return optionShape;
}

export function createInternalParserAndParse({
  options,
  positionalArgs,
  args,
  name,
  description,
  version,
}: {
  options: Options;
  positionalArgs: PositionalArguments;
  args: string[];
  name?: string;
  description?: string;
  version?: string;
}): ParseResult<object> {
  const internalOptions = generateInternalOptions(options);
  const internalPositionalArguments =
    generateInternalPositionalArguments(positionalArgs);

  const help = generateGlobalHelp({
    options: internalOptions,
    positionalArgs: internalPositionalArguments,
    name,
    description,
    version,
  });

  try {
    const parsed = parse({
      args,
      options: internalOptions,
      positionalArgs: internalPositionalArguments,
    });
    debugLog("createInternalParserAndParse", {
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

    const { options: validOptions, positionalArgs: validPositionalArguments } =
      validate(parsed, internalOptions, internalPositionalArguments);
    debugLog("createInternalParserAndParse", {
      validOptions: JSON.stringify(validOptions),
      validPositionalArguments: JSON.stringify(validPositionalArguments),
    });
    const validOptionMap = Object.fromEntries(
      validOptions.map((option) => [option.name, option.value])
    );
    const validPositionalArgMap = Object.fromEntries(
      validPositionalArguments.map((option) => [option.name, option.value])
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
    debugLog("createInternalParserAndParse handle error", e);
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
