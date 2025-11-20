import { type CommandContext, CommandParams, CommandRuntime, defineCommandModule } from "../../../mod.ts";
import { z } from "@fathym/common/third-party/zod";

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class ConnectionCommandParams extends CommandParams<
  z.infer<typeof FlagsSchema>,
  z.infer<typeof ArgsSchema>
> {
  // Add getters here when flags/args grow
}

export class ConnectionCommand extends CommandRuntime<ConnectionCommandParams> {
  public override Run(ctx: CommandContext): void | number {
    ctx.Log.Info("🔧 Scaffolding connection...");
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Scaffold Connection",
      "Generate a new connection file.",
      ArgsSchema,
      FlagsSchema,
    );
  }
}

// 🔹 Final CLI module export using the helper
export default defineCommandModule({
  FlagsSchema,
  ArgsSchema,
  Command: ConnectionCommand,
  Params: ConnectionCommandParams,
});
