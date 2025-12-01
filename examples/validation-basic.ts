/**
 * Basic Schema Validation Example
 *
 * Demonstrates how Zod schemas are validated at runtime:
 * - Args validated against ArgsSchema
 * - Flags validated against FlagsSchema
 * - Type mismatches produce user-friendly errors
 *
 * Usage:
 *   mycli greet Alice                    # Valid
 *   mycli greet Alice --loud             # Valid with flag
 *   mycli greet                          # Error: missing required arg
 *   mycli greet Alice --count abc        # Error: count must be number
 */

import { Command, CommandParams } from "../src/.exports.ts";
import { z } from "../src/.deps.ts";

// Define schemas for validation
const ArgsSchema = z.tuple([
  z.string().describe("Name to greet").meta({ argName: "name" }),
]);

const FlagsSchema = z.object({
  loud: z.boolean().optional().describe("Shout the greeting"),
  count: z.number().optional().describe("Number of times to greet"),
  "dry-run": z.boolean().optional(),
});

// Type-safe params accessor
class GreetParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Name() {
    return this.Arg(0) ?? "World";
  }
  get Loud() {
    return this.Flag("loud") ?? false;
  }
  get Count() {
    return this.Flag("count") ?? 1;
  }
}

export default Command("greet", "Greet someone with validation")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(GreetParams)
  .Run(async ({ Params, Log }) => {
    const greeting = Params.Loud
      ? `HELLO, ${Params.Name.toUpperCase()}!`
      : `Hello, ${Params.Name}!`;

    for (let i = 0; i < Params.Count; i++) {
      Log.Info(greeting);
    }
  })
  .Build();
