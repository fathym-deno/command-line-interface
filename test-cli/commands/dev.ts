import { z } from "../.deps.ts";
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from "../../src/commands/.exports.ts";

export const DevFlagsSchema = z.object({
  Verbose: z.boolean().optional().describe("Enable verbose logging"),
  Docker: z.boolean().optional().describe("Run in Docker"),
  "dry-run": z.boolean().optional().describe("Run without side effects"),
});

export const DevArgsSchema = z.tuple([
  z.string().optional().describe("Target workspace"),
]);

export class DevCommandParams extends CommandParams<
  z.infer<typeof DevArgsSchema>,
  z.infer<typeof DevFlagsSchema>
> {
  public get Verbose(): boolean {
    return this.Flag("Verbose") ?? false;
  }

  public get Docker(): boolean {
    return this.Flag("Docker") ?? false;
  }

  public get Workspace(): string {
    return this.Arg(0) ?? "default";
  }
}

export class DevCommand extends CommandRuntime<DevCommandParams> {
  public override Run(ctx: CommandContext<DevCommandParams>): void | number {
    if (ctx.Params.Verbose) {
      ctx.Log.Info("📣 Verbose mode enabled");
    }

    ctx.Log.Info("🔧 Running Open Industrial in dev mode...");
    ctx.Log.Info(`📁 Workspace: ${ctx.Params.Workspace}`);

    if (ctx.Params.Docker) {
      ctx.Log.Info("🐳 Launching in Docker...");
    } else {
      ctx.Log.Info("🧪 Launching in local dev mode...");
    }
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Development Mode",
      "Run Open Industrial in dev mode",
      DevArgsSchema,
      DevFlagsSchema,
    );
  }
}

export default defineCommandModule({
  FlagsSchema: DevFlagsSchema,
  ArgsSchema: DevArgsSchema,
  Command: DevCommand,
  Params: DevCommandParams,
});
