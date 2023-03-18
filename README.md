# ZodOpts

![ci](https://github.com/ndruger/zod-opts/actions/workflows/ci/badge.svg)
[![NPM Version](http://img.shields.io/npm/v/zod-opts.svg?style=flat)](https://www.npmjs.org/package/zod-opts)

A library that simplifies the process of parsing and validating command-line arguments using the [Zod](https://github.com/colinhacks/zod) validation library

<!-- TOC -->

- [ZodOpts](#zodopts)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Options](#options)
    - [Various option types](#various-option-types)
      - [boolean types](#boolean-types)
      - [enum types](#enum-types)
      - [array types](#array-types)
    - [Custom validation](#custom-validation)
    - [Variadic arguments](#variadic-arguments)
  - [Commands](#commands)

<!-- /TOC -->

## Installation

```bash
npm install zod-opts # npm

yarn add zod-opts # yarn
```

## Quick Start

File: [simple.ts](./example/simple.ts)

```ts
import { z } from "zod";
import { parser } from "zod-opts";

const parsed = parser()
  .options({
    option1: {
      type: z.boolean().default(false),
      alias: "a",
    },
    option2: {
      type: z.string(),
    },
  })
  .parse(); // same with .parse(process.argv.slice(2))

// parsed is inferred as { option1: boolean, option2: string }
console.log(parsed);
```

```bash
# Valid options
$ node simple.js --option1 --option2=str  # or `node simple.js -a --option2 str`
{ option1: true, option2: 'str' }

# Help
$ node simple.js --help
Usage: simple.js [options]

Options:
  -h, --help              Show help
  -a, --option1           (default: false)
      --option2 <string>                    [required]

# Invalid options show help and make exit(1)
$ node simple.js
Required option is missing: option2

Usage: simple.js [options]

Options:
  -h, --help              Show help
  -a, --option1           (default: false)
      --option2 <string>                    [required]
```

File: [complex.ts](./example/complex.ts)

```ts
import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

const parsed = parser()
  .name("scriptA") // script name on Usage
  .version("1.0.0") // version on Usage
  .options({
    option1: {
      // if default() is specified, it will be optional option.
      type: z.string().describe("description of option").default("default"),
      argName: "NameA", // used in Usage.
    },
    option2: {
      type: z
        .string()
        .regex(/[a-z]+/) // you can use zod's various methods.
        .optional(), // if optional() is specified, it will be optional option.
    },
    option3: {
      type: z.number().min(5), // accepts only number and greater than 5.
    },
    option4: {
      type: z.enum(["a", "b", "c"]).default("b"), // accepts only "a", "b", "c" and default is "b".
    },
  })
  .args([
    {
      // And required arguments.
      name: "arg1",
      type: z.string(),
    },
  ])
  .parse();

// parsed is inferred as below.
// const parsed: {
//   option1: string;
//   option2?: string | undefined;
//   option3: number;
//   option4: "a" | "b" | "c";
//   arg1: string;
// }
console.log(parsed);
```

```bash
# Valid options
$  node complex.js --option3=10 arg_str
{
  option1: 'default',
  option2: undefined,
  option3: 10,
  option4: 'b',
  arg1: 'arg_str'
}

# Help
$  node complex.js --help
Usage: scriptA [options] <arg1>

Arguments:
  arg1    [required]

Options:
  -h, --help              Show help
  -V, --version           Show version
      --option1 <NameA>   description of option (default: "default")
      --option2 <string>
      --option3 <number>                                              [required]
      --option4 <string>  (choices: "a", "b", "c") (default: "b")
```

## Options

### Various option types

#### boolean types

- .options() supports boolean type
- .args() DOES NOT support boolean type

File: [boolean.ts](./example/boolean.ts)

```ts
const parsed = parser()
  .options({
    option1: {
      type: z.boolean(), // required option. type is boolean
    },
    option2: {
      type: z.boolean().default(false), // optional option. type is boolean
    },
    option3: {
      type: z.boolean().optional(), // optional option. type is boolean|undefined
    },
    option4: {
      type: z.boolean().default(false).optional(), // optional option. type is boolean|undefined
    },
  })
  .parse();

// parsed is inferred as below:
// const parsed: {
//     option1: boolean;
//     option2: boolean;
//     option3?: boolean;
//     option4?: boolean;
// }
```

#### enum types

- .options() supports enum type
- .args() supports enum type

File: [enum.ts](./example/enum.ts)

```ts
const parsed = parser()
  .options({
    option1: {
      type: z.enum(["a", "b"]), // required option. type is "a"|"b"
    },
    option2: {
      type: z.enum(["a", "b"]).default("b"), // optional option. type is "a"|"b"
    },
    option3: {
      type: z.enum(["a", "b"]).optional(), // optional option. type is "a"|"b"|undefined
    },
    option4: {
      type: z.enum(["a", "b"]).default("b").optional(), // optional option. type is "a"|"b"|undefined
    },
  })
  .args([
    {
      name: "position1",
      type: z.enum(["a", "b"]), // required arg. type is "a"|"b"
    },
  ])
  .parse();

// parsed is inferred as below:
// const parsed: {
//   option1: "a" | "b";
//   option2: "a" | "b";
//   option3?: "a" | "b";
//   option4?: "a" | "b";
//   position1: "a" | "b";
// };
console.log(parsed);
```

#### array types

- .options() DOES NOT support array type now(will be supported soon...)
- .args() supports array type

File: [array.ts](./example/array.ts)

```ts
const parsed = parser()
  .args([
    {
      name: "pos",
      type: z.array(z.string()), // required arg. type is string[]
      //   type: z.array(z.string()).default([]), // optional arg. type is string[] and default is []
    },
  ])
  .parse();

// parsed is inferred as below:
// const parsed: {
//   pos: string[];
// };
console.log(parsed);
```

```bash
# Valid options
$ node dist/example/array.js str1 str2
{ pos: [ 'str1', 'str2' ] }

# Invalid options (empty array is not permitted. use `.default([])` instead).
$ node dist/example/array.js
Required option is missing: pos

Usage: array.js [options] <pos ...>

Arguments:
  pos    [required]

Options:
  -h, --help  Show help
```

### Custom validation

You can use Zod's `.refine()` method to validate each option(e.g. `z.string().refine((v) => v === "foo" || v === "bar", {message: "option1 must be foo or bar"}`).

If you want to check combinations of options, you can use `.validation()` method. `.validation()` registers the custom validation function. And the function is called after default validation.

File: [custom_validation.ts](./example/custom_validation.ts)

```ts
const parsed = parser()
  .options({
    option1: {
      type: z.number(),
    },
    option2: {
      type: z.number(),
    },
  })
  .validation((parsed) => {
    if (parsed.option1 === parsed.option2) {
      throw Error("option1 and option2 must be different"); // or return "option1 and option2 must be different"
    }
    return true;
  })
  .parse();

console.log(parsed);
```

```bash
# Valid options
$ node dist/example/custom_validation.js --option1=10 --option2=11
{ option1: 10, option2: 11 }

# Invalid options
$ node dist/example/custom_validation.js --option1=10 --option2=10
option1 and option2 must be different

Usage: custom_validation.js [options]

Options:
  -h, --help              Show help
      --option1 <number>             [required]
      --option2 <number>             [required]
```

### Variadic arguments

Please refer [array types](#array-types).

## Commands

TODO
