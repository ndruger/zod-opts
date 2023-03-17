import { type z, type ZodObject, type ZodRawShape } from "zod";

import * as helper from "./parser_helper";
import type {
  GenerateZodShape,
  Handler,
  InternalCommand,
  Narrow,
  Options,
  PositionalArgs,
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
  positionalArgs: PositionalArgs;
  validation?: ValidateCallback<ZodRawShape>;
  handler?: Handler<ZodRawShape>;
  action?: ActionCallback<ZodRawShape>;
}

export class Command<
  TOptions extends Options = {},
  TPositionalArgs extends PositionalArgs = []
> {
  private readonly _name: string | undefined;
  private _description: string | undefined;
  private readonly _options: Options = {};
  private readonly _positionalArgs: PositionalArgs = [];
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
    positionalArgs?: Narrow<PositionalArgs>;
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

  description(description: string): Command<TOptions, TPositionalArgs> {
    this._description = description;
    return this;
  }

  options<TNewOptions extends Options>(
    options: TNewOptions
  ): Command<TNewOptions, TPositionalArgs> {
    util.validateParamOptionsAndPositionalArgs(options, this._positionalArgs);
    return new Command<TNewOptions, TPositionalArgs>({
      ...this._currentState(),
      options,
    });
  }

  args<TNewPositionalArgs extends PositionalArgs>(
    positionalArgs: Narrow<TNewPositionalArgs>
  ): Command<TOptions, TNewPositionalArgs> {
    util.validateParamOptionsAndPositionalArgs(
      this._options,
      positionalArgs as TNewPositionalArgs
    );
    return new Command<TOptions, TNewPositionalArgs>({
      ...this._currentState(),
      positionalArgs: positionalArgs as TNewPositionalArgs,
    });
  }

  validation<TShape extends GenerateZodShape<TOptions, TPositionalArgs>>(
    validation: (parsed: z.infer<ZodObject<TShape>>) => true | string
  ): Command<TOptions, TPositionalArgs> {
    this._validation = validation as ValidateCallback<ZodRawShape>;
    return this;
  }

  action<TShape extends GenerateZodShape<TOptions, TPositionalArgs>>(
    action: (parsed: z.infer<ZodObject<TShape>>) => void
  ): Command<TOptions, TPositionalArgs> {
    this._action = action as ActionCallback<ZodRawShape>;
    return this;
  }

  toInternalCommand(): InternalCommand {
    this._validateMultiCommand();
    return {
      name: this._name as string,
      description: this._description,
      options: helper.generateInternalOptions(this._options),
      positionalArgs: helper.generateInternalPositionalArgs(
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

  private _validateMultiCommand(): void {
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
    this._validateMultiCommand();

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
