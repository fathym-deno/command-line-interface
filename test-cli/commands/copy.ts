import { z } from "../.deps.ts";
import {
  type CommandContext,
  CommandParams,
  CommandRuntime,
  defineCommandModule,
} from "../../src/commands/.exports.ts";
import type { IoCContainer } from "../.deps.ts";

/**
 * Copy command for testing mixed arg/flag naming scenarios.
 * - source: custom argName
 * - destination: defaults to arg2 (no custom name)
 * - mode: custom argName
 * - force: defaults to key name
 * - v: custom flagName 'verbose'
 * - dry-run: defaults to key name
 */

export const CopyFlagsSchema = z.object({
  force: z.boolean().optional().describe("Overwrite existing files"),
  v: z.boolean().optional().describe("Verbose output").meta({
    flagName: "verbose",
  }),
  "dry-run": z.boolean().optional().describe("Show what would happen"),
});

export const CopyArgsSchema = z.tuple([
  z.string().describe("Source file").meta({ argName: "source" }),
  z.string().describe("Destination"),
  z.string().optional().describe("Copy mode").meta({ argName: "mode" }),
]);

export class CopyCommandParams extends CommandParams<
  z.infer<typeof CopyArgsSchema>,
  z.infer<typeof CopyFlagsSchema>
> {
  get Source(): string {
    return this.Arg(0) ?? "";
  }

  get Destination(): string {
    return this.Arg(1) ?? "";
  }

  get Mode(): string | undefined {
    return this.Arg(2);
  }

  get Force(): boolean {
    return this.Flag("force") ?? false;
  }

  get Verbose(): boolean {
    return this.Flag("v") ?? false;
  }
}

export class CopyCommand extends CommandRuntime<CopyCommandParams> {
  public override async Run(
    ctx: CommandContext<CopyCommandParams>,
    _ioc: IoCContainer,
  ): Promise<void | number> {
    const { Source, Destination, Mode, Force, Verbose, DryRun } = ctx.Params;

    if (DryRun) {
      ctx.Log.Info(`🛑 Dry run: Would copy ${Source} to ${Destination}`);
      if (Mode) ctx.Log.Info(`   Mode: ${Mode}`);
      if (Force) ctx.Log.Info(`   Force: enabled`);
      if (Verbose) ctx.Log.Info(`   Verbose: enabled`);
      return;
    }

    if (Verbose) {
      ctx.Log.Info(`📋 Copying ${Source} to ${Destination}...`);
      if (Mode) ctx.Log.Info(`   Mode: ${Mode}`);
      if (Force) ctx.Log.Info(`   Force overwrite enabled`);
    }

    ctx.Log.Info(`✅ Copied ${Source} → ${Destination}`);
  }

  public override BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Copy",
      "Copies a file to a destination.",
      CopyArgsSchema,
      CopyFlagsSchema,
    );
  }
}

export default defineCommandModule({
  FlagsSchema: CopyFlagsSchema,
  ArgsSchema: CopyArgsSchema,
  Params: CopyCommandParams,
  Command: CopyCommand,
});
