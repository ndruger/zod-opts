import { z } from "zod";

import {
  getArrayElementType,
  getDef,
  getDefaultValue,
  getDescription,
  getEnumValues,
  getInnerType,
  getTypeName,
  getUnionOptions,
  isZodV4,
} from "../src/compat";

describe("Zod Compatibility Layer", () => {
  describe("isZodV4", () => {
    test("detects Zod version", () => {
      const schema = z.string();
      const isV4 = isZodV4(schema);
      // Returns true/false depending on the version
      expect(typeof isV4).toBe("boolean");
    });

    test("detects v4-style _def shape", () => {
      const fakeV4 = {
        parse() {
          return "ok";
        },
        _def: {
          type: "string",
          description: "fake v4",
        },
      };
      expect(isZodV4(fakeV4 as unknown as z.ZodTypeAny)).toBe(true);
    });
  });

  describe("getDef", () => {
    test("returns definition for string schema", () => {
      const schema = z.string();
      const def = getDef(schema);
      expect(def).toBeDefined();
    });

    test("returns definition for number schema", () => {
      const schema = z.number();
      const def = getDef(schema);
      expect(def).toBeDefined();
    });

    test("returns definition for optional schema", () => {
      const schema = z.string().optional();
      const def = getDef(schema);
      expect(def).toBeDefined();
    });
  });

  describe("getTypeName", () => {
    test("returns type name for string schema", () => {
      const schema = z.string();
      const typeName = getTypeName(schema);
      // v3: "ZodString", v4: converted to "ZodString"
      expect(typeName).toBe("ZodString");
    });

    test("returns type name for number schema", () => {
      const schema = z.number();
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodNumber");
    });

    test("returns type name for boolean schema", () => {
      const schema = z.boolean();
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodBoolean");
    });

    test("returns type name for optional schema", () => {
      const schema = z.string().optional();
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodOptional");
    });

    test("returns type name for default schema", () => {
      const schema = z.string().default("test");
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodDefault");
    });

    test("returns type name for array schema", () => {
      const schema = z.array(z.string());
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodArray");
    });

    test("returns type name for enum schema", () => {
      const schema = z.enum(["a", "b", "c"]);
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodEnum");
    });

    test("returns type name for union schema", () => {
      const schema = z.union([z.string(), z.string()]);
      const typeName = getTypeName(schema);
      expect(typeName).toBe("ZodUnion");
    });
  });

  describe("getInnerType", () => {
    test("returns inner type for optional schema", () => {
      const schema = z.string().optional();
      const innerType = getInnerType(schema);
      expect(innerType).toBeDefined();
      if (innerType != null) {
        const typeName = getTypeName(innerType);
        expect(typeName).toBe("ZodString");
      }
    });

    test("returns inner type for default schema", () => {
      const schema = z.string().default("test");
      const innerType = getInnerType(schema);
      expect(innerType).toBeDefined();
      if (innerType != null) {
        const typeName = getTypeName(innerType);
        expect(typeName).toBe("ZodString");
      }
    });

    test("returns undefined for primitive schema", () => {
      const schema = z.string();
      const innerType = getInnerType(schema);
      expect(innerType).toBeUndefined();
    });
  });

  describe("getDefaultValue", () => {
    test("returns default value for default schema", () => {
      const schema = z.string().default("test");
      const defaultValue = getDefaultValue(schema);
      expect(defaultValue).toBe("test");
    });

    test("returns undefined for non-default schema", () => {
      const schema = z.string();
      const defaultValue = getDefaultValue(schema);
      expect(defaultValue).toBeUndefined();
    });

    test("returns default value for number default", () => {
      const schema = z.number().default(42);
      const defaultValue = getDefaultValue(schema);
      expect(defaultValue).toBe(42);
    });
  });

  describe("getUnionOptions", () => {
    test("returns options for union schema", () => {
      const schema = z.union([z.string(), z.number()]);
      const options = getUnionOptions(schema);
      expect(options).toHaveLength(2);
    });

    test("returns empty array for non-union schema", () => {
      const schema = z.string();
      const options = getUnionOptions(schema);
      expect(options).toHaveLength(0);
    });
  });

  describe("getEnumValues", () => {
    test("returns values for enum schema", () => {
      const schema = z.enum(["a", "b", "c"]);
      const values = getEnumValues(schema);
      expect(values).toEqual(["a", "b", "c"]);
    });

    test("returns undefined for non-enum schema", () => {
      const schema = z.string();
      const values = getEnumValues(schema);
      expect(values).toBeUndefined();
    });
  });

  describe("getArrayElementType", () => {
    test("returns element type for array schema", () => {
      const schema = z.array(z.string());
      const elementType = getArrayElementType(schema);
      expect(elementType).toBeDefined();
      if (elementType != null) {
        const typeName = getTypeName(elementType);
        expect(typeName).toBe("ZodString");
      }
    });

    test("returns undefined for non-array schema", () => {
      const schema = z.string();
      const elementType = getArrayElementType(schema);
      expect(elementType).toBeUndefined();
    });
  });

  describe("getDescription", () => {
    test("returns description for schema with description", () => {
      const schema = z.string().describe("test description");
      const description = getDescription(schema);
      expect(description).toBe("test description");
    });

    test("returns undefined for schema without description", () => {
      const schema = z.string();
      const description = getDescription(schema);
      expect(description).toBeUndefined();
    });
  });
});
