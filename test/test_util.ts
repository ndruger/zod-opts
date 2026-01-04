import { expect, jest } from "@jest/globals";

import type {
  BaseType,
  InternalOption,
  InternalPositionalArgument,
} from "../src/type";

export function mockConsole(
  type: "error" | "warn" | "debug" | "log" = "error"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return jest.spyOn(console, type).mockImplementation(() => {});
}

export function mockExit(): jest.SpiedFunction<typeof process.exit> {
  return jest.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`process.exit: ${code as number}`);
  });
}

export function expectExit0(expectedMessage: string, f: () => void): void {
  const mockedConsoleLog = mockConsole("log");
  const mockedExit = mockExit();
  expect(f).toThrow(/process.exit/);

  const logText = mockedConsoleLog.mock.calls.flat().join("\n");
  expect(logText).toEqual(expectedMessage);
  expect(mockedExit).toHaveBeenCalledWith(0);
  mockedConsoleLog.mockRestore();
  mockedExit.mockRestore();
}

export function expectProcessExit(
  expectedMessage: string | RegExp,
  exitCode: number,
  f: () => void
): void {
  const mockedConsoleError = mockConsole();
  const mockedExit = mockExit();
  expect(f).toThrow(/process.exit/);

  const logText = mockedConsoleError.mock.calls.flat().join("");
  if (typeof expectedMessage === "string") {
    expect(logText).toContain(expectedMessage);
  } else {
    expect(logText).toMatch(expectedMessage);
  }
  expect(mockedExit).toHaveBeenCalledWith(exitCode);
  mockedConsoleError.mockRestore();
  mockedExit.mockRestore();
}

export function createInternalOption({
  type = "string",
  name = "opt1",
  alias = "a",
  required = true,
  description,
  defaultValue,
  enumValues,
  isArray = false,
}: {
  type?: BaseType;
  name?: string;
  alias?: string;
  required?: boolean;
  description?: string;
  defaultValue?: number | string | boolean;
  enumValues?: string[];
  isArray?: boolean;
}): InternalOption {
  return {
    type,
    name,
    alias,
    required,
    description,
    defaultValue,
    enumValues,
    isArray,
  };
}

export function createInternalPositionalArgument({
  type = "string",
  name = "pos1",
  required = true,
  isArray = false,
  enumValues,
}: {
  type?: "string" | "number";
  name?: string;
  required?: boolean;
  isArray?: boolean;
  enumValues?: string[];
}): InternalPositionalArgument {
  return { type, name, required, isArray, enumValues };
}
