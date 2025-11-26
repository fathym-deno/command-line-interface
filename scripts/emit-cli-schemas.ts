// src/cli/emit-cli-schemas.ts

import { CLIConfigSchema } from "../src/types/CLIConfig.ts";
import { CommandModuleMetadataSchema } from "../src/commands/CommandModuleMetadata.ts";
import { emitSchema } from "../src/utils/emitSchema.ts";

// Run directly as a Deno script
if (import.meta.main) {
  console.log("📤 Emitting CLI-related JSON Schemas...\n");

  await emitSchema(CLIConfigSchema, "CLIConfig");

  await emitSchema(CommandModuleMetadataSchema, "CommandModuleMetadata");

  console.log("\n✅ All schemas written to ./schemas/");
}
