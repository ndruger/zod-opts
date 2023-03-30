import { z } from "zod";

import type { Option, PositionalArgument } from "../src/type";
import {
  optionToInternal,
  positionalArgumentToInternal,
} from "../src/zod_util";

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
      expect(
        optionToInternal(
          createOption({
            type: z.string().default("default").optional(),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false, // should be false, same with z.string().default("default").optional().safeParse(undefined)
        isArray: false,
      });
      expect(
        optionToInternal(
          createOption({
            type: z.optional(z.string().default("default")),
          }),
          "name1"
        )
      ).toEqual({
        type: "string",
        name: "name1",
        alias: "a",
        description: "description1",
        required: false, // should be false, same with z.optional(z.string().default("default")).safeParse(undefined)
        isArray: false,
      });
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
        required: false, // should be false, same with z.string().optional().default("default").safeParse(undefined)
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
      expect(
        optionToInternal(
          createOption({
            type: z
              .union([
                z.boolean().refine(() => true),
                z.boolean().default(true),
              ])
              .refine(() => true),
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
