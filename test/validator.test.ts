import { parse } from "../src/internal_parser";
import {
  validate,
  validateCandidateValue,
  validatePositionalCandidateValue,
} from "../src/validator";
import { createInternalOption, createInternalPositionalArg } from "./test_util";

describe("validateCandidateValue()", () => {
  test("valid", () => {
    expect(
      validateCandidateValue(
        createInternalOption({ type: "string" }),
        "str",
        false
      )
    ).toEqual({
      value: "str",
    });

    expect(
      validateCandidateValue(
        createInternalOption({ type: "string" }),
        "",
        false
      )
    ).toEqual({
      value: "",
    });

    expect(
      validateCandidateValue(
        createInternalOption({ type: "number" }),
        "10",
        false
      )
    ).toEqual({
      value: 10,
    });

    expect(
      validateCandidateValue(
        createInternalOption({ type: "number" }),
        "-10.1",
        false
      )
    ).toEqual({
      value: -10.1,
    });

    expect(
      validateCandidateValue(
        createInternalOption({ type: "boolean" }),
        undefined,
        false
      )
    ).toEqual({
      value: true,
    });

    expect(
      validateCandidateValue(
        createInternalOption({ type: "boolean" }),
        undefined,
        true
      )
    ).toEqual({
      value: false,
    });
  });

  test("invalid", () => {
    expect(
      validateCandidateValue(
        createInternalOption({ type: "string" }),
        undefined,
        false
      )
    ).toEqual(undefined);

    expect(
      validateCandidateValue(
        createInternalOption({ type: "number" }),
        undefined,
        false
      )
    ).toEqual(undefined);

    expect(
      validateCandidateValue(
        createInternalOption({ type: "number" }),
        "str",
        false
      )
    ).toEqual(undefined);

    expect(
      validateCandidateValue(
        createInternalOption({ type: "boolean" }),
        "str",
        false
      )
    ).toEqual(undefined);
  });
});

describe("validatePositionalCandidateValue()", () => {
  test("valid", () => {
    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "string" }),
        "str"
      )
    ).toEqual({
      value: "str",
    });

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number" }),
        "10"
      )
    ).toEqual({
      value: 10,
    });

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number" }),
        "-10.1"
      )
    ).toEqual({
      value: -10.1,
    });

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "string", isArray: true }),
        ["str1", "str2"]
      )
    ).toEqual({
      value: ["str1", "str2"],
    });

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number", isArray: true }),
        ["10", "-10.1"]
      )
    ).toEqual({
      value: [10, -10.1],
    });
  });

  test("invalid", () => {
    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "string" }),
        undefined
      )
    ).toEqual(undefined);

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number" }),
        undefined
      )
    ).toEqual(undefined);

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "string" }),
        ""
      )
    ).toEqual({ value: "" });

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number" }),
        "str"
      )
    ).toEqual(undefined);

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number", isArray: true }),
        ["str"]
      )
    ).toEqual(undefined);

    expect(
      validatePositionalCandidateValue(
        createInternalPositionalArg({ type: "number", isArray: true }),
        ["10", ""]
      )
    ).toEqual(undefined);
  });
});

describe("validate()", () => {
  test("returns validated result", () => {
    const params = {
      options: [createInternalOption({ name: "opt1" })],
      positionalArgs: [],
      args: ["--opt1", "opt_str1"],
    };
    const parsed = parse(params);
    expect(validate(parsed, params.options, params.positionalArgs)).toEqual({
      options: [
        {
          name: "opt1",
          value: "opt_str1",
        },
      ],
      positionalArgs: [],
    });
  });
});
