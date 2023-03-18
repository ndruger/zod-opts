import {
  findOption,
  isNumeric,
  likesOptionArg,
  parse,
  parseMultiCommand,
  pickPositionalArgs,
} from "../src/internal_parser";
import { createInternalOption, createInternalPositionalArg } from "./test_util";

describe("isNumeric()", () => {
  test("common", () => {
    expect(isNumeric("0")).toEqual(true);
    expect(isNumeric("-0.10")).toEqual(true);
    expect(isNumeric("0x10")).toEqual(true);
    expect(isNumeric("111111")).toEqual(true);
    expect(isNumeric(" 1 ")).toEqual(true);
    expect(isNumeric("1 ")).toEqual(true);
    expect(isNumeric(" 1")).toEqual(true);

    expect(isNumeric("a10")).toEqual(false);
    expect(isNumeric("10a")).toEqual(false);
    expect(isNumeric("")).toEqual(false);
    expect(isNumeric("a")).toEqual(false);
    expect(isNumeric(" ")).toEqual(false);
    expect(isNumeric("1.1.1")).toEqual(false);
  });
});

describe("findOption()", () => {
  test("common", () => {
    expect(findOption([], "--opt")).toEqual(undefined);
    expect(
      findOption([createInternalOption({ name: "opt1" })], "--opt2")
    ).toEqual(undefined);
    expect(
      findOption([createInternalOption({ name: "opt1" })], "--opt1")
    ).toEqual([createInternalOption({ name: "opt1" }), false]);

    // In parse phase, don't mind about the value
    expect(
      findOption(
        [createInternalOption({ name: "opt1", type: "number" })],
        "--opt1"
      )
    ).toEqual([createInternalOption({ name: "opt1", type: "number" }), false]);

    expect(
      findOption(
        [createInternalOption({ name: "opt1", type: "boolean" })],
        "--opt1"
      )
    ).toEqual([createInternalOption({ name: "opt1", type: "boolean" }), false]);

    expect(
      findOption(
        [createInternalOption({ name: "opt1", type: "boolean" })],
        "--no-opt1"
      )
    ).toEqual([createInternalOption({ name: "opt1", type: "boolean" }), true]);

    // don't check required
    expect(
      findOption(
        [createInternalOption({ name: "opt1", type: "string" })],
        "--no-opt1"
      )
    ).toEqual([createInternalOption({ name: "opt1", type: "string" }), true]);

    expect(
      findOption(
        [createInternalOption({ name: "opt1", type: "boolean" })],
        "--no-opt2"
      )
    ).toEqual(undefined);
  });
});

describe("likesOptionArg()", () => {
  test("common", () => {
    expect(likesOptionArg("--arg", [])).toEqual(true);
    expect(likesOptionArg("-a", [])).toEqual(true);
    expect(likesOptionArg("-a=a", [])).toEqual(true);
    expect(likesOptionArg("--a=-10", [])).toEqual(true);
    expect(likesOptionArg("--10", [])).toEqual(true);
    expect(
      likesOptionArg("-1", [createInternalOption({ alias: "1" })])
    ).toEqual(true);

    expect(likesOptionArg("--", [])).toEqual(false);
    expect(likesOptionArg("arg", [])).toEqual(false);
    expect(likesOptionArg("10", [])).toEqual(false);
    expect(likesOptionArg("-1", [])).toEqual(false);
    expect(likesOptionArg("-10.0", [])).toEqual(false);
  });
});

describe("pickPositionalArgs()", () => {
  test("common", () => {
    expect(pickPositionalArgs(["pos1", "pos2", "pos3"], [], false)).toEqual({
      positionalArgs: ["pos1", "pos2", "pos3"],
      shift: 3,
    });
    expect(pickPositionalArgs(["pos1"], [], false)).toEqual({
      positionalArgs: ["pos1"],
      shift: 1,
    });
    expect(pickPositionalArgs(["pos1", "--opt1"], [], false)).toEqual({
      positionalArgs: ["pos1"],
      shift: 1,
    });
    expect(pickPositionalArgs(["pos1", "--opt1"], [], true)).toEqual({
      positionalArgs: ["pos1", "--opt1"],
      shift: 2,
    });
  });
});

describe("parse()", () => {
  describe("normal", () => {
    test("when option and positional option", () => {
      expect(
        parse({
          args: ["--opt1", "opt_str1"],
          options: [
            createInternalOption({ name: "opt1" }),
            createInternalOption({ name: "opt2" }),
          ],
          positionalArgs: [],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: "opt_str1",
            isNegative: false,
          },
        ],
        positionalCandidates: [],
        isHelp: false,
        isVersion: false,
      });
    });

    test("multiple positional options", () => {
      expect(
        parse({
          args: ["pos1", "pos2"],
          options: [
            createInternalOption({ name: "opt1" }), // don't check required on parse
            createInternalOption({ name: "opt2" }),
          ],
          positionalArgs: [
            createInternalPositionalArg({ name: "pos1" }),
            createInternalPositionalArg({ name: "pos2" }),
          ],
        })
      ).toEqual({
        candidates: [],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
          {
            name: "pos2",
            value: "pos2",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("when double dash", () => {
      expect(
        parse({
          args: ["--opt1", "opt1", "--", "--", "-b=opt2", "pos3"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [
            createInternalPositionalArg({ name: "pos1" }),
            createInternalPositionalArg({ name: "pos2" }),
            createInternalPositionalArg({ name: "pos3" }),
          ],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: "opt1",
            isNegative: false,
          },
        ],
        positionalCandidates: [
          {
            name: "pos1",
            value: "--",
          },
          {
            name: "pos2",
            value: "-b=opt2",
          },
          {
            name: "pos3",
            value: "pos3",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("", () => {
      expect(
        parse({
          args: ["--flag1", "pos1"],
          options: [createInternalOption({ name: "flag1", type: "boolean" })],
          positionalArgs: [createInternalPositionalArg({})],
        })
      ).toEqual({
        candidates: [
          {
            name: "flag1",
            value: undefined,
            isNegative: false,
          },
        ],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("when array type positional option", () => {
      expect(
        parse({
          args: ["pos1", "pos2"],
          options: [],
          positionalArgs: [
            createInternalPositionalArg({ name: "pos1", isArray: true }),
          ],
        })
      ).toEqual({
        candidates: [],
        positionalCandidates: [
          {
            name: "pos1",
            value: ["pos1", "pos2"],
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("help", () => {
      expect(
        parse({
          args: ["pos1", "--help"],
          options: [],
          positionalArgs: [createInternalPositionalArg({ name: "pos1" })],
        })
      ).toEqual({
        candidates: [],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
        ],
        isHelp: true,
        isVersion: false,
      });
    });

    test("option value type", () => {
      expect(
        parse({
          args: [
            "--opt1",
            "opt1",
            "--opt2=opt2",
            "-b10",
            "-cd",
            "opt5",
            "--opt6=",
            "pos1",
          ],
          options: [
            createInternalOption({ name: "opt1" }),
            createInternalOption({ name: "opt2" }),
            createInternalOption({ name: "opt3", alias: "b" }),
            createInternalOption({ name: "opt4", type: "boolean", alias: "c" }),
            createInternalOption({ name: "opt5", alias: "d" }),
            createInternalOption({ name: "opt6" }),
          ],
          positionalArgs: [createInternalPositionalArg({})],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: "opt1",
            isNegative: false,
          },
          {
            name: "opt2",
            value: "opt2",
            isNegative: false,
          },
          {
            name: "opt3",
            value: "10",
            isNegative: false,
          },
          {
            name: "opt4",
            value: undefined,
            isNegative: false,
          },
          {
            name: "opt5",
            value: "opt5",
            isNegative: false,
          },
          {
            name: "opt6",
            value: "",
            isNegative: false,
          },
        ],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });
  });

  describe("unified option", () => {
    test("single character alias", () => {
      expect(
        parse({
          args: ["-ab", "pos1"],
          options: [
            createInternalOption({ name: "opt1", type: "boolean", alias: "a" }),
            createInternalOption({ name: "opt2", type: "boolean", alias: "b" }),
          ],
          positionalArgs: [createInternalPositionalArg({ name: "pos1" })],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: undefined,
            isNegative: false,
          },
          {
            name: "opt2",
            value: undefined,
            isNegative: false,
          },
        ],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("multiple character alias", () => {
      expect(
        parse({
          args: ["-ab", "pos1"],
          options: [
            createInternalOption({
              name: "opt1",
              type: "boolean",
              alias: "ab",
            }),
          ],
          positionalArgs: [createInternalPositionalArg({ name: "pos1" })],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: undefined,
            isNegative: false,
          },
        ],
        positionalCandidates: [
          {
            name: "pos1",
            value: "pos1",
          },
        ],
        isHelp: false,
        isVersion: false,
      });
    });

    test("multiple character alias and string type", () => {
      expect(
        parse({
          args: ["-ab", "str1"],
          options: [
            createInternalOption({ name: "opt1", type: "string", alias: "ab" }),
          ],
          positionalArgs: [],
        })
      ).toEqual({
        candidates: [
          {
            name: "opt1",
            value: "str1",
            isNegative: false,
          },
        ],
        positionalCandidates: [],
        isHelp: false,
        isVersion: false,
      });
    });
  });

  describe("exception", () => {
    test("Option 'opt1' needs value: opt1", () => {
      expect(() => {
        parse({
          args: ["--opt1"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [],
        });
      }).toThrow("Option 'opt1' needs value: opt1");
    });

    test("missing option name", () => {
      expect(() => {
        parse({
          args: ["--missing", "value"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [],
        });
      }).toThrow("Invalid option");
    });

    test("missing option arg on multiple options", () => {
      expect(() => {
        parse({
          args: ["--opt1", "--opt2", "opt2"],
          options: [
            createInternalOption({ name: "opt1" }),
            createInternalOption({ name: "opt2" }),
          ],
          positionalArgs: [],
        });
      }).toThrow("Option 'opt1' needs value: opt1");
    });

    test("too many positional arguments when option exists", () => {
      expect(() => {
        parse({
          args: ["pos1"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [],
        });
      }).toThrow("Too many positional arguments");
    });

    test("too many positional arguments when option and positional option exist", () => {
      expect(() => {
        parse({
          args: ["pos1", "pos2"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [createInternalPositionalArg({ name: "pos1" })],
        });
      }).toThrow("Too many positional arguments");
    });

    test("multiple positional argument groups", () => {
      expect(() => {
        parse({
          args: ["pos1", "--opt1=opt1", "pos2"],
          options: [createInternalOption({ name: "opt1" })],
          positionalArgs: [createInternalPositionalArg({ name: "pos1" })],
        });
      }).toThrow("Positional arguments specified twice");
    });

    describe("unified option", () => {
      test("-abc => -ab -c", () => {
        expect(() => {
          parse({
            args: ["-abc"],
            options: [
              createInternalOption({
                name: "opt1",
                type: "boolean",
                alias: "ab",
              }),
              createInternalOption({
                name: "opt1",
                type: "boolean",
                alias: "c",
              }),
            ],
            positionalArgs: [],
          });
        }).toThrow("Invalid option: a");
      });
      test("-abc1 => -abc=1", () => {
        expect(() => {
          parse({
            args: ["-abc1"],
            options: [
              createInternalOption({
                name: "opt1",
                type: "string",
                alias: "abc",
              }),
            ],
            positionalArgs: [],
          });
        }).toThrow("Invalid option: a");
      });
      test("-= is invalid", () => {
        expect(() => {
          parse({
            args: ["-="],
            options: [],
            positionalArgs: [],
          });
        }).toThrow("Invalid option: -=");
      });
      test("--= is invalid", () => {
        expect(() => {
          parse({
            args: ["--="],
            options: [],
            positionalArgs: [],
          });
        }).toThrow("Invalid option: ");
      });
    });
  });
});

describe("parseMultiCommand", () => {
  test("parse", () => {
    expect(
      parseMultiCommand({
        args: ["cmd1", "--opt1", "opt_str1"],
        commands: [
          {
            name: "cmd1",
            options: [
              createInternalOption({ name: "opt1" }),
              createInternalOption({ name: "opt2" }),
            ],
            positionalArgs: [],
          },
        ],
      })
    ).toEqual({
      commandName: "cmd1",
      candidates: [
        {
          name: "opt1",
          value: "opt_str1",
          isNegative: false,
        },
      ],
      positionalCandidates: [],
      isHelp: false,
      isVersion: false,
    });
  });

  test("global help", () => {
    expect(
      parseMultiCommand({
        args: ["--help"],
        commands: [
          {
            name: "cmd1",
            options: [
              createInternalOption({ name: "opt1" }),
              createInternalOption({ name: "opt2" }),
            ],
            positionalArgs: [],
          },
        ],
      })
    ).toEqual({
      candidates: [],
      positionalCandidates: [],
      isHelp: true,
      isVersion: false,
    });
  });

  test("command help when '--help' before command name", () => {
    expect(
      parseMultiCommand({
        args: ["--help", "cmd1"],
        commands: [
          {
            name: "cmd1",
            options: [
              createInternalOption({ name: "opt1" }),
              createInternalOption({ name: "opt2" }),
            ],
            positionalArgs: [],
          },
        ],
      })
    ).toEqual({
      commandName: "cmd1",
      candidates: [],
      positionalCandidates: [],
      isHelp: true,
      isVersion: false,
    });
  });

  test("command help when '--help' after command name", () => {
    expect(
      parseMultiCommand({
        args: ["cmd1", "--help"],
        commands: [
          {
            name: "cmd1",
            options: [
              createInternalOption({ name: "opt1" }),
              createInternalOption({ name: "opt2" }),
            ],
            positionalArgs: [],
          },
        ],
      })
    ).toEqual({
      commandName: "cmd1",
      candidates: [],
      positionalCandidates: [],
      isHelp: true,
      isVersion: false,
    });
  });

  test("version", () => {
    expect(
      parseMultiCommand({
        args: ["--version"],
        commands: [
          {
            name: "cmd1",
            options: [
              createInternalOption({ name: "opt1" }),
              createInternalOption({ name: "opt2" }),
            ],
            positionalArgs: [],
          },
        ],
      })
    ).toEqual({
      candidates: [],
      positionalCandidates: [],
      isHelp: false,
      isVersion: true,
    });
  });
});
