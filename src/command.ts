import { type z, type ZodObject, type ZodRawShape } from "zod";

import * as helper from "./parser_helper";
import type {
  GenerateZodShape,
  Handler,
  InternalCommand,
  Narrow,
  Options,
  PositionalArguments,
  ValidateCallback,
} from "./type";
import * as util from "./util";

type ActionCallback<T extends ZodRawShape> = (
  parsed: z.infer<ZodObject<T>>
) => true | string;

interface CommandState {
  name?: string;
  description?: string;
  options: Options;
  positionalArgs: PositionalArguments;
  validation?: ValidateCallback<ZodRawShape>;
  handler?: Handler<ZodRawShape>;
  action?: ActionCallback<ZodRawShape>;
}

export class Command<
  TOptions extends Options = {},
  TPositionalArguments extends PositionalArguments = []
> {
  private readonly _name: string | undefined;
  private _description: string | undefined;
  private readonly _options: Options = {};
  private readonly _positionalArgs: PositionalArguments = [];
  private _validation: ValidateCallback<ZodRawShape> | undefined;
  private readonly _handler: Handler<ZodRawShape> | undefined;
  private _action: ActionCallback<ZodRawShape> | undefined;

  constructor({
    name,
    description,
    options,
    positionalArgs,
    validation,
    handler,
    action,
  }: {
    name?: string;
    description?: string;
    options?: Options;
    positionalArgs?: Narrow<PositionalArguments>;
    validation?: ValidateCallback<ZodRawShape>;
    handler?: Handler<ZodRawShape>;
    action?: ActionCallback<ZodRawShape>;
  } = {}) {
    this._name = name;
    this._description = description;
    if (options !== undefined) {
      this._options = options;
    }
    if (positionalArgs !== undefined) {
      this._positionalArgs = positionalArgs;
    }
    this._validation = validation;
    this._handler = handler;
    this._action = action;
  }

  description(description: string): Command<TOptions, TPositionalArguments> {
    this._description = description;
    return this;
  }

  options<TNewOptions extends Options>(
    options: TNewOptions
  ): Command<TNewOptions, TPositionalArguments> {
    util.validateParamOptionsAndPositionalArguments(
      options,
      this._positionalArgs
    );
    return new Command<TNewOptions, TPositionalArguments>({
      ...this._currentState(),
      options,
    });
  }

  args<TNewPositionalArguments extends PositionalArguments>(
    positionalArgs: Narrow<TNewPositionalArguments>
  ): Command<TOptions, TNewPositionalArguments> {
    util.validateParamOptionsAndPositionalArguments(
      this._options,
      positionalArgs as TNewPositionalArguments
    );
    return new Command<TOptions, TNewPositionalArguments>({
      ...this._currentState(),
      positionalArgs: positionalArgs as TNewPositionalArguments,
    });
  }

  validation<TShape extends GenerateZodShape<TOptions, TPositionalArguments>>(
    validation: (parsed: z.infer<ZodObject<TShape>>) => true | string
  ): Command<TOptions, TPositionalArguments> {
    this._validation = validation as ValidateCallback<ZodRawShape>;
    return this;
  }

  action<TShape extends GenerateZodShape<TOptions, TPositionalArguments>>(
    action: (parsed: z.infer<ZodObject<TShape>>) => void
  ): Command<TOptions, TPositionalArguments> {
    this._action = action as ActionCallback<ZodRawShape>;
    return this;
  }

  toInternalCommand(): InternalCommand {
    this._validateMultipleCommands();
    return {
      name: this._name as string,
      description: this._description,
      options: helper.generateInternalOptions(this._options),
      positionalArgs: helper.generateInternalPositionalArguments(
        this._positionalArgs
      ),
    };
  }

  private _currentState(): CommandState {
    return {
      name: this._name,
      description: this._description,
      options: this._options,
      positionalArgs: this._positionalArgs,
      validation: this._validation,
      handler: this._handler,
      action: this._action,
    };
  }

  private _validateMultipleCommands(): void {
    if (this._action === undefined) {
      throw new Error("action is required for command");
    }
  }

  _toParseCommand(): {
    shape: ZodRawShape;
    internalCommand: InternalCommand;
    action: ActionCallback<ZodRawShape>;
    validation?: ValidateCallback<ZodRawShape>;
  } {
    this._validateMultipleCommands();

    const shape = helper.generateZodShape(this._options, this._positionalArgs);

    return {
      shape,
      internalCommand: this.toInternalCommand(),
      action: this._action as ActionCallback<ZodRawShape>,
      validation: this._validation,
    };
  }
}

export function command(name: string): Command {
  return new Command({ name });
}
