import path from "node:path";

import { z, type ZodObject, type ZodRawShape } from "zod";

import { type Command } from "./command";
import { ParseError } from "./error";
import { generateCommandHelp, generateGlobalCommandHelp } from "./help";
import { type CommandParsed, parseMultipleCommands } from "./internal_parser";
import { debugLog } from "./logger";
import type {
  Handler,
  InternalCommand,
  ParseResultError,
  ParseResultHelp,
  ParseResultMatch,
  ParseResultVersion,
  ValidateCallback,
} from "./type";
import * as util from "./util";
import { validateMultipleCommands } from "./validator";

interface ParseInput {
  args: string[];
  commands: InternalCommand[];
  scriptName: string;
}

type CommandParsedHelp = CommandParsed & { isHelp: true };
type CommandParsedVersion = CommandParsed & { isVersion: true };

export class CommandParser {
  private _name: string | undefined;
  private _version: string | undefined;
  private _description: string | undefined;
  private _handler: Handler<ZodRawShape> | undefined;
  private _commands: Command[] = [];

  constructor({
    name,
    version,
    description,
    handler,
    commands,
  }: {
    name?: string;
    version?: string;
    description?: string;
    handler?: Handler<ZodRawShape>;
    commands?: Command[];
  } = {}) {
    this._name = name;
    this._version = version;
    this._description = description;
    this._handler = handler;
    if (commands !== undefined) {
      this._commands = commands;
    }
  }

  name(name: string): CommandParser {
    this._name = name;
    return this;
  }

  version(version: string): CommandParser {
    this._version = version;
    return this;
  }

  description(description: string): CommandParser {
    this._description = description;
    return this;
  }

  _internalHandler(
    handler: (
      arg0:
        | ParseResultMatch<z.infer<ZodObject<z.ZodRawShape>>>
        | ParseResultError
        | ParseResultHelp
        | ParseResultVersion
    ) => void
  ): CommandParser {
    this._handler = handler as Handler<z.ZodRawShape>;
    return this;
  }

  subcommand(command: Command): CommandParser {
    if (
      this._commands.some(
        (c) => c.toInternalCommand().name === command.toInternalCommand().name
      )
    ) {
      throw new Error(
        `Duplicated command name: ${command.toInternalCommand().name}`
      );
    }

    this._commands = this._commands.concat([command]);
    return this;
  }

  showHelp(commandName?: string): void {
    const help = this.getHelp(commandName);
    console.log(help); // eslint-disable-line no-console
  }

  getHelp(commandName?: string): string {
    if (commandName === undefined) {
      const internalCommands = this._commands.map((command) =>
        command.toInternalCommand()
      );
      return generateGlobalCommandHelp({
        commands: internalCommands,
        name: this._scriptName(),
        description: this._description,
        version: this._version,
      });
    }

    const foundCommand = this._commands.find(
      (command) => command.toInternalCommand().name === commandName
    ) as Command; // CommandParser wll be created by subcommand() that ensures that the command exists

    return generateCommandHelp({
      command: foundCommand.toInternalCommand(),
      name: this._name,
      version: this._version,
    });
  }

  parse(args?: string[]): void {
    const validArgs = args ?? process.argv.slice(2);
    const commands = this._commands.map((command) => {
      return command._toParseCommand();
    });
    const internalCommands = commands.map((command) => command.internalCommand);

    const internalResult = this._internalParseAndValidate({
      args: validArgs,
      commands: internalCommands,
      scriptName: this._scriptName(),
    });
    if (internalResult.type !== "match") {
      this._handleAndExit(internalResult);
    }
    const usedCommandIndex = internalCommands.findIndex(
      (command) => internalResult.commandName === command.name
    );
    const { shape, action, validation } = commands[usedCommandIndex];

    const zodParseResult = this._zodParse(internalResult, shape);
    if (!zodParseResult.success) {
      this._handleAndExit(zodParseResult.error);
    }
    const validationError = this._validateByCustomValidation(
      validation,
      zodParseResult.value,
      internalResult.help
    );
    if (validationError !== undefined) {
      this._handleAndExit(validationError);
    }

    if (this._handler !== undefined) {
      this._handler({ ...internalResult, parsed: zodParseResult.value });
    }
    action(zodParseResult.value);
  }

  private _handleAndExit(
    handlerArg: ParseResultError | ParseResultHelp | ParseResultVersion
  ): never {
    if (this._handler != null) {
      this._handler(handlerArg);
    }
    util.errorExit(handlerArg, this._version);
  }

  private _scriptName(): string {
    if (this._name !== undefined) {
      return this._name;
    }
    const pathName = process.argv[1];
    return path.basename(pathName);
  }

  private _generateParseHelp(
    commands: InternalCommand[],
    selectedCommand: InternalCommand | undefined,
    scriptName: string | undefined
  ): string {
    return selectedCommand === undefined
      ? generateGlobalCommandHelp({
          commands,
          name: scriptName,
          description: this._description,
          version: this._version,
        })
      : generateCommandHelp({
          command: selectedCommand,
          name: scriptName,
          version: this._version,
        });
  }

  private _handleInternalParseHelpAndVersion(
    parsed: CommandParsedHelp | CommandParsedVersion,
    selectedCommand: InternalCommand | undefined,
    commands: InternalCommand[],
    scriptName: string
  ): ParseResultHelp | ParseResultVersion {
    const help = this._generateParseHelp(commands, selectedCommand, scriptName);

    if (parsed.isHelp) {
      return {
        type: "help",
        help,
        exitCode: 0,
        commandName: parsed.commandName,
      };
    }

    if (parsed.isVersion) {
      return {
        type: "version",
        help,
        exitCode: 0,
      };
    }
    util.assertNever(parsed);
  }

  private _handleInternalParseError(
    e: ParseError,
    commands: InternalCommand[],
    scriptName: string | undefined
  ): ParseResultError {
    const error = e;
    const selectedCommand =
      error.commandName !== undefined
        ? commands.find((command) => command.name === error.commandName)
        : undefined;
    return {
      type: "error",
      error: e,
      exitCode: 1,
      help: this._generateParseHelp(commands, selectedCommand, scriptName),
      commandName: error.commandName,
    };
  }

  private _handleInternalParseMatch(
    parsed: CommandParsed,
    selectedCommand: InternalCommand,
    commands: InternalCommand[],
    scriptName: string
  ): ParseResultMatch<object> {
    const { options: validOptions, positionalArgs: validPositionalArguments } =
      validateMultipleCommands(
        parsed,
        selectedCommand.options,
        selectedCommand.positionalArgs,
        parsed.commandName as string
      );
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
      commandName: parsed.commandName,
      help: this._generateParseHelp(commands, selectedCommand, scriptName),
    };
  }

  private _internalParseAndValidate({
    args,
    commands,
    scriptName,
  }: ParseInput):
    | ParseResultError
    | ParseResultHelp
    | ParseResultVersion
    | ParseResultMatch<object> {
    try {
      if (args.length === 0) {
        throw new ParseError("No command specified");
      }
      
      const parsed = parseMultipleCommands({
        args,
        commands,
      });
      debugLog("parseMultipleCommands", {
        parsed: JSON.stringify(parsed),
      });
      const selectedCommand = commands.find(
        (command) => command.name === parsed.commandName
      );
      if (parsed.isHelp || parsed.isVersion) {
        return this._handleInternalParseHelpAndVersion(
          parsed as CommandParsedHelp | CommandParsedVersion,
          selectedCommand,
          commands,
          scriptName
        );
      }
      return this._handleInternalParseMatch(
        parsed,
        selectedCommand as InternalCommand,
        commands,
        scriptName
      );
    } catch (e) {
      debugLog("createInternalParserAndParse handle error", e);
      if (!(e instanceof ParseError)) {
        throw e;
      }
      return this._handleInternalParseError(e, commands, scriptName);
    }
  }

  private _zodParse<T>(
    prevResult: ParseResultMatch<T>,
    shape: ZodRawShape
  ): { success: true; value: T } | { success: false; error: ParseResultError } {
    const result = z.object(shape).safeParse(prevResult.parsed);
    if (!result.success) {
      const firstError: z.ZodIssue = result.error.errors[0];
      return {
        success: false,
        error: {
          type: "error",
          error: new ParseError(
            `${firstError.message}: ${firstError.path.join("")}`,
            result.error
          ),
          help: prevResult.help,
          exitCode: 1,
          commandName: prevResult.commandName,
        },
      };
    }
    return { success: true, value: result.data as T };
  }

  private _validateByCustomValidation<T extends object>(
    validation: ValidateCallback<ZodRawShape> | undefined,
    value: T,
    help: string
  ): ParseResultError | undefined {
    if (validation === undefined) {
      return undefined;
    }
    const validateResult = (() => {
      try {
        return validation(value);
      } catch (e) {
        if (e instanceof Error) {
          return e.message;
        }
        throw e;
      }
    })();
    if (validateResult !== true) {
      return {
        type: "error",
        error: new ParseError(validateResult),
        help,
        exitCode: 1,
      };
    }
  }
}
