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
  PositionalArguments,
  ValidateCallback,
} from "./type";
import * as util from "./util";

interface ParserState {
  name?: string;
  version?: string;
  description?: string;
  options: Options;
  positionalArgs: PositionalArguments;
  validation?: ValidateCallback<ZodRawShape>;
  handler?: Handler<ZodRawShape>;
}

export class Parser<
  TOptions extends Options = {},
  TPositionalArguments extends PositionalArguments = []
> {
  private _name: string | undefined;
  private _version: string | undefined;
  private _description: string | undefined;
  private readonly _options: Options = {};
  private readonly _positionalArgs: PositionalArguments = [];
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
    positionalArgs?: Narrow<PositionalArguments>;
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

  name(name: string): Parser<TOptions, TPositionalArguments> {
    this._name = name;
    return this;
  }

  version(version: string): Parser<TOptions, TPositionalArguments> {
    this._version = version;
    return this;
  }

  description(description: string): Parser<TOptions, TPositionalArguments> {
    this._description = description;
    return this;
  }

  options<TNewOptions extends Options>(
    options: TNewOptions
  ): Parser<TNewOptions, TPositionalArguments> {
    util.validateParamOptionsAndPositionalArguments(
      options,
      this._positionalArgs
    );
    return new Parser<TNewOptions, TPositionalArguments>({
      ...this._currentState(),
      options,
    });
  }

  args<TNewPositionalArguments extends PositionalArguments>(
    positionalArgs: Narrow<TNewPositionalArguments>
  ): Parser<TOptions, TNewPositionalArguments> {
    util.validateParamOptionsAndPositionalArguments(
      this._options,
      positionalArgs as TNewPositionalArguments
    );
    return new Parser<TOptions, TNewPositionalArguments>({
      ...this._currentState(),
      positionalArgs: positionalArgs as TNewPositionalArguments,
    });
  }

  _internalHandler<
    TShape extends GenerateZodShape<TOptions, TPositionalArguments>
  >(
    handler: (
      arg0:
        | ParseResultMatch<z.infer<ZodObject<TShape>>>
        | ParseResultError
        | ParseResultHelp
        | ParseResultVersion
    ) => void
  ): Parser<TOptions, TPositionalArguments> {
    this._handler = handler as Handler<ZodRawShape>;
    return this;
  }

  validation<TShape extends GenerateZodShape<TOptions, TPositionalArguments>>(
    validation: (parsed: z.infer<ZodObject<TShape>>) => true | string
  ): Parser<TOptions, TPositionalArguments> {
    this._validation = validation as ValidateCallback<ZodRawShape>;
    return this;
  }

  showHelp(): void {
    const help = this.getHelp();
    console.log(help); // eslint-disable-line no-console
  }

  getHelp(): string {
    const internalOptions = helper.generateInternalOptions(this._options);
    const internalPositionalArguments =
      helper.generateInternalPositionalArguments(this._positionalArgs);

    return generateGlobalHelp({
      options: internalOptions,
      positionalArgs: internalPositionalArguments,
      name: this._scriptName(),
      description: this._description,
      version: this._version,
    });
  }

  parse(
    args?: string[]
  ): z.infer<ZodObject<GenerateZodShape<TOptions, TPositionalArguments>>> {
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
    ) as GenerateZodShape<TOptions, TPositionalArguments>;

    const handlerArg = helper.createInternalParserAndParse({
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
