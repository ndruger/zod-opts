import {
  generateGlobalCommandHelp,
  generateGlobalHelp,
  generateGlobalUsage,
  generateOptionsText,
  generatePositionalArgumentsText,
} from "../src/help";
import type {
  InternalCommand,
  InternalOption,
  InternalPositionalArgument,
} from "../src/type";
import { createInternalOption } from "./test_util";

describe("generateOptionsText()", () => {
  test("", () => {
    const options: InternalOption[] = [
      createInternalOption({
        type: "boolean",
        name: "foo",
        description: "foo description",
        required: false,
        defaultValue: true,
      }),
      createInternalOption({
        type: "string",
        name: "aaaaaaaaaaaa",
        required: false,
        defaultValue: "default",
      }),
      createInternalOption({
        type: "number",
        name: "num",
        description: "description2",
        required: false,
        defaultValue: 100,
      }),
      {
        type: "number",
        name: "name",
        required: true,
        argName: "argNameA",
      },
    ];
    const result = generateOptionsText(options);
    expect(result).toEqual(`Options:
  -a, --foo                    foo description (default: true)            
  -a, --aaaaaaaaaaaa <string>  (default: "default")                       
  -a, --num <number>           description2 (default: 100)                
      --name <argNameA>                                         [required]`);
  });
});

describe("generateGlobalUsage()", () => {
  test("common", () => {
    const scriptName = "scriptA";
    const positionalArgs: InternalPositionalArgument[] = [
      {
        name: "positional1",
        type: "string",
        required: true,
        isArray: false,
      },
      {
        name: "positional2",
        type: "number",
        required: true,
        isArray: false,
      },
      {
        name: "positional3",
        type: "string",
        required: false,
        defaultValue: [],
        isArray: true,
      },
    ];
    const result = generateGlobalUsage(scriptName, positionalArgs);
    expect(result).toBe(
      "Usage: scriptA [options] <positional1> <positional2> [positional3 ...]"
    );
  });
});

describe("generatePositionalArgumentsText()", () => {
  test("", () => {
    const positionalArgs: InternalPositionalArgument[] = [
      {
        name: "positional1",
        type: "string",
        required: true,
        isArray: false,
      },
      {
        name: "positional2",
        type: "number",
        required: true,
        isArray: false,
      },
      {
        name: "positional3",
        type: "string",
        required: false,
        defaultValue: [],
        isArray: true,
      },
    ];
    const result = generatePositionalArgumentsText(positionalArgs);
    expect(result).toEqual(`Arguments:
  positional1                 [required]
  positional2                 [required]
  positional3  (default: [])            `);
  });
});

describe("generateGlobalHelp()", () => {
  test("common", () => {
    const options: InternalOption[] = [
      createInternalOption({
        type: "boolean",
        name: "foo",
        description: "foo description",
        required: false,
        defaultValue: true,
      }),
      createInternalOption({
        type: "string",
        name: "aaaaaaaaaaaa",
        required: false,
        defaultValue: "default",
      }),
      createInternalOption({
        type: "number",
        name: "num",
        description: "description2",
        required: false,
        defaultValue: 100,
      }),
      createInternalOption({
        type: "string",
        name: "enum",
        description: "description3",
        required: false,
        enumValues: ["a", "b", "c"],
        defaultValue: "b",
      }),
      {
        type: "number",
        name: "name1",
        required: true,
      },
    ];

    const positionalArgs: InternalPositionalArgument[] = [
      {
        name: "positional1",
        type: "string",
        required: true,
        isArray: false,
      },
      {
        name: "positional2",
        type: "number",
        required: true,
        isArray: false,
      },
      {
        name: "positional3",
        type: "string",
        required: true,
        isArray: false,
        enumValues: ["a", "b", "c"],
        defaultValue: "b",
      },
      {
        name: "positional4",
        type: "string",
        required: false,
        defaultValue: [],
        isArray: true,
      },
    ];
    const result = generateGlobalHelp({
      options,
      positionalArgs,
      name: "scriptA",
      version: "1.0.0",
    });
    const expected = `Usage: scriptA [options] <positional1> <positional2> <positional3> [positional4 ...]

Arguments:
  positional1                                           [required]
  positional2                                           [required]
  positional3  (choices: "a", "b", "c") (default: "b")  [required]
  positional4  (default: [])                                      

Options:
  -h, --help                   Show help                                                       
  -V, --version                Show version                                                    
  -a, --foo                    foo description (default: true)                                 
  -a, --aaaaaaaaaaaa <string>  (default: "default")                                            
  -a, --num <number>           description2 (default: 100)                                     
  -a, --enum <string>          description3 (choices: "a", "b", "c") (default: "b")            
      --name1 <number>                                                               [required]
`;
    expect(result).toBe(expected);
  });

  test("minium arguments", () => {
    const result = generateGlobalHelp({
      options: [],
      positionalArgs: [],
    });
    const expected = `Usage: program [options] 

Options:
  -h, --help  Show help  
`;
    expect(result).toBe(expected);
  });
});

describe("generateGlobalCommandHelp()", () => {
  test("common", () => {
    const commands: InternalCommand[] = [
      {
        name: "command1",
        description: "goog command",
        options: [],
        positionalArgs: [],
      },
      {
        name: "command2",
        description: "bad command",
        options: [],
        positionalArgs: [],
      },
    ];
    const result = generateGlobalCommandHelp({
      commands,
      name: "scriptA",
      version: "1",
    });
    const expected = `Usage: scriptA [options] <command>

Commands:
  command1  goog command
  command2  bad command 

Options:
  -h, --help     Show help     
  -V, --version  Show version  
`;
    expect(result).toBe(expected);
  });

  test("minimum arguments", () => {
    const commands: InternalCommand[] = [
      {
        name: "command1",
        description: "goog command",
        options: [],
        positionalArgs: [],
      },
    ];
    const result = generateGlobalCommandHelp({
      commands,
    });
    const expected = `Usage: script [options] <command>

Commands:
  command1  goog command

Options:
  -h, --help  Show help  
`;
    expect(result).toBe(expected);
  });
});
