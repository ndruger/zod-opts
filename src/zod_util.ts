import type { ZodTypeAny } from "zod";

import {
  getDef,
  getDescription,
  isRecord,
  isZodSchema,
  type SchemaDef,
} from "./compat";
import type {
  BaseType,
  BaseTypeT,
  InternalOption,
  InternalPositionalArgument,
  Option,
  PositionalArgument,
} from "./type";
import { BASE_TYPES } from "./type";
import { uniq } from "./util";

const TYPE_NAME_MAP: Record<string, string> = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBoolean: "boolean",
  ZodArray: "array",
  ZodObject: "object",
  ZodUnion: "union",
  ZodOptional: "optional",
  ZodDefault: "default",
  ZodEnum: "enum",
  ZodEffects: "effects",
  ZodPipeline: "pipe",
  ZodNullable: "nullable",
  ZodBranded: "branded",
  ZodPromise: "promise",
  ZodReadonly: "readonly",
};

function normalizeTypeName(typeName: string): string {
  return TYPE_NAME_MAP[typeName] ?? typeName;
}

function getTypeName(def: SchemaDef): string {
  const raw = typeof def.typeName === "string" ? def.typeName : def.type;
  return normalizeTypeName(typeof raw === "string" ? raw : "");
}

function getWrappedSchema(def: SchemaDef): ZodTypeAny | undefined {
  if (isZodSchema(def.innerType)) {
    return def.innerType;
  }
  if (isZodSchema(def.schema)) {
    return def.schema;
  }
  if (isZodSchema(def.inner)) {
    return def.inner;
  }
  if (isZodSchema(def.in)) {
    return def.in;
  }
  return undefined;
}

function getWrappedDef(def: SchemaDef): SchemaDef | undefined {
  const wrapped = getWrappedSchema(def);
  if (wrapped == null) {
    return undefined;
  }
  return getDef(wrapped);
}

export function getDefaultValue(
  def: SchemaDef
): string[] | number[] | BaseTypeT | undefined {
  const resolveDefault = (
    currentDef: unknown,
    blockedByOptional: boolean
  ): unknown => {
    if (currentDef == null || typeof currentDef !== "object") {
      return undefined;
    }
    const typedDef = currentDef as SchemaDef;
    const typeName = getTypeName(typedDef);
    const nextBlocked = blockedByOptional || typeName === "optional";
    if ("defaultValue" in typedDef) {
      if (nextBlocked) {
        return undefined;
      }
      const value = typedDef.defaultValue;
      if (typeof value === "function") {
        return value();
      }
      return value;
    }
    const next = getWrappedDef(typedDef);
    if (next == null) {
      return undefined;
    }
    return resolveDefault(next, nextBlocked);
  };

  const defaultValue = resolveDefault(def, false);
  const isPrimitive = [...BASE_TYPES, "undefined"].includes(
    typeof defaultValue
  );
  if (!isPrimitive && !Array.isArray(defaultValue)) {
    throw new Error(
      `Unsupported default value: ${JSON.stringify(defaultValue)}`
    );
  }
  if (Array.isArray(defaultValue)) {
    if (defaultValue.length === 0) {
      return defaultValue as string[] | number[];
    }
    const firstType = typeof defaultValue[0];
    if (!["string", "number"].includes(firstType)) {
      throw new Error(
        `Unsupported default value: ${JSON.stringify(defaultValue)}`
      );
    }
    if (uniq(defaultValue.map((value) => typeof value)).length > 1) {
      throw new Error(
        `Unsupported default value: ${JSON.stringify(defaultValue)}`
      );
    }
    return defaultValue as string[] | number[];
  }
  return defaultValue as BaseTypeT | undefined;
}

function isZodOptional(def: SchemaDef): boolean {
  let current: SchemaDef | undefined = def;
  while (current != null) {
    if (getTypeName(current) === "optional") {
      return true;
    }
    current = getWrappedDef(current);
  }
  return false;
}

function isRequired(def: SchemaDef): boolean {
  if (isZodOptional(def)) {
    return false;
  }
  if (getDefaultValue(def) !== undefined) {
    return false;
  }
  if (getTypeName(def) === "union") {
    const options = Array.isArray(def.options) ? def.options : [];
    return !options.some((option) => {
      if (!isZodSchema(option)) {
        return false;
      }
      return !isRequired(getDef(option));
    });
  }
  return true;
}

function resolveInnerType(def: SchemaDef): SchemaDef {
  let current: SchemaDef = def;
  while (true) {
    const typeName = getTypeName(current);
    if (["optional", "default"].includes(typeName)) {
      const next = getWrappedDef(current);
      if (next == null) {
        return current;
      }
      current = next;
      continue;
    }
    if (
      [
        "effects",
        "pipe",
        "branded",
        "nullable",
        "promise",
        "readonly",
      ].includes(typeName)
    ) {
      const next = getWrappedDef(current);
      if (next == null) {
        return current;
      }
      current = next;
      continue;
    }
    return current;
  }
}

export function toInternalType(
  def: SchemaDef,
  isPositional: boolean = false
): BaseType {
  const solvedDef = resolveInnerType(def);
  const typeName = getTypeName(solvedDef);

  switch (typeName) {
    case "number":
      return "number";
    case "string":
      return "string";
    case "boolean":
      if (isPositional) {
        throw new Error(
          `Unsupported zod type (positional argument): ${typeName}`
        );
      }
      return "boolean";
    case "enum":
      return "string";
    case "union":
      return toInternalTypeForZodUnion(solvedDef);
    case "array":
      return toInternalTypeForZodArray(solvedDef);
    default:
      throw new Error(`Unsupported zod type: ${typeName}`);
  }
}

export function toInternalTypeForZodUnion(def: SchemaDef): BaseType {
  const options = Array.isArray(def.options) ? def.options : [];
  const types: BaseType[] = uniq(
    options.flatMap((option) => {
      if (!isZodSchema(option)) {
        return [];
      }
      return [toInternalType(getDef(option))];
    })
  );
  if (types.length !== 1) {
    throw new Error("Union types are not same");
  }
  return types[0];
}

function toInternalTypeForZodArray(def: SchemaDef): BaseType {
  const elementSchema = isZodSchema(def.element)
    ? def.element
    : isZodSchema(def.type)
    ? def.type
    : undefined;
  if (elementSchema == null) {
    throw new Error("Array element type not found");
  }
  const elementDef = getDef(elementSchema);
  const typeName = getTypeName(elementDef);
  switch (typeName) {
    case "string":
      return "string";
    case "number":
      return "number";
    default:
      throw new Error(`Unsupported zod type: Array of ${typeName}`);
  }
}

function getEnumValues(def: SchemaDef): string[] | undefined {
  const solvedDef = resolveInnerType(def);
  if (getTypeName(solvedDef) !== "enum") {
    return undefined;
  }
  if (
    Array.isArray(solvedDef.values) &&
    solvedDef.values.every((value) => typeof value === "string")
  ) {
    return solvedDef.values as string[];
  }
  if (isRecord(solvedDef.entries)) {
    return Object.keys(solvedDef.entries);
  }
  return undefined;
}

export function optionToInternal(option: Option, name: string): InternalOption {
  const zodType = option.type;
  const def = getDef(zodType);
  const defaultValue = getDefaultValue(def) as
    | string
    | number
    | string[]
    | number[]
    | undefined;
  const internalType = toInternalType(def);
  const resolvedDef = resolveInnerType(def);
  const resolvedTypeName = getTypeName(resolvedDef);
  const description = option.description ?? getDescription(zodType);
  const enumValues = getEnumValues(def);

  return {
    type: internalType,
    name,
    alias: option.alias,
    argumentName: option.argumentName,
    description,
    required: isRequired(def),
    isArray: resolvedTypeName === "array",
    defaultValue,
    enumValues,
  };
}

export function positionalArgumentToInternal(
  option: PositionalArgument
): InternalPositionalArgument {
  const zodType = option.type;
  const def = getDef(zodType);
  const defaultValue = getDefaultValue(def) as
    | string
    | number
    | string[]
    | number[]
    | undefined;
  const internalType = toInternalType(def, true) as "string" | "number";
  const resolvedDef = resolveInnerType(def);
  const resolvedTypeName = getTypeName(resolvedDef);
  const description = option.description ?? getDescription(zodType);
  const enumValues = getEnumValues(def);

  return {
    type: internalType,
    name: option.name,
    description,
    required: isRequired(def),
    isArray: resolvedTypeName === "array",
    defaultValue,
    enumValues,
  };
}
