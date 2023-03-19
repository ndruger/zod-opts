import { z } from "zod";
// import { parser } from "zod-opts";
import { parser } from "../src/index";

const OptionsSchema = z.object({
  opt1: z.string(),
  opt2: z.number().optional(),
  pos1: z.enum(["a", "b"]),
});

type Options = z.infer<typeof Options>;

function parseOptions(): Options {
  return parser()
    .name("scriptA")
    .version("1.0.0")
    .description("desc")
    .options({
      opt1: { type: OptionsSchema.shape.opt1 },
      opt2: { type: OptionsSchema.shape.opt2 },
    })
    .args([
      {
        name: "pos1",
        type: OptionsSchema.shape.pos1,
      },
    ])
    .parse();
}

const options = parseOptions();
console.log(options);
