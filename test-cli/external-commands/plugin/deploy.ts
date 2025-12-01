import { z } from "../../.deps.ts";
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from "../../../src/commands/.exports.ts";

export const FlagsSchema = z.object({
  target: z.string().optional(),
});
export const ArgsSchema = z.tuple([]);

export class DeployCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Target(): string {
    return this.Flags?.target ?? "production";
  }
}

export class DeployCommand extends CommandRuntime<DeployCommandParams> {
  public override Run(ctx: CommandContext<DeployCommandParams>): void | number {
    ctx.Log.Info(`🚀 Deploying to ${ctx.Params.Target}...`);
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Deploy",
      "Deploy the application to a target environment.",
      ArgsSchema,
      FlagsSchema,
    );
  }
}

export default defineCommandModule({
  FlagsSchema,
  ArgsSchema,
  Command: DeployCommand,
  Params: DeployCommandParams,
});
