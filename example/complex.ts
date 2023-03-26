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
      argumentName: "NameA", // used in Usage.
    },
    option2: {
      type: z
        .string()
        .regex(/[a-z]+/) // you can use zod's methods.
        .optional(), // if optional() is specified, it will be optional option and the parsed.option2 will be string | undefined.
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
