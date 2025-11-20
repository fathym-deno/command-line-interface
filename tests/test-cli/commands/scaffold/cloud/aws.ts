import { type CommandContext, CommandParams, CommandRuntime, defineCommandModule } from "../../../mod.ts";
import { z } from "@fathym/common/third-party/zod";

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class AWSCommandParams extends CommandParams<
  z.infer<typeof FlagsSchema>,
  z.infer<typeof ArgsSchema>
> {
  // Add getters here when flags/args grow
}

export class AWSCommand extends CommandRuntime<AWSCommandParams> {
  constructor(params: AWSCommandParams) {
    super(params, ArgsSchema, FlagsSchema);
  }

  public override Run(ctx: CommandContext): void | number {
    ctx.Log.Info("🔧 Scaffolding AWS...");
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Scaffold AWS",
      "Generate a new AWS file.",
    );
  }
}

export default defineCommandModule({
  FlagsSchema,
  ArgsSchema,
  Command: AWSCommand,
  Params: AWSCommandParams,
});
