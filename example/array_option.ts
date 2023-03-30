import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

const parsed = parser()
  .options({
    opt: {
      type: z.array(z.string()), // required arg. type is string[]
      //   type: z.array(z.string()).default([]), // optional arg. type is string[] and default is []
    },
  })
  .parse();

// parsed is inferred as below:
// const parsed: {
//   opt: string[];
// };
console.log(parsed);
