import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

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
      throw Error("option1 and option2 must be different");
    }
    return true;
  })
  .parse();

console.log(parsed);
