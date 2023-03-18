import { z } from "zod";
// import { parser } from "zod-opts";
import { parser, command } from "../src/index";

const command1 = command("command1")
  .options({
    option1: {
      type: z.boolean().default(false),
    },
  })
  .action((parsed) => {
    // parsed is inferred as { option1: boolean }
    console.log("command1", parsed);
  });

const command2 = command("command2")
  .options({
    option1: {
      type: z.string(),
    },
  })
  .action((parsed) => {
    // parsed is inferred as { option1: string }
    console.log("command2", parsed);
  });

parser().subcommand(command1).subcommand(command2).parse();
