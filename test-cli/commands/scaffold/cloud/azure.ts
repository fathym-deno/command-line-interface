import { z } from "../../../.deps.ts";
import { Command } from "../../../../src/fluent/Command.ts";
import { CommandParams } from "../../../../src/commands/CommandParams.ts";

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class AzureCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export default Command("Scaffold Azure", "Generate a new Azure file.")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(AzureCommandParams)
  .Run(({ Log }) => {
    Log.Info("🔧 Scaffolding Azure...");
  });
