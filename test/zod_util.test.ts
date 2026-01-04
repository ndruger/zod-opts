import { z } from "zod";

import { isZodV4 } from "../src/compat";
import type { Option, PositionalArgument } from "../src/type";
import {
  optionToInternal,
  positionalArgumentToInternal,
} from "../src/zod_util";

function makeFakeSchema(def: Record<string, unknown>): z.ZodTypeAny {
  return {
    parse() {
      return undefined;
    },
    _def: def,
  } as unknown as z.ZodTypeAny;
}

export function createOption({
  type = z.string(),
  alias = "a",
  description = "description1",
}: {
  type?: z.ZodTypeAny;
  alias?: string;
  description?: string;
}): Option {
  return { type, alias, description };
}

export function createPositionalArg({
  type = z.string(),
  name = "pos1",
  description = "description1",
}: {
  type?: z.ZodTypeAny;
  name?: string;
  description?: string;
}): PositionalArgument {
  return { type, name, description };
}

describe("optionToInternal()", () => {
  describe("string", () => {
    test("common", () => {
      expect(
        optionToInternal(
          {
            type: z
              .string()
              .describe("zod_description")
              .regex(/^[0-9A-Za-z].+$/),
            alias: "a",
            description: "description1",
          },
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        isArray: false,
      });
    });

    test("default", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.string().default("default"),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: "default",
        isArray: false,
      });
    });
    test("optional", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.string().optional(),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        isArray: false,
      });
    });
    test("optional with default", () => {
      const hasV4Default = isZodV4(z.string().default("default"));

      const expectedOptionalDefault = {
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false, // stay optional even when default is present (matches safeParse)
        ...(hasV4Default ? { defaultValue: "default" } : {}),
        isArray: false,
      } as const;

      expect(
        optionToInternal(
          createOption({
            type: z.string().default("default").optional(),
          }),
          "name1"
        )
      ).toEqual(expectedOptionalDefault);

      expect(
        optionToInternal(
          createOption({
            type: z.optional(z.string().default("default")),
          }),
          "name1"
        )
      ).toEqual(expectedOptionalDefault);

      expect(
        optionToInternal(
          createOption({
            type: z.string().optional().default("default"),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: "default",
        isArray: false,
      });
    });

    test("refine", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.string().refine(() => true),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        isArray: false,
      });
    });

    test("refine & default", () => {
      expect(
        optionToInternal(
          createOption({
            type: z
              .string()
              .refine(() => true)
              .default("default"),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: "default",
        isArray: false,
      });
    });

    test("refine & optional", () => {
      expect(
        optionToInternal(
          createOption({
            type: z
              .string()
              .refine(() => true)
              .optional(),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        isArray: false,
      });
    });

    test("transform", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.string().transform((value) => value.toUpperCase()),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        isArray: false,
      });
    });

    test("pipe", () => {
      expect(
        optionToInternal(
          createOption({
            type: z
              .string()
              .pipe(z.string().transform((value) => value.trim())),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        isArray: false,
      });
    });
  });

  describe("number", () => {
    test("", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.number().max(256),
          }),
          "name1"
        )
      ).toEqual({
        type: "number",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        defaultValue: undefined,
        isArray: false,
      });
    });
    test("default", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.number().max(256).default(10),
          }),
          "name1"
        )
      ).toEqual({
        type: "number",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: 10,
        isArray: false,
      });
    });
  });

  describe("boolean", () => {
    test("", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.boolean(),
          }),
          "name1"
        )
      ).toEqual({
        type: "boolean",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        defaultValue: undefined,
        isArray: false,
      });
    });
  });

  describe("enum", () => {
    test("common", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.enum(["a", "b", "c"]),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        defaultValue: undefined,
        enumValues: ["a", "b", "c"],
        isArray: false,
      });
    });
    test("default", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.enum(["a", "b", "c"]).default("b"),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: "b",
        enumValues: ["a", "b", "c"],
        isArray: false,
      });
    });

    test("optional", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.enum(["a", "b", "c"]).optional(),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: undefined,
        enumValues: ["a", "b", "c"],
        isArray: false,
      });
    });

    test("define and default", () => {
      expect(
        optionToInternal(
          createOption({
            type: z
              .enum(["a", "b", "c"])
              .refine(() => true)
              .default("b"),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: "b",
        enumValues: ["a", "b", "c"],
        isArray: false,
      });
    });
  });

  describe("union", () => {
    test("string", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.union([z.string(), z.string()]),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        defaultValue: undefined,
        isArray: false,
      });
    });

    test("number", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.union([z.number(), z.number().max(256)]),
          }),
          "name1"
        )
      ).toEqual({
        type: "number",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        default: undefined,
        isArray: false,
      });
    });

    test("boolean", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.union([z.boolean(), z.boolean()]),
          }),
          "name1"
        )
      ).toEqual({
        type: "boolean",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        isArray: false,
      });
    });

    test("is not required when some elements have default value", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.union([z.string(), z.string().default("default1")]),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: undefined,
        isArray: false,
      });
    });

    test("is not required when some element are optional", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.union([z.string(), z.string().optional()]),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: undefined,
        isArray: false,
      });
    });

    test("refine union of refine element", () => {
      const result = optionToInternal(
        createOption({
          type: z
            .union([z.boolean().refine(() => true), z.boolean().default(true)])
            .refine(() => true),
        }),
        "name1"
      );
      expect(result.type).toBe("boolean");
      expect(result.name).toBe("name1");
      expect(result.alias).toBe("a");
      expect(result.description).toBe("description1");
      expect(result.isArray).toBe(false);
      // v3: required=true (default in union doesn't make it optional)
      // v4: required=false (union containing default(true) makes it optional)
      const expectedRequired = !isZodV4(z.string());
      expect(result.required).toBe(expectedRequired);
    });
  });

  describe("array", () => {
    test("default array option", () => {
      expect(
        optionToInternal(
          createOption({
            type: z.array(z.string()).default([]),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false,
        defaultValue: [],
        isArray: true,
      });
    });

    test("array with transform", () => {
      expect(
        optionToInternal(
          createOption({
            type: z
              .array(z.string())
              .transform((items) => items.map((item) => item.trim())),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        defaultValue: undefined,
        isArray: true,
      });
    });

    test("throws when element type is missing", () => {
      const fakeArray = makeFakeSchema({ typeName: "ZodArray" });
      expect(() =>
        optionToInternal({ type: fakeArray, alias: "a" }, "name1")
      ).toThrow(new Error("Array element type not found"));
    });
  });

  describe("throw runtime error on unsupported default value", () => {
    test("invalid type", () => {
      expect(() => {
        optionToInternal(
          createOption({
            type: z.object({ a: z.number() }).default({ a: 10 }),
          }),
          "name1"
        );
      }).toThrowError(new Error('Unsupported default value: {"a":10}'));
    });

    test("invalid item type of array", () => {
      expect(() => {
        optionToInternal(
          createOption({
            type: z.array(z.boolean()).default([true, false]),
          }),
          "name1"
        );
      }).toThrowError(new Error("Unsupported default value: [true,false]"));
    });

    test("multiple type items of array", () => {
      expect(() => {
        optionToInternal(
          createOption({
            type: z
              .array(z.union([z.string(), z.number()]))
              .default([10, "false"]),
          }),
          "name1"
        );
      }).toThrowError(new Error('Unsupported default value: [10,"false"]'));
    });

    test("enum values from entries map", () => {
      const fakeEnum = makeFakeSchema({
        typeName: "ZodEnum",
        entries: { a: 1, b: 2 },
      });
      expect(
        optionToInternal(
          {
            type: fakeEnum,
            alias: "a",
            description: "description1",
          },
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: true,
        enumValues: ["a", "b"],
        isArray: false,
      });
    });
  });
});

describe("positionalArgumentToInternal()", () => {
  describe("array", () => {
    test("common", () => {
      expect(
        positionalArgumentToInternal({
          name: "name1",
          type: z.array(z.string()).describe("zod_description"),
          description: "description1",
        })
      ).toEqual({
        type: "string",
        name: "name1",
        description: "description1",
        required: true,
        isArray: true,
      });
    });
  });
});
