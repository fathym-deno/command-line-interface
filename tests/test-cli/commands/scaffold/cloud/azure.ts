import { z } from '../../../.deps.ts';
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from '../../../../../src/cli/commands/.exports.ts';

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class AzureCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export class AzureCommand extends CommandRuntime<AzureCommandParams> {
  public override Run(ctx: CommandContext): void | number {
    ctx.Log.Info('🔧 Scaffolding Azure...');
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      'Scaffold Azure',
      'Generate a new Azure file.',
    );
  }
}

export default defineCommandModule({
  FlagsSchema,
  ArgsSchema,
  Command: AzureCommand,
  Params: AzureCommandParams,
});
