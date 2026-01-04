/**
 * Zod v3/v4 compatibility layer
 *
 * v3: Access schema definition via schema._def
 * v4: Access schema definition via schema._zod.def
 */

import type { ZodTypeAny } from "zod";

interface MaybeZod extends Record<string, unknown> {
  parse?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export interface SchemaDef extends Record<string, unknown> {
  typeName?: string;
  type?: string | ZodTypeAny;
  innerType?: ZodTypeAny;
  schema?: ZodTypeAny;
  inner?: ZodTypeAny;
  in?: ZodTypeAny;
  defaultValue?: unknown;
  options?: ZodTypeAny[];
  values?: unknown[];
  entries?: Record<string, unknown>;
  element?: unknown;
  description?: string;
}

export function isZodSchema(value: unknown): value is ZodTypeAny {
  if (!isRecord(value)) {
    return false;
  }
  const candidate = value as MaybeZod;
  return typeof candidate.parse === "function";
}

/**
 * Check if the schema is Zod v4
 * v4 has the "_zod" property
 */
export function isZodV4(schema: ZodTypeAny): boolean {
  return "_zod" in schema;
}

/**
 * Get the definition object from a schema
 * v3: schema._def
 * v4: schema._zod.def
 */
export function getDef(schema: ZodTypeAny): SchemaDef {
  if (isZodV4(schema)) {
    return (schema as { _zod: { def: SchemaDef } })._zod.def;
  }
  return (schema as { _def: SchemaDef })._def;
}

// Type name mapping between v3 and v4
const V3_TO_V4_TYPE_MAP: Record<string, string> = {
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
};

/**
 * Get the type name of a schema (returns v3 format)
 * v3: def.typeName (e.g., "ZodString")
 * v4: def.type (e.g., "string") -> converted to v3 format
 */
export function getTypeName(schema: ZodTypeAny): string {
  const def = getDef(schema);
  if (isZodV4(schema)) {
    const v4Type = def.type ?? "";
    // Convert v4 type name to v3 type name
    const v3Type = Object.entries(V3_TO_V4_TYPE_MAP).find(
      ([, v4]) => v4 === v4Type
    )?.[0];
    return v3Type ?? v4Type;
  }
  return def.typeName ?? "";
}

/**
 * Get the inner type definition from a schema that has innerType
 */
export function getInnerTypeDef(schema: ZodTypeAny): SchemaDef | undefined {
  const def = getDef(schema);

  if (isZodSchema(def.innerType)) {
    return getDef(def.innerType);
  }

  if (isZodSchema(def.schema)) {
    return getDef(def.schema);
  }

  if (isZodSchema(def.inner)) {
    return getDef(def.inner);
  }

  if (isZodSchema(def.in)) {
    return getDef(def.in);
  }

  return undefined;
}

/**
 * Get the inner type from a schema that has innerType
 */
export function getInnerType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema);

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

/**
 * Get the default value from a schema
 * v3: defaultValue is a function
 * v4: defaultValue is a direct value
 */
export function getDefaultValue(schema: ZodTypeAny): unknown {
  const def = getDef(schema);
  if ("defaultValue" in def) {
    if (typeof def.defaultValue === "function") {
      return def.defaultValue();
    }
    return def.defaultValue;
  }
  return undefined;
}

/**
 * Get union options from a union schema
 */
export function getUnionOptions(schema: ZodTypeAny): ZodTypeAny[] {
  const def = getDef(schema);
  if (Array.isArray(def.options)) {
    return def.options.filter((option): option is ZodTypeAny =>
      isZodSchema(option)
    );
  }
  return [];
}

/**
 * Get enum values from an enum schema
 */
export function getEnumValues(schema: ZodTypeAny): string[] | undefined {
  const def = getDef(schema);
  if (
    Array.isArray(def.values) &&
    def.values.every((value) => typeof value === "string")
  ) {
    return def.values as string[];
  }
  // v4 may use entries property
  if (isRecord(def.entries)) {
    return Object.keys(def.entries);
  }
  return undefined;
}

/**
 * Get the element type from an array schema
 */
export function getArrayElementType(
  schema: ZodTypeAny
): ZodTypeAny | undefined {
  const def = getDef(schema);
  // v3: ZodArrayDef.type
  if (!isZodV4(schema) && isZodSchema(def.type)) {
    return def.type;
  }
  // v4: element property
  if (isZodSchema(def.element)) {
    return def.element;
  }
  return undefined;
}

/**
 * Get the description from a schema
 */
export function getDescription(schema: ZodTypeAny): string | undefined {
  // First check the schema's own description
  if ("description" in schema && typeof schema.description === "string") {
    return schema.description;
  }
  // Also check description in def
  const def = getDef(schema);
  if ("description" in def && typeof def.description === "string") {
    return def.description;
  }
  return undefined;
}
