import { z } from "../../.deps.ts";
import { Command } from "../../../src/fluent/Command.ts";
import { CommandParams } from "../../../src/commands/CommandParams.ts";
import { default as CloudCommand } from "./cloud.ts";

export const FlagsSchema = z.object({});
export const ArgsSchema = z.tuple([]);

export class ConnectionCommandParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  // Add getters here when flags/args grow
}

export default Command("Scaffold Connection", "Generate a new connection file.")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(ConnectionCommandParams)
  .Commands({
    cloud: CloudCommand,
  })
  .Run(({ Log, Commands }) => {
    Commands!.cloud([], {
      name: "hello",
    });

    Log.Info("🔧 Scaffolding connection...");
  });
