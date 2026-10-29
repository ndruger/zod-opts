import { expectTypeOf } from "expect-type";
import { z } from "zod";

import { command } from "../src/command";
import type {
  ExitCallback,
  ExitResult,
  ParseErrorReason,
  ParseResult,
  ParseResultMatch,
} from "../src/index";
import { parser } from "../src/parser";
import {
  expectExit0,
  expectProcessExit,
  mockConsole,
  mockExit,
} from "./test_util";

describe("onExit()", () => {
  describe("parser", () => {
    test("uses returned exit code on parse error", () => {
      expectProcessExit("Invalid option: invalid", 2, () => {
        parser()
          .options({ opt1: { type: z.string() } })
          .onExit((result) => {
            expectTypeOf(result).toEqualTypeOf<ExitResult>();
            expect(result.type).toBe("error");
            if (result.type === "error") {
              expect(result.reason).toBe("parse");
            }
            return 2;
          })
          .parse(["--invalid"]);
      });
    });

    test("passes reason 'parse' on missing required option", () => {
      const reasons: string[] = [];
      expectProcessExit("Required option is missing: opt1", 1, () => {
        parser()
          .options({ opt1: { type: z.string() } })
          .onExit((result) => {
            if (result.type === "error") {
              reasons.push(result.reason);
            }
          })
          .parse([]);
      });
      expect(reasons).toEqual(["parse"]);
    });

    test("passes reason 'schema' on zod schema error", () => {
      const reasons: string[] = [];
      expectProcessExit(/opt1/, 3, () => {
        parser()
          .options({ opt1: { type: z.string().min(10) } })
          .onExit((result) => {
            if (result.type === "error") {
              reasons.push(result.reason);
            }
            return 3;
          })
          .parse(["--opt1", "short"]);
      });
      expect(reasons).toEqual(["schema"]);
    });

    test("passes reason 'validation' on custom validation error", () => {
      const reasons: string[] = [];
      expectProcessExit("must be different", 4, () => {
        parser()
          .options({
            opt1: { type: z.number() },
            opt2: { type: z.number() },
          })
          .validation((parsed) =>
            parsed.opt1 === parsed.opt2 ? "must be different" : true,
          )
          .onExit((result) => {
            if (result.type === "error") {
              reasons.push(result.reason);
            }
            return 4;
          })
          .parse(["--opt1", "1", "--opt2", "1"]);
      });
      expect(reasons).toEqual(["validation"]);
    });

    test("uses default exit code when callback returns nothing", () => {
      expectExit0("1.0.0", () => {
        parser()
          .version("1.0.0")
          .onExit(() => {})
          .parse(["--version"]);
      });
    });

    test("uses returned exit code on help and version", () => {
      const mockedConsoleLog = mockConsole("log");
      const mockedExit = mockExit();
      const types: string[] = [];
      const p = parser()
        .version("1.0.0")
        .onExit((result) => {
          types.push(result.type);
          return 5;
        });
      expect(() => p.parse(["--help"])).toThrow(/process.exit/);
      expect(() => p.parse(["--version"])).toThrow(/process.exit/);
      expect(types).toEqual(["help", "version"]);
      expect(mockedExit.mock.calls).toEqual([[5], [5]]);
      mockedConsoleLog.mockRestore();
      mockedExit.mockRestore();
    });

    test("is kept after options() and args()", () => {
      expectProcessExit("Required argument is missing: pos", 2, () => {
        parser()
          .onExit(() => 2)
          .options({ opt1: { type: z.string().optional() } })
          .args([{ name: "pos", type: z.string() }])
          .parse([]);
      });
    });

    test("does not print or exit when callback throws", () => {
      const mockedConsoleError = mockConsole();
      const mockedExit = mockExit();
      expect(() => {
        parser()
          .options({ opt1: { type: z.string() } })
          .onExit(() => {
            throw new Error("custom exit");
          })
          .parse([]);
      }).toThrow("custom exit");
      expect(mockedConsoleError).not.toHaveBeenCalled();
      expect(mockedExit).not.toHaveBeenCalled();
      mockedConsoleError.mockRestore();
      mockedExit.mockRestore();
    });

    test.each([-1, 256, 1.5, NaN])(
      "throws error on invalid exit code: %p",
      (code) => {
        expect(() => {
          parser()
            .options({ opt1: { type: z.string() } })
            .onExit(() => code)
            .parse([]);
        }).toThrow(/Invalid exit code/);
      },
    );

    test.each([0, 255])("accepts boundary exit code: %p", (code) => {
      expectProcessExit("Required option is missing: opt1", code, () => {
        parser()
          .options({ opt1: { type: z.string() } })
          .onExit(() => code)
          .parse([]);
      });
    });

    test("throws error on non-number exit code from untyped callback", () => {
      expect(() => {
        parser()
          .options({ opt1: { type: z.string() } })
          .onExit((() => "2") as unknown as ExitCallback)
          .parse([]);
      }).toThrow(/Invalid exit code/);
    });

    test("is not called on successful parse", () => {
      const onExit = jest.fn(() => 2);
      const parsed = parser()
        .options({ opt1: { type: z.string() } })
        .onExit(onExit)
        .parse(["--opt1", "str"]);
      expect(parsed).toEqual({ opt1: "str" });
      expect(onExit).not.toHaveBeenCalled();
    });
  });

  describe("command parser", () => {
    test("uses returned exit code with commandName", () => {
      const results: ExitResult[] = [];
      expectProcessExit("Required option is missing: opt1", 2, () => {
        parser()
          .subcommand(
            command("command1")
              .options({ opt1: { type: z.string() } })
              .action(() => {}),
          )
          .onExit((result) => {
            results.push(result);
            return 2;
          })
          .parse(["command1"]);
      });
      expect(results).toEqual([
        expect.objectContaining({
          type: "error",
          reason: "parse",
          commandName: "command1",
        }),
      ]);
    });

    test("is inherited from parser() before subcommand()", () => {
      expectProcessExit("No command specified", 2, () => {
        parser()
          .onExit(() => 2)
          .subcommand(command("command1").action(() => {}))
          .parse([]);
      });
    });

    test("passes reason 'validation' and commandName on custom validation error", () => {
      const results: ExitResult[] = [];
      expectProcessExit("invalid opt1", 3, () => {
        parser()
          .subcommand(
            command("command1")
              .options({ opt1: { type: z.string() } })
              .validation(() => "invalid opt1")
              .action(() => {}),
          )
          .onExit((result) => {
            results.push(result);
            return 3;
          })
          .parse(["command1", "--opt1", "a"]);
      });
      expect(results).toEqual([
        expect.objectContaining({
          type: "error",
          reason: "validation",
          commandName: "command1",
        }),
      ]);
    });

    test("passes reason 'schema' and commandName on zod schema error", () => {
      const results: ExitResult[] = [];
      expectProcessExit(/opt1/, 3, () => {
        parser()
          .subcommand(
            command("command1")
              .options({ opt1: { type: z.string().min(10) } })
              .action(() => {}),
          )
          .onExit((result) => {
            results.push(result);
            return 3;
          })
          .parse(["command1", "--opt1", "short"]);
      });
      expect(results).toEqual([
        expect.objectContaining({
          type: "error",
          reason: "schema",
          commandName: "command1",
        }),
      ]);
    });

    test("uses returned exit code on help and version", () => {
      const mockedConsoleLog = mockConsole("log");
      const mockedExit = mockExit();
      const results: ExitResult[] = [];
      const p = parser()
        .version("1.0.0")
        .subcommand(command("command1").action(() => {}))
        .onExit((result) => {
          results.push(result);
          return 5;
        });
      expect(() => p.parse(["command1", "--help"])).toThrow(/process.exit/);
      expect(() => p.parse(["--version"])).toThrow(/process.exit/);
      expect(results).toEqual([
        expect.objectContaining({ type: "help", commandName: "command1" }),
        expect.objectContaining({ type: "version" }),
      ]);
      expect(mockedExit.mock.calls).toEqual([[5], [5]]);
      mockedConsoleLog.mockRestore();
      mockedExit.mockRestore();
    });

    test("throws error on invalid exit code", () => {
      expect(() => {
        parser()
          .subcommand(command("command1").action(() => {}))
          .onExit(() => 256)
          .parse([]);
      }).toThrow(/Invalid exit code/);
    });

    test("is not called on successful parse", () => {
      const onExit = jest.fn(() => 2);
      const action = jest.fn();
      parser()
        .subcommand(command("command1").action(action))
        .onExit(onExit)
        .parse(["command1"]);
      expect(action).toHaveBeenCalled();
      expect(onExit).not.toHaveBeenCalled();
    });
  });

  describe("types", () => {
    test("callback accepts number or void and rejects other return types", () => {
      parser().onExit(() => 2);
      parser().onExit(() => {});
      // @ts-expect-error string is not a valid exit code
      parser().onExit(() => "2");
      parser()
        .subcommand(command("command1").action(() => {}))
        // @ts-expect-error string is not a valid exit code
        .onExit(() => "2");
    });

    test("narrows result by type", () => {
      expectTypeOf<ExitResult["type"]>().toEqualTypeOf<
        "error" | "help" | "version"
      >();
      expectTypeOf<
        Extract<ExitResult, { type: "error" }>["reason"]
      >().toEqualTypeOf<ParseErrorReason>();
      expectTypeOf<ParseErrorReason>().toEqualTypeOf<
        "parse" | "schema" | "validation"
      >();
      expectTypeOf<ParseResult<{ a: string }>>().toMatchTypeOf<
        ParseResultMatch<{ a: string }> | ExitResult
      >();
    });
  });
});
