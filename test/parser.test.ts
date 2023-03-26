import { z } from "zod";

import { command } from "../src/command";
import { parser } from "../src/parser";
import { mockConsole } from "./test_util";

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

describe("showHelp()", () => {
  test("shows help on console", () => {
    const mockedConsoleLog = mockConsole("log");
    parser().name("scriptA").version("1.0.0").description("desc").showHelp();
    const logText = mockedConsoleLog.mock.calls.flat().join("\n");
    expect(logText).toContain("Usage: scriptA [options]");
  });
});

describe("options()", () => {
  describe("runtime error", () => {
    test("throws runtime exception on invalid option name", () => {
      expect(() => {
        parser()
          .options({
            "--opt1": { type: z.string() },
          })
          .parse([]);
      }).toThrow(
        "Invalid option name. Supported pattern is /^[A-Za-z0-9_]+[A-Za-z0-9_-]*$/: --opt1"
      );
    });

    test("throws runtime exception on invalid alias name", () => {
      expect(() => {
        parser()
          .options({
            opt1: { type: z.string(), alias: "-a" },
          })
          .parse([]);
      }).toThrow(
        "Invalid option alias. Supported pattern is /^[A-Za-z0-9_]+$/: -a"
      );
    });
  });
});

describe("args()", () => {
  describe("runtime error", () => {
    test("throws runtime exception on invalid arg name", () => {
      expect(() => {
        parser()
          .args([
            {
              name: "--arg1",
              type: z.string(),
            },
          ])
          .parse([]);
      }).toThrow(
        "Invalid positional argument name. Supported pattern is /^[A-Za-z0-9_]+[A-Za-z0-9_-]*$/: --arg1"
      );
    });

    test("throws runtime exception on duplicated name", () => {
      expect(() => {
        parser()
          .args([
            { name: "arg1", type: z.string() },
            { name: "arg1", type: z.string() },
          ])
          .parse([]);
      }).toThrow("Duplicated positional argument name: arg1");
    });

    test("throws runtime exception when option name and argument name is same", () => {
      expect(() => {
        parser()
          .options({ opt1: { type: z.string() } })
          .args([{ name: "opt1", type: z.string() }])
          .parse([]);
      }).toThrow("Duplicated option name with positional argument name: opt1");
    });
  });
});

describe("subcommand()", () => {
  // function of subcommand() is tested in subcommand.test.ts

  // zod-opts doesn't support subcommand with global args
  test("Cannot add subcommand to parser with args().", () => {
    expect(() => {
      parser()
        .args([{ name: "arg1", type: z.string() }])
        .subcommand(command("cmd1").args([{ name: "arg1", type: z.string() }]));
    }).toThrow("Cannot add subcommand to parser with args().");
  });

  // zod-opts doesn't support subcommand with global options
  test("Cannot add subcommand to parser with args().", () => {
    expect(() => {
      parser()
        .options({ opt1: { type: z.string() } })
        .subcommand(command("cmd1").args([{ name: "arg1", type: z.string() }]));
    }).toThrow("Cannot add subcommand to parser with options().");
  });
});
