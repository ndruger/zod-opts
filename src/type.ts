import {
  type z,
  type ZodArrayDef,
  type ZodBooleanDef,
  type ZodDefaultDef,
  type ZodEffectsDef,
  type ZodEnumDef,
  type ZodNumberDef,
  type ZodObject,
  type ZodOptionalDef,
  type ZodRawShape,
  type ZodStringDef,
  type ZodType,
  type ZodTypeAny,
  type ZodUnionDef,
} from "zod";

export type ZodDef =
  | ZodNumberDef
  | ZodStringDef
  | ZodUnionDef
  | ZodBooleanDef
  | ZodEnumDef
  | ZodArrayDef
  | ZodOptionalDef
  | ZodDefaultDef
  | ZodEffectsDef;

export const BASE_TYPES = ["number", "string", "boolean"] as const;
export type BaseType = (typeof BASE_TYPES)[number];
export type BaseTypeT = number | string | boolean;

export interface Option {
  type: ZodTypeAny;
  argName?: string;
  alias?: string;
  description?: string;
}

export type Options = Record<string, Option>;

export interface PositionalArg {
  name: string;
  type: ZodTypeAny;
  description?: string;
}

export type PositionalArgs = [] | [PositionalArg, ...PositionalArg[]];

export type OptionsToZodShape<T extends Options> = {
  [Key in keyof T]: T[Key]["type"];
};

export type PositionalArgsToShape<T, TAcc = {}> = T extends [
  infer Head,
  ...infer Rest
]
  ? Head extends {
      name: infer Name;
      type: infer ZodType;
    }
    ? Name extends string
      ? PositionalArgsToShape<
          Rest,
          {
            // eslint-disable-next-line no-unused-vars
            [Key in Name]: ZodType;
          } & TAcc
        >
      : TAcc
    : TAcc
  : TAcc;

export type GenerateZodShape<TOptions, TPositionalArgs> =
  (TOptions extends Options ? OptionsToZodShape<TOptions> : {}) &
    (TPositionalArgs extends PositionalArgs
      ? PositionalArgsToShape<TPositionalArgs>
      : {});

export interface ParseResultMatch<T> {
  type: "match";
  parsed: T;
  help: string;
  commandName?: string;
}

export interface ParseResultError {
  type: "error";
  error: Error;
  help: string;
  exitCode: 1;
  commandName?: string;
}

export interface ParseResultHelp {
  type: "help";
  help: string;
  exitCode: 0;
  commandName?: string;
}

export interface ParseResultVersion {
  type: "version";
  help: string;
  exitCode: 0;
}

export type ParseResult<T> =
  | ParseResultMatch<T>
  | ParseResultError
  | ParseResultHelp
  | ParseResultVersion;

export interface InternalOption {
  type: BaseType;
  name: string; // ex. opt1
  alias?: string; // ex. o, ab
  argName?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required: boolean;
  enumValues?: string[];
}

export interface InternalPositionalArg {
  type: "string" | "number";
  name: string;
  description?: string;
  required: boolean;
  isArray: boolean;
  defaultValue?: string | number | string[] | number[];
  enumValues?: string[];
}

export interface InternalCommand {
  name: string;
  description?: string;
  options: InternalOption[];
  positionalArgs: InternalPositionalArg[];
}

export type Handler<T extends ZodRawShape> = (
  arg0:
    | ParseResultMatch<z.infer<ZodObject<T>>>
    | ParseResultError
    | ParseResultHelp
    | ParseResultVersion
) => void;

export type ValidateCallback<T extends ZodRawShape> = (
  parsed: z.infer<ZodObject<T>>
) => true | string;

export interface FormatValidOption {
  name: string;
  value: string | number | boolean | undefined; // undefined of non required(optional / default)
}

export interface FormatValidPositionalArg {
  name: string;
  value: string | number | string[] | number[] | undefined; // undefined of non required(optional / default)
}

// The following great Narrow type is from zodios(https://github.com/ecyrbe/zodios)

type Try<A, B, C> = A extends B ? A : C;

type NarrowRaw<T> =
  | (T extends Function ? T : never) // eslint-disable-line @typescript-eslint/ban-types
  | (T extends string | number | bigint | boolean ? T : never)
  | (T extends [] ? [] : never)
  | {
      // eslint-disable-next-line no-use-before-define
      [K in keyof T]: K extends "description" ? T[K] : NarrowNotZod<T[K]>;
    };

type NarrowNotZod<T> = Try<T, ZodType, NarrowRaw<T>>;

/**
 * Utility to infer the embedded primitive type of any type
 * Same as `as const` but without setting the object as readonly and without needing the user to use it
 * @param T - type to infer the embedded type of
 * @see - thank you tannerlinsley for this idea
 */
export type Narrow<T> = Try<T, [], NarrowNotZod<T>>;
