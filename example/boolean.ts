import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

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
console.log(parsed);
