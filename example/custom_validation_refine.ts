import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

const parsed = parser()
  .options({
    option1: {
      type: z.string().refine((v) => v === "foo" || v === "bar", {
        message: "option1 must be foo or bar",
      }),
    },
  })
  .parse();

console.log(parsed);
