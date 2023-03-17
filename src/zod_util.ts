import { type ZodArrayDef, ZodFirstPartyTypeKind, type ZodUnionDef } from "zod";

import type {
  BaseType,
  BaseTypeT,
  InternalOption,
  InternalPositionalArg,
  Option,
  PositionalArg,
  ZodDef,
} from "./type";
import { BASE_TYPES } from "./type";
import { uniq } from "./util";

export function getDefaultValue(
  def: ZodDef
): string[] | number[] | BaseTypeT | undefined {
  const defaultValue = "defaultValue" in def ? def.defaultValue() : undefined;
  if (
    ![...BASE_TYPES, "undefined"].includes(typeof defaultValue) &&
    !Array.isArray(defaultValue)
  ) {
    throw new Error(
      `Unsupported default value: ${JSON.stringify(defaultValue)}`
    );
  }
  if (Array.isArray(defaultValue)) {
    if (defaultValue.length === 0) {
      return defaultValue;
    }
    if (!["string", "number"].includes(typeof defaultValue[0])) {
      throw new Error(
        `Unsupported default value: ${JSON.stringify(defaultValue)}`
      );
    }
    if (uniq(defaultValue.map((v) => typeof v)).length > 1) {
      throw new Error(
        `Unsupported default value: ${JSON.stringify(defaultValue)}`
      );
    }
  }
  return defaultValue;
}

function isZodOptional(def: ZodDef): boolean {
  if (def.typeName === ZodFirstPartyTypeKind.ZodOptional) {
    return true;
  }
  if ("innerType" in def) {
    return isZodOptional(def.innerType._def);
  }
  return false;
}

function isRequired(def: ZodDef): boolean {
  if (isZodOptional(def)) {
    return false;
  }
  const defaultValue = getDefaultValue(def);
  if (defaultValue !== undefined) {
    return false;
  }

  if (def.typeName === ZodFirstPartyTypeKind.ZodUnion) {
    return !def.options.some((option) => {
      console.log("required", isRequired(option._def));
      return !isRequired(option._def);
    });
  }

  return true;
}

function solveInnerType(def: ZodDef): ZodDef {
  if (
    [
      ZodFirstPartyTypeKind.ZodOptional,
      ZodFirstPartyTypeKind.ZodDefault,
    ].includes(def.typeName)
  ) {
    const innerDef = "innerType" in def ? def.innerType._def : def;
    return solveInnerType(innerDef);
  }
  if (def.typeName === "ZodEffects") {
    return solveInnerType(def.schema._def);
  }
  return def;
}

export function toInternalType(
  def: ZodDef,
  isPositional: boolean = false
): BaseType {
  const solvedDef: ZodDef = solveInnerType(def);
  switch (solvedDef.typeName) {
    case ZodFirstPartyTypeKind.ZodNumber:
      return "number";
    case ZodFirstPartyTypeKind.ZodString:
      return "string";
    case ZodFirstPartyTypeKind.ZodBoolean:
      if (isPositional) {
        throw new Error(
          `Unsupported zod type (Positional options): ${solvedDef.typeName}`
        );
      }
      return "boolean";
    case ZodFirstPartyTypeKind.ZodEnum:
      return "string";
    case ZodFirstPartyTypeKind.ZodUnion:
      return toInternalTypeForZodUnion(solvedDef);
    case ZodFirstPartyTypeKind.ZodArray:
      if (!isPositional) {
        throw new Error(
          `Unsupported zod type (Options): ${solvedDef.typeName}`
        );
      }
      return toInternalTypeForZodArray(solvedDef);
    default:
      throw new Error(`Unsupported zod type: ${solvedDef.typeName}`);
  }
}

export function toInternalTypeForZodUnion(def: ZodUnionDef): BaseType {
  const types = uniq(
    def.options.flatMap((option) => {
      return [toInternalType(option._def)];
    })
  );
  if (types.length !== 1) {
    throw new Error("Union types are not same");
  }
  return types[0];
}

function toInternalTypeForZodArray(def: ZodArrayDef): BaseType {
  switch (def.type._def.typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return "string";
    case ZodFirstPartyTypeKind.ZodNumber:
      return "number";
    default:
      throw new Error(
        `Unsupported zod type: Array of ${def.type._def.typeName as string}`
      );
  }
}

function getEnumValues(def: ZodDef): string[] | undefined {
  const solvedDef: ZodDef = solveInnerType(def);
  if (solvedDef.typeName !== ZodFirstPartyTypeKind.ZodEnum) {
    return undefined;
  }
  return solvedDef.values;
}

export function optionToInternal(option: Option, name: string): InternalOption {
  const zodType = option.type;
  const def: ZodDef = zodType._def;
  const defaultValue = getDefaultValue(def) as string | number | undefined;
  const internalType = toInternalType(def);
  const description =
    option.description ??
    ("description" in zodType ? zodType.description : undefined);
  const enumValues = getEnumValues(def);

  return {
    type: internalType,
    name,
    alias: option.alias,
    argName: option.argName,
    description,
    required: isRequired(def),
    defaultValue,
    enumValues,
  };
}

export function positionalArgToInternal(
  option: PositionalArg
): InternalPositionalArg {
  const zodType = option.type;
  const def: ZodDef = zodType._def;
  const defaultValue = getDefaultValue(def) as
    | string[]
    | number[]
    | string
    | number
    | undefined;
  const internalType = toInternalType(def, true) as "string" | "number";
  const description =
    option.description ??
    ("description" in zodType ? zodType.description : undefined);
  const enumValues = getEnumValues(def);

  return {
    type: internalType,
    name: option.name,
    description,
    required: isRequired(def),
    isArray: def.typeName === "ZodArray",
    defaultValue,
    enumValues,
  };
}
