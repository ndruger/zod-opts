import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

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
