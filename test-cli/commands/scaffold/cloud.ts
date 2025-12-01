import { z } from "../../.deps.ts";
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from "../../../src/commands/.exports.ts";

export const FlagsSchema = z.object({
  name: z.string().describe("The name"),
});
export const ArgsSchema = z.tuple([]);

export class CloudCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export class CloudCommand extends CommandRuntime<CloudCommandParams> {
  public override Run(ctx: CommandContext): void | number {
    ctx.Log.Info("🔧 Scaffolding Cloud...");
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Scaffold Cloud",
      "Generate a new Cloud file.",
      ArgsSchema,
      FlagsSchema,
    );
  }
}

export default defineCommandModule({
  FlagsSchema,
  ArgsSchema,
  Command: CloudCommand,
  Params: CloudCommandParams,
});
