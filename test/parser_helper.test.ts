import { describe, expect, test } from "@jest/globals";
import { z } from "zod";

import { generateZodShape } from "../src/parser_helper";

describe("generateZodShape()", () => {
  test("common", () => {
    const result = generateZodShape(
      {
        opt1: { type: z.string() },
      },
      [{ name: "pos1", type: z.string() }]
    );
    expect(result).toHaveProperty("opt1");
    expect(result).toHaveProperty("pos1");
  });

  test("returns empty shape when options and positionalArgs are undefined", () => {
    expect(generateZodShape()).toEqual({});
  });
});
