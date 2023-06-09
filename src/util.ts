import { z } from "zod";

import type {
  Option,
  Options,
  ParseResultError,
  ParseResultHelp,
  ParseResultVersion,
  PositionalArgument,
  PositionalArguments,
} from "./type";

export function uniq<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function findDuplicateValues(array: string[]): string[] {
  return array.filter((e, i, a) => a.indexOf(e) !== i);
}

export function errorExit(
  parseResult: ParseResultError | ParseResultHelp | ParseResultVersion,
  version: string = "none"
): never {
  const { type, help, exitCode } = parseResult;
  if (type === "help") {
    console.log(help); // eslint-disable-line no-console
  } else if (type === "version") {
    console.log(version); // eslint-disable-line no-console
  } else {
    console.error(`${parseResult.error.message}\n`); // eslint-disable-line no-console
    console.error(help); // eslint-disable-line no-console
  }
  process.exit(exitCode);
}

const IdRegexStr = "^[A-Za-z0-9_]+[A-Za-z0-9_-]*$";
const IdSchema = z.string().regex(new RegExp(IdRegexStr)).max(256);
const OptionAliasRegexStr = "^[A-Za-z0-9_]+$";
const OptionAliasSchema = z
  .string()
  .regex(new RegExp(OptionAliasRegexStr))
  .max(10);

function validateParamOption(name: string, { alias }: Option): void {
  if (!IdSchema.safeParse(name).success) {
    throw new Error(
      `Invalid option name. Supported pattern is /${IdRegexStr}/: ${name}`
    );
  }
  if (alias !== undefined && !OptionAliasSchema.safeParse(alias).success) {
    throw new Error(
      `Invalid option alias. Supported pattern is /${OptionAliasRegexStr}/: ${alias}`
    );
  }
}

function validateParamPositionalArg({ name }: PositionalArgument): void {
  if (!IdSchema.safeParse(name).success) {
    throw new Error(
      `Invalid positional argument name. Supported pattern is /${IdRegexStr}/: ${name}`
    );
  }
}

function checkForDuplicateOptionNames(options: Options | undefined): void {
  const duplicateName = findDuplicateValues(Object.keys(options ?? {}));
  if (duplicateName.length !== 0) {
    throw new Error(`Duplicated option name: ${duplicateName.join(", ")}`);
  }
}

function checkForDuplicatePositionalOptionNames(
  positionalArgs: PositionalArguments
): void {
  const duplicateName = findDuplicateValues(
    positionalArgs.map((option) => option.name)
  );
  if (duplicateName.length !== 0) {
    throw new Error(
      `Duplicated positional argument name: ${duplicateName.join(", ")}`
    );
  }
}
function checkIfOptNameUsedWithPositionalOption(
  options: Options,
  positionalArgs: PositionalArguments
): void {
  Object.keys(options).forEach((optionName) => {
    if (positionalArgs.some((option) => option.name === optionName)) {
      throw new Error(
        `Duplicated option name with positional argument name: ${optionName}`
      );
    }
  });
}

export function validateParamOptionsAndPositionalArguments(
  options: Options,
  positionalArgs: PositionalArguments
): void {
  Object.entries(options).forEach(([optionName, option]) => {
    validateParamOption(optionName, option);
  });
  checkForDuplicateOptionNames(options);

  positionalArgs.forEach(validateParamPositionalArg);
  checkForDuplicatePositionalOptionNames(positionalArgs);
  checkIfOptNameUsedWithPositionalOption(options, positionalArgs);
}

export function assertNever(value: never): never {
  throw new Error(`Unreachable code reached: ${JSON.stringify(value)}`);
}
