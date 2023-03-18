import { expectTypeOf } from "expect-type";
import { z } from "zod";

import { type Command, command } from "../src/command";
import { ParseError } from "../src/error";
import { parser } from "../src/parser";
import { expectExit0, expectProcessExit, mockConsole } from "./test_util";

function createActionUnexpectedCommand(name: string): Command {
  return command(name)
    .options({
      opt1: {
        type: z.string(),
      },
    })
    .action((parsed) => {
      expect(1).toBe(0);
    });
}

describe("parse()", () => {
  test("simple", () => {
    parser()
      .name("scriptNameA")
      .subcommand(
        command("command1")
          .options({
            opt1: {
              type: z.string(),
              description: "a",
            },
          })
          .args([
            {
              name: "pos1",
              type: z.string(),
            },
          ])
          .action((parsed) => {
            expect(parsed).toEqual({ opt1: "str1", pos1: "pos1" });
            expectTypeOf(parsed).toEqualTypeOf<{
              opt1: string;
              pos1: string;
            }>();
          })
      )
      .parse(["command1", "--opt1", "str1", "pos1"]);
  });

  test("multiple commands", () => {
    parser()
      .subcommand(
        command("command1")
          .options({
            opt1: {
              type: z.string(),
              description: "a",
            },
          })
          .args([
            {
              name: "pos1",
              type: z.string(),
            },
          ])
          .action((parsed) => {
            expect(parsed).toEqual({ opt1: "str1", pos1: "pos1" });
            expectTypeOf(parsed).toEqualTypeOf<{
              opt1: string;
              pos1: string;
            }>();
          })
      )
      .subcommand(
        command("command2")
          .options({
            opt2: {
              type: z.string(),
              description: "a",
            },
          })
          .args([
            {
              name: "pos2",
              type: z.string(),
            },
          ])
          .action((parsed) => {
            expect(parsed).toEqual({ opt2: "str1", pos2: "pos2" });
            expectTypeOf(parsed).toEqualTypeOf<{
              opt2: string;
              pos2: string;
            }>();
          })
      )
      .name("scriptNameA")
      .parse(["command2", "--opt2", "str1", "pos2"]);
  });

  describe("custom validation", () => {
    test("success", () => {
      parser()
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
              },
            })
            .validation((parsed) => {
              if (parsed.opt1 !== "str1") {
                throw new Error("opt1 must be str1");
              }
              return true;
            })
            .action((parsed) => {
              expect(parsed).toEqual({ opt1: "str1" });
              expectTypeOf(parsed).toEqualTypeOf<{
                opt1: string;
              }>();
            })
        )
        .parse(["command1", "--opt1", "str1"]);
    });

    test("error by Error()", () => {
      expectProcessExit("opt1 must be str1", 1, () => {
        parser()
          .subcommand(
            command("command1")
              .options({
                opt1: {
                  type: z.string(),
                },
              })
              .validation((parsed) => {
                if (parsed.opt1 !== "str1") {
                  throw new Error("opt1 must be str1");
                }
                return true;
              })
              .action((parsed) => {
                expect(1).toBe(0);
              })
          )
          .parse(["command1", "--opt1", "invalid"]);
      });
    });

    test("error by message", () => {
      expectProcessExit("opt1 must be str1", 1, () => {
        parser()
          .subcommand(
            command("command1")
              .options({
                opt1: {
                  type: z.string(),
                },
              })
              .validation((parsed) => {
                if (parsed.opt1 !== "str1") {
                  return "opt1 must be str1";
                }
                return true;
              })
              .action((parsed) => {
                expect(1).toBe(0);
              })
          )
          .parse(["command1", "--opt1", "invalid"]);
      });
    });
  });

  describe("help", () => {
    test("global help", () => {
      const expectedHelp = `Usage: scriptA [options] <command>

desc

Commands:
  command1  
  command2  

Options:
  -h, --help     Show help     
  -V, --version  Show version  
`;
      expectExit0(expectedHelp, () => {
        parser()
          .name("scriptA")
          .version("1.1.1")
          .description("desc")
          .subcommand(createActionUnexpectedCommand("command1"))
          .subcommand(createActionUnexpectedCommand("command2"))
          .parse(["--help"]);
      });
    });

    test("global help(name() and description() after subcommand())0", () => {
      const expectedHelp = `Usage: scriptA [options] <command>

desc

Commands:
  command1  
  command2  

Options:
  -h, --help     Show help     
  -V, --version  Show version  
`;
      expectExit0(expectedHelp, () => {
        parser()
          .subcommand(createActionUnexpectedCommand("command1"))
          .subcommand(createActionUnexpectedCommand("command2"))
          .name("scriptA")
          .version("1.1.1")
          .description("desc")
          .parse(["--help"]);
      });
    });

    test("command help(--help command)", () => {
      const expectedHelp = `Usage: scriptA command2 [options] 

Options:
  -h, --help           Show help               
  -V, --version        Show version            
      --opt1 <string>                [required]
`;
      expectExit0(expectedHelp, () => {
        parser()
          .name("scriptA")
          .version("1.1.1")
          .subcommand(createActionUnexpectedCommand("command1"))
          .subcommand(createActionUnexpectedCommand("command2"))
          .parse(["--help", "command2"]);
      });
    });

    test("command help(command --help)", () => {
      const expectedHelp = `Usage: scriptA command2 [options] 

Options:
  -h, --help           Show help               
  -V, --version        Show version            
      --opt1 <string>                [required]
`;
      expectExit0(expectedHelp, () => {
        parser()
          .name("scriptA")
          .version("1.1.1")
          .subcommand(createActionUnexpectedCommand("command1"))
          .subcommand(createActionUnexpectedCommand("command2"))
          .parse(["command2", "--help"]);
      });
    });
  });

  describe("version", () => {
    test("show specified version", () => {
      expectExit0("1.1.1", () => {
        parser()
          .version("1.1.1")
          .subcommand(createActionUnexpectedCommand("command1"))
          .parse(["--version"]);
      });
    });

    test("show none when version is not specified", () => {
      expectExit0("none", () => {
        parser()
          .subcommand(createActionUnexpectedCommand("command1"))
          .parse(["-V"]);
      });
    });

    test("show specified version after subcommand()", () => {
      expectExit0("1.1.1", () => {
        parser()
          .subcommand(createActionUnexpectedCommand("command1"))
          .version("1.1.1")
          .parse(["--version"]);
      });
    });
  });

  test("error on finding command", () => {
    expectProcessExit("Unknown argument: missing_command", 1, () => {
      parser()
        .name("scriptNameA")
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .action((parsed) => {
              expect(1).toBe(0);
            })
        )
        ._internalHandler((result) => {
          expect(result).toEqual({
            type: "error",
            error: new ParseError("Unknown argument: missing_command"),
            help: expect.stringContaining(
              "Usage: scriptNameA [options] <command>"
            ),
            exitCode: 1,
          });
        })
        .parse(["missing_command"]);
    });
  });

  test("error on parse()", () => {
    expectProcessExit("Invalid option: opt-missing", 1, () => {
      parser()
        .name("scriptNameA")
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .action((parsed) => {
              expect(1).toBe(0);
            })
        )
        ._internalHandler((result) => {
          expect(result).toEqual({
            commandName: "command1",
            type: "error",
            error: new ParseError("Invalid option: opt-missing"),
            help: expect.stringContaining(
              "Usage: scriptNameA command1 [options]"
            ),
            exitCode: 1,
          });
        })
        .parse(["command1", "--opt-missing"]);
    });
  });

  test("error on validation()", () => {
    expectProcessExit("Required option is missing: opt1", 1, () => {
      parser()
        .name("scriptNameA")
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .args([])
            .action((parsed) => {
              expect(1).toBe(0);
            })
        )
        ._internalHandler((result) => {
          expect(result).toEqual({
            commandName: "command1",
            type: "error",
            error: new ParseError("Required option is missing: opt1"),
            help: expect.stringContaining(
              "Usage: scriptNameA command1 [options]"
            ),
            exitCode: 1,
          });
        })
        .parse(["command1"]);
    });
  });

  test("error on validation()", () => {
    expectProcessExit(
      "String must contain at least 10 character(s): opt1",
      1,
      () => {
        parser()
          .name("scriptNameA")
          .subcommand(
            command("command1")
              .options({
                opt1: {
                  type: z.string().min(10),
                  description: "a",
                },
              })
              .args([])
              .action((parsed) => {
                expect(1).toBe(0);
              })
          )
          ._internalHandler((result) => {
            expect(result).toEqual({
              commandName: "command1",
              type: "error",
              error: new ParseError(
                "String must contain at least 10 character(s): opt1"
              ),
              help: expect.stringContaining(
                "Usage: scriptNameA command1 [options]"
              ),
              exitCode: 1,
            });
          })
          .parse(["command1", "--opt1", "short"]);
      }
    );
  });
});

describe("subcommand()", () => {
  test("throws runtime error on command without action", () => {
    expect(() => {
      parser()
        .name("scriptNameA")
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .args([
              {
                name: "pos1",
                type: z.string(),
              },
            ])
        )
        .parse(["command1", "--opt1", "str1", "pos1"]);
    }).toThrowError("action is required for command");
  });

  test("throws runtime error on duplicated command name", () => {
    expect(() => {
      parser()
        .name("scriptNameA")
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .action(() => {})
        )
        .subcommand(
          command("command1")
            .options({
              opt1: {
                type: z.string(),
                description: "a",
              },
            })
            .action(() => {})
        )
        .parse(["command1", "--opt1", "str1", "pos1"]);
    }).toThrowError("Duplicated command name: command1");
  });
});

describe("getHelp()", () => {
  const testCommand = command("command1")
    .description("desc2")
    .options({
      opt1: {
        type: z.string(),
        description: "a",
      },
    })
    .args([
      {
        name: "pos1",
        type: z.string(),
      },
    ])
    .action((parsed) => {
      expect(1).toBe(0);
    });

  test("global help", () => {
    const expectedHelp = `Usage: scriptA [options] <command>

desc

Commands:
  command1  desc2

Options:
  -h, --help     Show help     
  -V, --version  Show version  
`;
    const help = parser()
      .name("scriptA")
      .version("1.1.1")
      .description("desc")
      .subcommand(testCommand)
      .getHelp();
    expect(help).toEqual(expectedHelp);
  });

  test("command help", () => {
    const expectedHelp = `Usage: scriptA command1 [options] <pos1>

desc2

Arguments:
  pos1    [required]

Options:
  -h, --help           Show help               
  -V, --version        Show version            
      --opt1 <string>  a             [required]
`;
    const help = parser()
      .name("scriptA")
      .version("1.1.1")
      .description("desc")
      .subcommand(testCommand)
      .getHelp("command1");
    expect(help).toEqual(expectedHelp);
  });
});

describe("showHelp()", () => {
  const testCommand = command("command1")
    .description("desc2")
    .options({
      opt1: {
        type: z.string(),
        description: "a",
      },
    })
    .args([
      {
        name: "pos1",
        type: z.string(),
      },
    ])
    .action((parsed) => {
      expect(1).toBe(0);
    });

  test("global help", () => {
    const mockedConsoleLog = mockConsole("log");
    parser().name("scriptA").subcommand(testCommand).showHelp();
    const logText = mockedConsoleLog.mock.calls.flat().join("\n");
    expect(logText).toContain("Usage: scriptA [options] <command>");
  });
});
