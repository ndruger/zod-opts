import { expectTypeOf } from "expect-type";
import { z } from "zod";

import { ParseError } from "../src/error";
import { parser } from "../src/parser";
import { expectExit0, expectProcessExit } from "./test_util";

describe("parse()", () => {
  describe("complex", () => {
    test("returns parsed args when variable string arguments exist", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string() },
          opt2: { type: z.string().default("default2") },
          opt3: { type: z.string(), alias: "a" },
          opt4: { type: z.string() },
          opt5: { type: z.string(), alias: "b" },
        })
        .parse(["--opt1", "str1", "-a", "str3", "--opt4=str4", "-bstr5"]);
      expect(parsed).toEqual({
        opt1: "str1",
        opt2: "default2",
        opt3: "str3",
        opt4: "str4",
        opt5: "str5",
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1: string;
        opt2: string;
        opt3: string;
        opt4: string;
        opt5: string;
      }>();
    });

    test("returns parsed args when variable union arguments exist", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.union([z.string(), z.string()]) },
          opt2: { type: z.union([z.number(), z.number()]) },
          opt3: { type: z.union([z.boolean(), z.boolean()]) },
          opt4: {
            type: z.union([
              z.string().default("default1"),
              z.string().default("default2"),
            ]),
          }, // ignore inner default
        })
        .parse(["--opt1", "str1", "--opt2", "10", "--opt3", "--opt4", "str2"]);
      expect(parsed).toEqual({
        opt1: "str1",
        opt2: 10,
        opt3: true,
        opt4: "str2",
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1: string;
        opt2: number;
        opt3: boolean;
        opt4: string;
      }>();
    });

    test("returns parsed args when options exist", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string(), description: "a" },
          opt2: { type: z.number().default(10) },
        })
        .parse(["--opt1", "str"]);
      expect(parsed).toEqual({ opt1: "str", opt2: 10 });
      expectTypeOf(parsed).toEqualTypeOf<{ opt1: string; opt2: number }>();
    });

    test("returns parsed args when positional options are empty", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string(), description: "a" },
          opt2: { type: z.number().default(10) },
        })
        .args([])
        .parse(["--opt1", "str"]);
      expect(parsed).toEqual({ opt1: "str", opt2: 10 });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1: string;
        opt2: number;
      }>();
    });

    test("returns parsed args when optional options/positional exist", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string().optional() },
          opt2: { type: z.string().default("default").optional() },
          opt3: { type: z.string().optional().default("default") },
          opt4: { type: z.optional(z.string().default("default")) },
        })
        .args([
          { name: "pos1", type: z.string().optional() },
          { name: "pos2", type: z.string().default("default").optional() },
          { name: "pos3", type: z.string().optional().default("default") },
          { name: "pos4", type: z.optional(z.string().default("default")) },
        ])
        .parse([]);
      expect(parsed).toEqual({
        opt1: undefined,
        opt2: undefined,
        opt3: "default",
        opt4: undefined,
        pos1: undefined,
        pos2: undefined,
        pos3: "default",
        pos4: undefined,
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1?: string;
        opt2?: string;
        opt3: string;
        opt4?: string;
        pos1?: string;
        pos2?: string;
        pos3: string;
        pos4?: string;
      }>();
    });

    test("returns parsed args when optional options/positional exist and args", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string().optional() },
          opt2: { type: z.string().default("default").optional() },
          opt3: { type: z.string().optional().default("default") },
          opt4: { type: z.optional(z.string().default("default")) },
        })
        .args([
          { name: "pos1", type: z.string().optional() },
          { name: "pos2", type: z.string().default("default").optional() },
          { name: "pos3", type: z.string().optional().default("default") },
          { name: "pos4", type: z.optional(z.string().default("default")) },
        ])
        .parse([
          "--opt1",
          "str1",
          "--opt2",
          "str2",
          "--opt3",
          "str3",
          "--opt4",
          "str4",
          "str5",
          "str6",
          "str7",
          "str8",
        ]);
      expect(parsed).toEqual({
        opt1: "str1",
        opt2: "str2",
        opt3: "str3",
        opt4: "str4",
        pos1: "str5",
        pos2: "str6",
        pos3: "str7",
        pos4: "str8",
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1?: string;
        opt2?: string;
        opt3: string;
        opt4?: string;
        pos1?: string;
        pos2?: string;
        pos3: string;
        pos4?: string;
      }>();
    });

    test("returns parsed args when options and positional exist", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.string(), description: "a" },
          opt2: { type: z.number().default(10) },
        })
        .args([
          { name: "pos1", type: z.string() },
          { name: "pos2", type: z.number() },
          { name: "pos3", type: z.string().default("default1") },
        ])
        .parse(["--opt1", "str1", "--opt2", "10", "str2", "10"]);
      expect(parsed).toEqual({
        opt1: "str1",
        opt2: 10,
        pos1: "str2",
        pos2: 10,
        pos3: "default1",
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1: string;
        opt2: number;
        pos1: string;
        pos2: number;
        pos3: string;
      }>();
    });

    test("returns parsed args when multiple positional exist", () => {
      const parsed = parser()
        .args([
          { name: "pos1", type: z.string() },
          { name: "pos2", type: z.number() },
        ])
        .parse(["str1", "10"]);
      expect(parsed).toEqual({
        pos1: "str1",
        pos2: 10,
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        pos1: string;
        pos2: number;
      }>();
    });

    test("returns parsed args when variable positional string exist", () => {
      const parsed = parser()
        .args([{ name: "pos", type: z.string().array() }])
        .parse(["str1", "10"]);
      expect(parsed).toEqual({ pos: ["str1", "10"] });
      expectTypeOf(parsed).toEqualTypeOf<{
        pos: string[];
      }>();
    });

    test("returns parsed args when variable positional number options exist", () => {
      const parsed = parser()
        .args([{ name: "pos", type: z.number().array() }])
        .parse(["-1.5", "40"]);
      expect(parsed).toEqual({ pos: [-1.5, 40] });
      expectTypeOf(parsed).toEqualTypeOf<{
        pos: number[];
      }>();
    });
  });

  describe("type", () => {
    describe("string", () => {
      test("with arg", () => {
        const parsed = parser()
          .options({
            opt1: { type: z.string().min(2) },
            opt2: { type: z.string() },
          })
          .parse(["--opt1", "str1", "--opt2", ""]);
        expect(parsed).toEqual({ opt1: "str1", opt2: "" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt1: string;
          opt2: string;
        }>();
      });

      test("error on required arg", () => {
        expectProcessExit("Invalid option: --opt1", 1, () =>
          parser()
            .options({ opt1: { type: z.string() } })
            .parse(["--opt1"])
        );
      });

      test("error on validation", () => {
        expectProcessExit(
          "String must contain at least 10 character(s): opt1",
          1,
          () =>
            parser()
              .options({
                opt1: { type: z.string().min(10) },
              })
              .parse(["--opt1", "short"])
        );
      });

      test("default with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.string().default("default") } })
          .parse(["--opt", "str1"]);
        expect(parsed).toEqual({ opt: "str1" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: string;
        }>();
      });

      test("default without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.string().default("default") } })
          .parse([]);
        expect(parsed).toEqual({ opt: "default" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: string;
        }>();
      });

      test("optional with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.string().optional() } })
          .parse(["--opt", "str1"]);
        expect(parsed).toEqual({ opt: "str1" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: string;
        }>();
      });

      test("optional without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.string().optional() } })
          .parse([]);
        expect(parsed).toEqual({ opt: undefined });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: string;
        }>();
      });

      test("boolean with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean() } })
          .parse(["--opt"]);
        expect(parsed).toEqual({ opt: true });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: boolean;
        }>();
      });
    });

    describe("number", () => {
      test("with arg", () => {
        const parsed = parser()
          .options({
            opt1: { type: z.number().min(-10) },
            opt2: { type: z.number().max(10) },
          })
          .parse(["--opt1", "-0.5", "--opt2", "5"]);
        expect(parsed).toEqual({
          opt1: -0.5,
          opt2: 5,
        });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt1: number;
          opt2: number;
        }>();
      });

      test("error on required arg", () => {
        expectProcessExit("Invalid option: --opt1", 1, () =>
          parser()
            .options({ opt1: { type: z.number() } })
            .parse(["--opt1"])
        );
      });

      test("error on validation", () => {
        expectProcessExit(
          "Number must be greater than or equal to 10: opt1",
          1,
          () =>
            parser()
              .options({
                opt1: { type: z.number().min(10) },
              })
              .parse(["--opt1", "5"])
        );
      });
    });

    describe("boolean", () => {
      test("boolean with arg", () => {
        const parsed = parser()
          .options({
            opt1: { type: z.boolean() },
            opt2: { type: z.boolean(), alias: "a" },
          })
          .parse(["--opt1", "-a"]);
        expect(parsed).toEqual({ opt1: true, opt2: true });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt1: boolean;
          opt2: boolean;
        }>();
      });

      test("error without required arg", () => {
        expectProcessExit("Required option is missing: opt", 1, () => {
          parser()
            .options({ opt: { type: z.boolean() } })
            .parse([]);
        });
      });

      test("error on argument", () => {
        expectProcessExit("Too many positional arguments", 1, () => {
          parser()
            .options({ opt: { type: z.boolean() } })
            .parse(["--opt", "str1"]);
        });
      });

      test("error wrong format", () => {
        expectProcessExit(
          "Invalid option value. boolean is expected: opt",
          1,
          () => {
            parser()
              .options({ opt: { type: z.boolean() } })
              .parse(["--opt=str1"]);
          }
        );
      });

      test("error on boolean in positional options", () => {
        expect(() => {
          parser()
            .args([{ name: "opt", type: z.boolean() }])
            .parse([]);
        }).toThrow("Unsupported zod type (Positional options): ZodBoolean");
      });

      test("default with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().default(false) } })
          .parse(["--opt"]);
        expect(parsed).toEqual({ opt: true });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: boolean;
        }>();
      });

      test("default with negative arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().default(true) } })
          .parse(["--no-opt"]);
        expect(parsed).toEqual({ opt: false });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: boolean;
        }>();
      });

      test("default(true) without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().default(true) } })
          .parse([]);
        expect(parsed).toEqual({ opt: true });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: boolean;
        }>();
      });

      test("default(false) without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().default(false) } })
          .parse([]);
        expect(parsed).toEqual({ opt: false });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: boolean;
        }>();
      });

      test("optional with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().optional() } })
          .parse(["--opt"]);
        expect(parsed).toEqual({ opt: true });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: boolean;
        }>();
      });

      test("optional without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.boolean().optional() } })
          .parse([]);
        expect(parsed).toEqual({ opt: undefined });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: boolean;
        }>();
      });
    });

    describe("enum", () => {
      test("with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.enum(["a", "b", "c"]) } })
          .parse(["--opt", "b"]);
        expect(parsed).toEqual({ opt: "b" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: "a" | "b" | "c";
        }>();
      });

      test("error on invalid value", () => {
        expectProcessExit(
          "Invalid enum value. Expected 'a' | 'b' | 'c', received 'd': opt",
          1,
          () => {
            parser()
              .options({ opt: { type: z.enum(["a", "b", "c"]) } })
              .parse(["--opt", "d"]);
          }
        );
      });

      test("with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.enum(["a", "b", "c"]) } })
          .parse(["--opt", "b"]);
        expect(parsed).toEqual({ opt: "b" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: "a" | "b" | "c";
        }>();
      });

      test("default with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.enum(["a", "b", "c"]).default("b") } })
          .parse(["--opt", "c"]);
        expect(parsed).toEqual({ opt: "c" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: "a" | "b" | "c";
        }>();
      });

      test("default without arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.enum(["a", "b", "c"]).default("b") } })
          .parse([]);
        expect(parsed).toEqual({ opt: "b" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: "a" | "b" | "c";
        }>();
      });

      test("optional with arg", () => {
        const parsed = parser()
          .options({ opt: { type: z.enum(["a", "b", "c"]).optional() } })
          .parse(["--opt", "b"]);
        expect(parsed).toEqual({ opt: "b" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: "a" | "b" | "c";
        }>();
      });
    });

    describe("union", () => {
      test("with arg", () => {
        const parsed = parser()
          .options({
            opt1: { type: z.union([z.string().min(5), z.string().min(1)]) },
            opt2: { type: z.union([z.number().min(10), z.number().min(1)]) },
            opt3: { type: z.union([z.boolean(), z.boolean()]) },
            opt4: {
              type: z.union([
                z.union([z.string().min(5), z.string()]),
                z.string().min(1),
              ]),
            },
          })
          .parse(["--opt1", "str", "--opt2", "5", "--opt3", "--opt4", "str2"]);
        expect(parsed).toEqual({
          opt1: "str",
          opt2: 5,
          opt3: true,
          opt4: "str2",
        });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt1: string;
          opt2: number;
          opt3: boolean;
          opt4: string;
        }>();
      });

      test("error on invalid string value", () => {
        expectProcessExit("Invalid option: --opt", 1, () => {
          parser()
            .options({
              opt1: {
                type: z.union([z.string().min(5), z.string().min(10)]),
              },
            })
            .parse(["--opt", "d"]);
        });
      });

      test("error on invalid number value", () => {
        expectProcessExit("Invalid option: --opt", 1, () => {
          parser()
            .options({
              opt1: {
                type: z.union([z.number().min(5), z.number().min(10)]),
              },
            })
            .parse(["--opt", "3"]);
        });
      });

      test("error on union of different type(string, number)", () => {
        expect(() => {
          parser()
            .options({
              opt1: {
                type: z.union([z.string(), z.number()]),
              },
            })
            .parse(["--opt", "d"]);
        }).toThrow("Union types are not same");
      });

      test("default with arg", () => {
        const parsed = parser()
          .options({
            opt: {
              type: z.union([z.string(), z.string()]).default("default"),
            },
          })
          .parse(["--opt", "str"]);
        expect(parsed).toEqual({ opt: "str" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: string;
        }>();
      });

      test("default without arg", () => {
        const parsed = parser()
          .options({
            opt: {
              type: z.union([z.string(), z.string()]).default("default"),
            },
          })
          .parse([]);
        expect(parsed).toEqual({ opt: "default" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt: string;
        }>();
      });

      test("optional with arg", () => {
        const parsed = parser()
          .options({
            opt: {
              type: z.union([z.string(), z.string()]).optional(),
            },
          })
          .parse(["--opt", "str"]);
        expect(parsed).toEqual({ opt: "str" });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: string;
        }>();
      });

      test("optional without arg", () => {
        const parsed = parser()
          .options({
            opt: {
              type: z.union([z.string(), z.string()]).optional(),
            },
          })
          .parse([]);
        expect(parsed).toEqual({ opt: undefined });
        expectTypeOf(parsed).toEqualTypeOf<{
          opt?: string;
        }>();
      });
    });

    describe("array", () => {
      test("with arg", () => {
        const parsed = parser()
          .args([{ name: "pos", type: z.array(z.string()) }])
          .parse(["str1"]);
        expect(parsed).toEqual({ pos: ["str1"] });
        expectTypeOf(parsed).toEqualTypeOf<{
          pos: string[];
        }>();
      });

      test("error on invalid value(string)", () => {
        expectProcessExit(
          "String must contain at least 10 character(s): pos",
          1,
          () => {
            parser()
              .args([{ name: "pos", type: z.array(z.string().min(10)) }])
              .parse(["short"]);
          }
        );
      });

      test("error on invalid value(number)", () => {
        expectProcessExit(
          "String must contain at least 10 character(s): pos0",
          1,
          () => {
            parser()
              .args([{ name: "pos", type: z.array(z.string().min(10)) }])
              .parse(["short"]);
          }
        );
      });

      test("error on array type in option(not supported now)", () => {
        expect(() => {
          parser()
            .options({ opt: { type: z.array(z.string()) } })
            .parse(["--opt1", "str1"]);
        }).toThrow("Unsupported zod type (Options): ZodArray");
      });

      test("error on array of boolean", () => {
        expect(() => {
          parser()
            .args([{ name: "pos", type: z.array(z.boolean()) }])
            .parse(["short"]);
        }).toThrow("Unsupported zod type: Array of ZodBoolean");
      });

      test("optional with arg", () => {
        const parsed = parser()
          .args([{ name: "pos", type: z.array(z.string()).optional() }])
          .parse([]);
        expect(parsed).toEqual({ pos: undefined });
        expectTypeOf(parsed).toEqualTypeOf<{
          pos?: string[];
        }>();
      });

      test("default([]) without arg", () => {
        const parsed = parser()
          .args([{ name: "pos", type: z.array(z.string()).default([]) }])
          .parse([]);
        expect(parsed).toEqual({ pos: [] });
        expectTypeOf(parsed).toEqualTypeOf<{
          pos: string[];
        }>();
      });

      test("default(['default']) without arg", () => {
        const parsed = parser()
          .args([
            {
              name: "pos",
              type: z.array(z.string()).default(["default1", "default2"]),
            },
          ])
          .parse([]);
        expect(parsed).toEqual({ pos: ["default1", "default2"] });
        expectTypeOf(parsed).toEqualTypeOf<{
          pos: string[];
        }>();
      });
    });
  });

  describe("options and args are empty or don't exist", () => {
    test("returns {} when options and args don't exist", () => {
      expect(parser().options({}).args([]).parse([])).toEqual({});
      expect(parser().options({}).parse([])).toEqual({});
      expect(parser().args([]).parse([])).toEqual({});
      expect(parser().parse([])).toEqual({});
    });
  });

  describe("format error", () => {
    test("no option value", () => {
      expectProcessExit("Invalid option: -n", 1, () => {
        parser()
          .options({
            opt1: { type: z.string(), description: "a", alias: "n" },
          })
          .parse(["-n"]);
      });
    });

    test("invalid option", () => {
      expectProcessExit("Invalid option: --opt1", 1, () => {
        parser().parse(["--opt1", "opt1"]);
      });
    });

    test("too many positional arguments", () => {
      expectProcessExit("Too many positional arguments", 1, () => {
        parser().parse(["str1"]);
      });
    });

    test("value mismatch", () => {
      expectProcessExit(
        "Invalid option value. number is expected: opt1",
        1,
        () => {
          parser()
            .options({
              opt1: { type: z.number() },
            })
            .parse(["--opt1", "str"]);
        }
      );
    });
  });

  describe("custom validation", () => {
    test("success", () => {
      const parsed = parser()
        .options({
          opt1: { type: z.number() },
          opt2: { type: z.number() },
        })
        .validation((parsed) => {
          if (parsed.opt1 + parsed.opt2 <= 12) {
            throw new Error("opt1 + opt2 must be greater than 12");
          }
          return true;
        })
        .parse(["--opt1", "5", "--opt2", "10"]);
      expect(parsed).toEqual({
        opt1: 5,
        opt2: 10,
      });
      expectTypeOf(parsed).toEqualTypeOf<{
        opt1: number;
        opt2: number;
      }>();
    });

    test("error by Error()", () => {
      expectProcessExit("opt1 + opt2 must be greater than 12", 1, () => {
        parser()
          .options({
            opt1: { type: z.number() },
            opt2: { type: z.number() },
          })
          .validation((parsed) => {
            if (parsed.opt1 + parsed.opt2 <= 12) {
              throw new Error("opt1 + opt2 must be greater than 12");
            }
            return true;
          })
          .parse(["--opt1", "5", "--opt2", "5"]);
      });
    });

    test("error by message", () => {
      expectProcessExit("opt1 + opt2 must be greater than 12", 1, () => {
        parser()
          .options({
            opt1: { type: z.number() },
            opt2: { type: z.number() },
          })
          .validation((parsed) => {
            console.log("custom validation");
            if (parsed.opt1 + parsed.opt2 <= 12) {
              return "opt1 + opt2 must be greater than 12";
            }
            return true;
          })
          .parse(["--opt1", "5", "--opt2", "5"]);
      });
    });
  });

  describe("help", () => {
    test("show help", () => {
      const expectedHelp = `Usage: scriptA [options] <pos1> <pos2> [pos3]

desc

Arguments:
  pos1  desc5                        [required]
  pos2  desc6                        [required]
  pos3  desc8 (default: "default2")            

Options:
  -h, --help           Show help                      
  -V, --version        Show version                   
      --opt1 <string>  desc1                [required]
      --opt2 <number>  desc2                [required]
      --opt3           desc3                [required]
      --opt4 <number>  desc4 (default: 10)            
`;
      expectExit0(expectedHelp, () => {
        parser()
          .name("scriptA")
          .version("1.0.0")
          .description("desc")
          .options({
            opt1: { type: z.string().describe("desc1") },
            opt2: { type: z.number(), description: "desc2" },
            opt3: {
              type: z.boolean().describe("dummy"),
              description: "desc3",
            },
            opt4: {
              type: z.number().default(10).describe("desc4"),
            },
          })
          .args([
            {
              name: "pos1",
              description: "desc5",
              type: z.string(),
            },
            {
              name: "pos2",
              type: z.string().describe("desc6"),
            },
            {
              name: "pos3",
              type: z.string().default("default2").describe("desc7"),
              description: "desc8",
            },
          ])
          ._internalHandler((result) => {
            expect(result).toEqual({
              type: "help",
              help: expect.stringContaining("Usage: scriptA"),
              exitCode: 0,
            });
            if (result.type === "help") {
              expectTypeOf(result).toEqualTypeOf<{
                type: "help";
                help: string;
                exitCode: 0;
                commandName?: string;
              }>();
            }
          })
          .parse(["--help"]);
      });
    });
  });

  describe("version", () => {
    test("show specified version", () => {
      expectExit0("1.1.1", () => {
        parser()
          .name("scriptA")
          .version("1.1.1")
          .options({
            opt1: { type: z.string().describe("desc1") },
          })
          .args([])
          ._internalHandler((result) => {
            expect(result).toEqual({
              type: "version",
              help: expect.stringContaining("Usage: scriptA"),
              exitCode: 0,
            });
            if (result.type === "version") {
              expectTypeOf(result).toEqualTypeOf<{
                type: "version";
                help: string;
                exitCode: 0;
              }>();
            }
          })
          .parse(["--version"]);
      });
    });

    test("show none when version is not specified", () => {
      expectExit0("none", () => {
        parser()
          .name("scriptA")
          .options({
            opt1: { type: z.string().describe("desc1") },
          })
          .args([])
          .parse(["-V"]);
      });
    });
  });

  describe("unsupported zod types", () => {
    test("zod literal is not supported", () => {
      expect(() => {
        parser()
          .options({
            opt1: { type: z.literal(1) },
          })
          .parse(["--opt1", "1"]);
      }).toThrow("Unsupported zod type: ZodLiteral");
    });

    test("zod date is not supported", () => {
      expect(() => {
        parser()
          .options({
            opt1: { type: z.date() },
          })
          .parse(["--opt1", "2022-01-12T00:00:00.000Z"]);
      }).toThrow("Unsupported zod type: ZodDate");
    });
  });

  describe("handler()", () => {
    // help and version test is in describe("help") and describe("version")
    test("match", () => {
      parser()
        .name("scriptNameA")
        .options({
          opt1: { type: z.string() },
        })
        ._internalHandler((result) => {
          expect(result).toEqual({
            type: "match",
            parsed: { opt1: "str1" },
            help: expect.stringContaining("Usage: scriptNameA"),
          });
          if (result.type === "match") {
            expectTypeOf(result.parsed).toEqualTypeOf<{
              opt1: string;
            }>();
          }
        })
        .parse(["--opt1", "str1"]);
    });

    test("internal parser error", () => {
      expectProcessExit("Invalid option: -invalid=10", 1, () => {
        parser()
          .name("scriptNameA")
          .options({
            opt1: { type: z.string() },
          })
          ._internalHandler((result) => {
            expect(result).toEqual({
              type: "error",
              error: new ParseError("Invalid option: -invalid=10"),
              exitCode: 1,
              help: expect.stringContaining("Usage: scriptNameA"),
            });
            if (result.type === "error") {
              expectTypeOf(result).toEqualTypeOf<{
                type: "error";
                error: Error;
                help: string;
                exitCode: 1;
                commandName?: string;
              }>();
            }
          })
          .parse(["-invalid=10"]);
      });
    });

    test("internal validation error", () => {
      expectProcessExit("Required option is missing: opt1", 1, () => {
        parser()
          .name("scriptNameA")
          .options({
            opt1: { type: z.string() },
          })
          ._internalHandler((result) => {
            expect(result).toEqual({
              type: "error",
              error: new ParseError("Required option is missing: opt1"),
              exitCode: 1,
              help: expect.stringContaining("Usage: scriptNameA"),
            });
            if (result.type === "error") {
              expectTypeOf(result).toEqualTypeOf<{
                type: "error";
                error: Error;
                help: string;
                exitCode: 1;
                commandName?: string;
              }>();
            }
          })
          .parse([]);
      });
    });
  });
});

describe("getHelp", () => {
  test("return help string", () => {
    const expectedHelp = `Usage: scriptA [options] <pos1>

desc

Arguments:
  pos1  desc5  [required]

Options:
  -h, --help           Show help               
  -V, --version        Show version            
      --opt1 <string>  desc1         [required]
`;
    const help = parser()
      .name("scriptA")
      .version("1.0.0")
      .description("desc")
      .options({
        opt1: { type: z.string().describe("desc1") },
      })
      .args([
        {
          name: "pos1",
          description: "desc5",
          type: z.string(),
        },
      ])
      .getHelp();
    expect(help).toEqual(expectedHelp);
  });
});

describe("type test", () => {
  const OptionParams = z.object({
    opt1: z.string(),
    opt2: z.number().optional(),
    pos1: z.enum(["a", "b"]),
  });

  type OptionParamsT = z.infer<typeof OptionParams>;

  test("matches original zod type", () => {
    const parsed = parser()
      .name("scriptA")
      .version("1.0.0")
      .description("desc")
      .options({
        opt1: { type: OptionParams.shape.opt1 },
        opt2: { type: OptionParams.shape.opt2 },
      })
      .args([
        {
          name: "pos1",
          type: OptionParams.shape.pos1,
        },
      ])
      .parse(["--opt1", "str1", "--opt2", "10", "a"]);
    expectTypeOf(parsed).toEqualTypeOf<OptionParamsT>();
  });
});

// // TODO: Support zod .refine()
// describe("refine test", () => {
//   test.only("", () => {
//     const a = z
//       .string()
//       .default("aa")
//       .refine((v) => v === "foo" || v === "bar", {
//         message: "option1 must be foo or bar",
//       });
//     const parsed = parser()
//       .name("scriptA")
//       .version("1.0.0")
//       .description("desc")
//       .options({
//         opt1: {
//           type: a,
//         },
//       })
//       .parse(["--opt1", "foo"]);
//     expectTypeOf(parsed).toEqualTypeOf<{
//       opt1: string;
//     }>();
//   });
// });
