import { describe, expect, jest, test } from "@jest/globals";
import { z } from "zod";

import {
  findDuplicateValues,
  validateParamOptionsAndPositionalArguments,
} from "../src/util";

describe("util validation", () => {
  test("findDuplicateValues returns duplicates", () => {
    expect(findDuplicateValues(["a", "b", "a", "c", "b"])).toEqual(["a", "b"]);
  });

  test("throws on duplicate option names", () => {
    const options = { opt1: { type: z.string() } };
    const keySpy = jest.spyOn(Object, "keys").mockReturnValue(["opt1", "opt1"]);
    try {
      validateParamOptionsAndPositionalArguments(options, []);
      throw new Error("expected duplicate option error");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("Duplicated option name")) {
        throw err;
      }
    } finally {
      keySpy.mockRestore();
    }
  });

  test("throws on duplicate positional names", () => {
    expect(() => {
      validateParamOptionsAndPositionalArguments({}, [
        { name: "pos1", type: z.string() },
        { name: "pos1", type: z.string() },
      ]);
    }).toThrow(/Duplicated positional argument name/);
  });

  test("throws when option and positional share name", () => {
    expect(() => {
      validateParamOptionsAndPositionalArguments(
        { shared: { type: z.string() } },
        [{ name: "shared", type: z.string() }]
      );
    }).toThrow(/Duplicated option name with positional argument name/);
  });
});
