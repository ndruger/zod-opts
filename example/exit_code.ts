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
      return "option1 and option2 must be different";
    }
    return true;
  })
  .onExit((result) => {
    // result.type: "error" | "help" | "version"
    // result.reason: "parse" | "schema" | "validation" (only when type is "error")
    if (result.type === "error" && result.reason !== "validation") {
      return 2; // usage error
    }
    // Returning nothing uses the default exit code (error: 1, help/version: 0)
  })
  .parse();

console.log(parsed);
