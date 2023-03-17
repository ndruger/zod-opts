import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

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
