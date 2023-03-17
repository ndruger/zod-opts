import path from "node:path";

import { z, type ZodObject, type ZodRawShape } from "zod";

import { type Command } from "./command";
import { CommandParser } from "./command_parser";
import { ParseError } from "./error";
import { generateGlobalHelp } from "./help";
import * as helper from "./parser_helper";
import type {
  GenerateZodShape,
  Handler,
  Narrow,
  Options,
  ParseResultError,
  ParseResultHelp,
  ParseResultMatch,
  ParseResultVersion,
  PositionalArgs,
  ValidateCallback,
} from "./type";
import * as util from "./util";

interface ParserState {
  name?: string;
  version?: string;
  description?: string;
  options: Options;
  positionalArgs: PositionalArgs;
  validation?: ValidateCallback<ZodRawShape>;
  handler?: Handler<ZodRawShape>;
}

export class Parser<
  TOptions extends Options = {},
  TPositionalArgs extends PositionalArgs = []
> {
  private _name: string | undefined;
  private _version: string | undefined;
  private _description: string | undefined;
  private readonly _options: Options = {};
  private readonly _positionalArgs: PositionalArgs = [];
  private _validation: ValidateCallback<ZodRawShape> | undefined;
  private _handler: Handler<ZodRawShape> | undefined;

  constructor({
    name,
    version,
    description,
    options,
    positionalArgs,
    validation,
    handler,
  }: {
    name?: string;
    version?: string;
    description?: string;
    options?: Options;
    positionalArgs?: Narrow<PositionalArgs>;
    validation?: ValidateCallback<ZodRawShape>;
    handler?: Handler<ZodRawShape>;
  } = {}) {
    this._name = name;
    this._version = version;
    this._description = description;
    if (options !== undefined) {
      this._options = options;
    }
    if (positionalArgs !== undefined) {
      this._positionalArgs = positionalArgs;
    }
    this._validation = validation;
    this._handler = handler;
  }

  name(name: string): Parser<TOptions, TPositionalArgs> {
    this._name = name;
    return this;
  }

  version(version: string): Parser<TOptions, TPositionalArgs> {
    this._version = version;
    return this;
  }

  description(description: string): Parser<TOptions, TPositionalArgs> {
    this._description = description;
    return this;
  }

  options<TNewOptions extends Options>(
    options: TNewOptions
  ): Parser<TNewOptions, TPositionalArgs> {
    util.validateParamOptionsAndPositionalArgs(options, this._positionalArgs);
    return new Parser<TNewOptions, TPositionalArgs>({
      ...this._currentState(),
      options,
    });
  }

  args<TNewPositionalArgs extends PositionalArgs>(
    positionalArgs: Narrow<TNewPositionalArgs>
  ): Parser<TOptions, TNewPositionalArgs> {
    util.validateParamOptionsAndPositionalArgs(
      this._options,
      positionalArgs as TNewPositionalArgs
    );
    return new Parser<TOptions, TNewPositionalArgs>({
      ...this._currentState(),
      positionalArgs: positionalArgs as TNewPositionalArgs,
    });
  }

  handler<TShape extends GenerateZodShape<TOptions, TPositionalArgs>>(
    handler: (
      arg0:
        | ParseResultMatch<z.infer<ZodObject<TShape>>>
        | ParseResultError
        | ParseResultHelp
        | ParseResultVersion
    ) => void
  ): Parser<TOptions, TPositionalArgs> {
    this._handler = handler as Handler<ZodRawShape>;
    return this;
  }

  validation<TShape extends GenerateZodShape<TOptions, TPositionalArgs>>(
    validation: (parsed: z.infer<ZodObject<TShape>>) => true | string
  ): Parser<TOptions, TPositionalArgs> {
    this._validation = validation as ValidateCallback<ZodRawShape>;
    return this;
  }

  showHelp(): void {
    const help = this.getHelp();
    console.log(help);
  }

  getHelp(): string {
    const internalOptions = helper.generateInternalOptions(this._options);
    const internalPositionalArgs = helper.generateInternalPositionalArgs(
      this._positionalArgs
    );

    return generateGlobalHelp({
      options: internalOptions,
      positionalArgs: internalPositionalArgs,
      name: this._scriptName(),
      description: this._description,
      version: this._version,
    });
  }

  parse(
    args?: string[]
  ): z.infer<ZodObject<GenerateZodShape<TOptions, TPositionalArgs>>> {
    const validArgs = args !== undefined ? args : process.argv.slice(2);

    const {
      _options: options,
      _positionalArgs: positionalArgs,
      _handler: handler,
      _validation: validation,
    } = this;

    // Check support of options and positionalArgs before parsing args
    const shape = helper.generateZodShape(
      options,
      positionalArgs
    ) as GenerateZodShape<TOptions, TPositionalArgs>;

    const handlerArg = helper.generateInternalParserAndParse({
      options,
      positionalArgs,
      args: validArgs,
      name: this._scriptName(),
      description: this._description,
      version: this._version,
    });
    if (
      handlerArg.type === "error" ||
      handlerArg.type === "help" ||
      handlerArg.type === "version"
    ) {
      if (handler != null) {
        handler(handlerArg);
      }
      util.errorExit(handlerArg, this._version);
    }

    const result = z.object(shape).safeParse(handlerArg.parsed);
    if (!result.success) {
      const firstError: z.ZodIssue = result.error.errors[0];
      const handlerArg2: ParseResultError = {
        type: "error",
        error: new ParseError(
          `${firstError.message}: ${firstError.path.join("")}`,
          result.error
        ),
        help: handlerArg.help,
        exitCode: 1,
      };
      if (handler != null) {
        handler(handlerArg2);
      }
      util.errorExit(handlerArg2, this._version);
    }
    if (validation != null) {
      const validationResult = (() => {
        try {
          return validation(result.data);
        } catch (e) {
          if (e instanceof Error) {
            return e.message;
          }
          throw e;
        }
      })();
      if (validationResult !== true) {
        const handlerArg2: ParseResultError = {
          type: "error",
          error: new ParseError(validationResult),
          help: handlerArg.help,
          exitCode: 1,
        };
        if (handler != null) {
          handler(handlerArg2);
        }
        util.errorExit(handlerArg2, this._version);
      }
    }
    if (handler != null) {
      handler({ ...handlerArg, parsed: result.data });
    }
    return result.data;
  }

  subcommand(command: Command): CommandParser {
    if (Object.keys(this._options).length > 0) {
      throw new Error("Cannot add subcommand to parser with options().");
    }
    if (Object.keys(this._positionalArgs).length > 0) {
      throw new Error("Cannot add subcommand to parser with args().");
    }
    return new CommandParser({
      ...this._currentState(),
    }).subcommand(command);
  }

  private _currentState(): ParserState {
    return {
      name: this._name,
      version: this._version,
      description: this._description,
      options: this._options,
      positionalArgs: this._positionalArgs,
      validation: this._validation,
      handler: this._handler,
    };
  }

  private _scriptName(): string {
    if (this._name !== undefined) {
      return this._name;
    }
    const pathName = process.argv[1];
    return path.basename(pathName);
  }
}

export function parser(): Parser {
  return new Parser();
}
