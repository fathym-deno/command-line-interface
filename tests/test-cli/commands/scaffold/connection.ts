import { z } from '../../.deps.ts';
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from '../../../../src/cli/commands/.exports.ts';

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class ConnectionCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export class ConnectionCommand extends CommandRuntime<ConnectionCommandParams> {
  public override Run(ctx: CommandContext): void | number {
    ctx.Log.Info('🔧 Scaffolding connection...');
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      'Scaffold Connection',
      'Generate a new connection file.',
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
