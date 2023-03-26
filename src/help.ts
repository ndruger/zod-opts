import type {
  InternalCommand,
  InternalOption,
  InternalPositionalArgument,
} from "./type";

function getBuiltInOptions(version?: string): InternalOption[] {
  const helpCommand: InternalOption = {
    name: "help",
    type: "boolean",
    required: false,
    alias: "h",
    description: "Show help",
  };

  const versionCommand: InternalOption = {
    name: "version",
    type: "boolean",
    required: false,
    alias: "V",
    description: "Show version",
  };

  return version === undefined ? [helpCommand] : [helpCommand, versionCommand];
}

function addPaddingToTable(rows: string[][]): string[][] {
  if (rows.length === 0) {
    return rows;
  }
  const colLength = rows[0].length;
  const colMax = Array.from({ length: colLength }, (_, col) => {
    const colCells = rows.map((row) => row[col]);
    return Math.max(...colCells.map((cell) => cell.length));
  });
  const rowsPadded = rows.map((row) => {
    return row.map((cell, col) => cell.padEnd(colMax[col]));
  });
  return rowsPadded;
}

function tableToText(rows: string[][]): string {
  return rows.map((cells) => cells.join("")).join("\n");
}

export function generateGlobalUsage(
  scriptName: string,
  positionalArgs: InternalPositionalArgument[],
  commandName?: string
): string {
  const positionalStr = positionalArgs
    .map((option) => {
      const inner = option.isArray ? `${option.name} ...` : `${option.name}`;
      if (option.required) {
        return `<${inner}>`;
      }
      return `[${inner}]`;
    })
    .join(" ");
  const commandStr = commandName !== undefined ? `${commandName} ` : "";
  return `Usage: ${scriptName} ${commandStr}[options] ${positionalStr}`;
}

export function generateGlobalCommandUsage(scriptName: string): string {
  return `Usage: ${scriptName} [options] <command>`;
}

function generateDefaultString(
  option: InternalOption | InternalPositionalArgument
): string {
  return option.defaultValue !== undefined
    ? `(default: ${JSON.stringify(option.defaultValue)})`
    : "";
}

function generateNameAndArgString(option: InternalOption): string {
  switch (option.type) {
    case "string":
      return `--${option.name} <${option.argumentName ?? "string"}>`;
    case "number":
      return `--${option.name} <${option.argumentName ?? "number"}>`;
    case "boolean":
      return `--${option.name}`;
  }
}

function generateChoiceString(
  option: InternalOption | InternalPositionalArgument
): string {
  if (option.enumValues === undefined) {
    return "";
  }
  return `(choices: ${option.enumValues.map((s) => `"${s}"`).join(", ")})`;
}

function generateDescriptionString(
  option: InternalOption | InternalPositionalArgument
): string {
  const descriptionStr =
    option.description !== undefined ? option.description : "";
  const defaultStr = generateDefaultString(option);
  const choiceStr = generateChoiceString(option);

  return `${collapseWhiteSpace([descriptionStr, choiceStr, defaultStr])}  `;
}

function collapseWhiteSpace(words: string[], splitter = " "): string {
  return words.filter((s) => s !== "").join(splitter);
}

export function generateOptionsText(
  options: InternalOption[],
  indent: number = 2
): string {
  const indentStr = " ".repeat(indent);
  const table = options.map((option) => {
    const aliasStr = option.alias !== undefined ? `-${option.alias}, ` : "";
    const nameAndArgStr = `${generateNameAndArgString(option)}  `;
    const descriptionStr = generateDescriptionString(option);
    const requiredStr = option.required ? "[required]" : "";
    return [indentStr, aliasStr, nameAndArgStr, descriptionStr, requiredStr];
  });
  return `Options:\n${tableToText(addPaddingToTable(table))}`;
}

export function generatePositionalArgumentsText(
  positionalArgs: InternalPositionalArgument[],
  indent: number = 2
): string {
  if (positionalArgs.length === 0) {
    return "";
  }
  const indentStr = " ".repeat(indent);
  const table = positionalArgs.map((arg) => {
    const nameAndArgStr = `${arg.name}  `;
    const descriptionStr = generateDescriptionString(arg);
    const requiredStr = arg.required ? "[required]" : "";
    return [indentStr, nameAndArgStr, descriptionStr, requiredStr];
  });
  return `Arguments:\n${tableToText(addPaddingToTable(table))}`;
}

export function generateCommandsText(
  commands: InternalCommand[],
  indent: number = 2
): string {
  const indentStr = " ".repeat(indent);
  const table = commands.map((command) => {
    const nameStr = `${command.name}  `;
    const descriptionStr =
      command.description !== undefined ? `${command.description}` : "";
    return [indentStr, nameStr, descriptionStr];
  });
  return `Commands:\n${tableToText(addPaddingToTable(table))}`;
}

export function generateGlobalHelp({
  options,
  positionalArgs,
  name,
  description,
  version,
}: {
  options: InternalOption[];
  positionalArgs: InternalPositionalArgument[];
  name?: string;
  description?: string;
  version?: string;
}): string {
  const globalUsage = generateGlobalUsage(name ?? "program", positionalArgs);
  const descriptionStr = description !== undefined ? `${description}` : "";
  const optionsWithBuildIn = getBuiltInOptions(version).concat(options);
  const optionsText = generateOptionsText(optionsWithBuildIn);
  const positionalArgsText = generatePositionalArgumentsText(positionalArgs);
  return `${collapseWhiteSpace(
    [globalUsage, descriptionStr, positionalArgsText, optionsText],
    "\n\n"
  )}\n`;
}

export function generateCommandHelp({
  command,
  name,
  version,
}: {
  command: InternalCommand;
  name?: string;
  version?: string;
}): string {
  const positionalArg = command.positionalArgs;
  const options = command.options;
  const globalUsage = generateGlobalUsage(
    name ?? "script",
    positionalArg,
    command.name
  );
  const optionsWithBuildIn = getBuiltInOptions(version).concat(options);
  const descriptionStr =
    command.description !== undefined ? `${command.description}` : "";
  const optionsText = generateOptionsText(optionsWithBuildIn);
  const positionalArgsText = generatePositionalArgumentsText(positionalArg);
  return `${collapseWhiteSpace(
    [globalUsage, descriptionStr, positionalArgsText, optionsText],
    "\n\n"
  )}\n`;
}

export function generateGlobalCommandHelp({
  commands,
  name,
  description,
  version,
}: {
  commands: InternalCommand[];
  name?: string;
  description?: string;
  version?: string;
}): string {
  const globalUsage = generateGlobalCommandUsage(name ?? "script");
  const descriptionStr = description !== undefined ? `${description}` : "";
  const commandsText = generateCommandsText(commands);
  const optionsText = generateOptionsText(getBuiltInOptions(version));
  return `${collapseWhiteSpace(
    [globalUsage, descriptionStr, commandsText, optionsText],
    "\n\n"
  )}\n`;
}
