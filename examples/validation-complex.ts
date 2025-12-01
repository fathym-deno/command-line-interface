/**
 * Complex Type Resolution Example
 *
 * Demonstrates automatic file-path-or-JSON resolution for complex types:
 * - ZodObject flags auto-resolve from file paths
 * - Also accepts inline JSON strings
 * - Eliminates need for separate --config and --config-file flags
 *
 * Usage:
 *   mycli deploy --config ./config.json
 *   mycli deploy --config '{"host":"localhost","port":3000}'
 *   mycli deploy --config ./config.json --targets '["us-east","eu-west"]'
 */

import { Command, CommandParams } from "../src/.exports.ts";
import { z } from "../src/.deps.ts";

// Complex config schema - auto fileCheck: true
const ConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  debug: z.boolean().optional(),
  features: z.array(z.string()).optional(),
});

// Array schema - also auto fileCheck: true
const TargetsSchema = z.array(z.string());

const ArgsSchema = z.tuple([
  z.string().optional().describe("Environment").meta({ argName: "env" }),
]);

const FlagsSchema = z.object({
  config: ConfigSchema.describe("Deployment configuration"),
  targets: TargetsSchema.optional().describe("Deployment targets"),
  force: z.boolean().optional().describe("Skip confirmation"),
  "dry-run": z.boolean().optional(),
});

class DeployParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Environment() {
    return this.Arg(0) ?? "production";
  }
  get Config() {
    return this.Flag("config")!;
  }
  get Targets() {
    return this.Flag("targets") ?? ["default"];
  }
  get Force() {
    return this.Flag("force") ?? false;
  }
}

export default Command("deploy", "Deploy with complex configuration")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(async ({ Params, Log }) => {
    // Config is already a parsed object - no manual JSON.parse needed!
    Log.Info(`Deploying to ${Params.Environment}`);
    Log.Info(`Server: ${Params.Config.host}:${Params.Config.port}`);

    if (Params.Config.debug) {
      Log.Info("Debug mode enabled");
    }

    for (const target of Params.Targets) {
      Log.Info(`  -> Target: ${target}`);
    }

    if (Params.Config.features?.length) {
      Log.Info(`Features: ${Params.Config.features.join(", ")}`);
    }
  })
  .Build();
