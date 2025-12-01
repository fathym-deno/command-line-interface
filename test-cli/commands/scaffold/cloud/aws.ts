import { z } from "../../../.deps.ts";
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from "../../../../src/commands/.exports.ts";

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class AWSCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export class AWSCommand extends CommandRuntime<AWSCommandParams> {
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
