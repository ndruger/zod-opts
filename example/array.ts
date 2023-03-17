import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

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
