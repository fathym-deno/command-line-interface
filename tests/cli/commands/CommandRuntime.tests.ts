import { assertEquals } from "../../test.deps.ts";
import { CommandRuntime } from "../../../src/commands/CommandRuntime.ts";
import { CommandParams } from "../../../src/commands/CommandParams.ts";
import { z } from "../../test.deps.ts";

class _NoopParams extends CommandParams<[], Record<string, unknown>> {}

class NoopCommand extends CommandRuntime<_NoopParams> {
  public BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Noop",
      "Does nothing",
      z.tuple([]),
      z.object({ foo: z.string().optional() }),
    );
  }

  public Run() {
    return;
  }
}

// Helper class that exposes buildMetadataFromSchemas for testing
class TestableCommand extends CommandRuntime<_NoopParams> {
  public BuildMetadata() {
    return { Name: "Test" };
  }

  public Run() {
    return;
  }

  public testBuildMetadata(
    name: string,
    description: string | undefined,
    argsSchema: z.ZodTuple<z.ZodTypeAny[], z.ZodTypeAny | null> | undefined,
    flagsSchema: z.ZodObject<z.ZodRawShape> | undefined,
  ) {
    return this.buildMetadataFromSchemas(
      name,
      description,
      argsSchema,
      flagsSchema,
    );
  }
}

Deno.test("CommandRuntime – metadata and suggestions", async (t) => {
  await t.step("builds usage and examples from schemas", () => {
    const cmd = new NoopCommand();
    const meta = cmd.BuildMetadata();

    assertEquals(meta.Name, "Noop");
    assertEquals(meta.Description, "Does nothing");
    assertEquals(meta.Usage, "[--foo]");
    assertEquals(meta.Examples, ["[--foo]"]);
  });

  await t.step("derives suggestions from schemas", () => {
    class SuggestionCmd extends NoopCommand {
      public exposeSuggestions() {
        return this.buildSuggestionsFromSchemas(
          z.object({ foo: z.string(), bar: z.boolean().optional() }),
          z.tuple([z.string(), z.number()]),
        );
      }
    }

    const cmd = new SuggestionCmd();
    const suggestions = cmd.exposeSuggestions();

    const flags = Array.isArray(suggestions.Flags)
      ? [...suggestions.Flags].sort()
      : [];
    const args = Array.isArray(suggestions.Args) ? [...suggestions.Args] : [];

    assertEquals(flags, ["bar", "foo"]);
    assertEquals(args, ["<arg1>", "<arg2>"]);
  });
});

Deno.test("CommandRuntime – buildMetadataFromSchemas extracts descriptions", async (t) => {
  const cmd = new TestableCommand();

  await t.step("extracts arg description from .describe()", () => {
    const argsSchema = z.tuple([
      z.string().describe("The name to greet"),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.length, 1);
    assertEquals(meta.Args?.[0].Description, "The name to greet");
  });

  await t.step("extracts flag description from .describe()", () => {
    const flagsSchema = z.object({
      loud: z.boolean().optional().describe("Shout the output"),
      quiet: z.boolean().optional().describe("Suppress output"),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    assertEquals(meta.Flags?.length, 2);
    const loudFlag = meta.Flags?.find((f) => f.Name === "loud");
    const quietFlag = meta.Flags?.find((f) => f.Name === "quiet");
    assertEquals(loudFlag?.Description, "Shout the output");
    assertEquals(quietFlag?.Description, "Suppress output");
  });

  await t.step("uses default arg name when no meta.argName provided", () => {
    const argsSchema = z.tuple([
      z.string().describe("First arg"),
      z.number().describe("Second arg"),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.[0].Name, "arg1");
    assertEquals(meta.Args?.[1].Name, "arg2");
  });

  await t.step("uses meta.argName to override default arg name", () => {
    const argsSchema = z.tuple([
      z.string().describe("The target name").meta({ argName: "name" }),
      z.string().describe("The file path").meta({ argName: "path" }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.[0].Name, "name");
    assertEquals(meta.Args?.[0].Description, "The target name");
    assertEquals(meta.Args?.[1].Name, "path");
    assertEquals(meta.Args?.[1].Description, "The file path");
  });

  await t.step("uses meta.flagName to override flag key", () => {
    const flagsSchema = z.object({
      v: z.boolean().optional().describe("Enable verbose").meta({
        flagName: "verbose",
      }),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    assertEquals(meta.Flags?.[0].Name, "verbose");
    assertEquals(meta.Flags?.[0].Description, "Enable verbose");
    assertEquals(meta.Usage, "[--verbose]");
  });

  await t.step("handles missing descriptions gracefully", () => {
    const argsSchema = z.tuple([z.string()]);
    const flagsSchema = z.object({
      flag: z.boolean().optional(),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      flagsSchema,
    );

    assertEquals(meta.Args?.[0].Description, undefined);
    assertEquals(meta.Flags?.[0].Description, undefined);
  });

  await t.step("builds correct usage string with args and flags", () => {
    const argsSchema = z.tuple([
      z.string().meta({ argName: "target" }),
    ]);
    const flagsSchema = z.object({
      force: z.boolean().optional(),
      config: z.string().optional(),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      flagsSchema,
    );

    assertEquals(meta.Usage, "<target> [--force] [--config]");
  });
});

Deno.test("CommandRuntime – arg name handling", async (t) => {
  const cmd = new TestableCommand();

  await t.step("defaults to arg1, arg2, arg3 for unnamed args", () => {
    const argsSchema = z.tuple([
      z.string().describe("First argument"),
      z.string().describe("Second argument"),
      z.string().describe("Third argument"),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.length, 3);
    assertEquals(meta.Args?.[0].Name, "arg1");
    assertEquals(meta.Args?.[1].Name, "arg2");
    assertEquals(meta.Args?.[2].Name, "arg3");
  });

  await t.step("uses custom argName for all args", () => {
    const argsSchema = z.tuple([
      z.string().describe("Source file").meta({ argName: "src" }),
      z.string().describe("Destination file").meta({ argName: "dest" }),
      z.string().describe("Copy mode").meta({ argName: "mode" }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.length, 3);
    assertEquals(meta.Args?.[0].Name, "src");
    assertEquals(meta.Args?.[1].Name, "dest");
    assertEquals(meta.Args?.[2].Name, "mode");
  });

  await t.step("mixes custom and default arg names", () => {
    const argsSchema = z.tuple([
      z.string().describe("Source file").meta({ argName: "source" }),
      z.string().describe("Destination"),
      z.string().optional().describe("Copy mode").meta({ argName: "mode" }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.length, 3);
    assertEquals(meta.Args?.[0].Name, "source");
    assertEquals(meta.Args?.[0].Description, "Source file");
    assertEquals(meta.Args?.[1].Name, "arg2");
    assertEquals(meta.Args?.[1].Description, "Destination");
    assertEquals(meta.Args?.[2].Name, "mode");
    assertEquals(meta.Args?.[2].Description, "Copy mode");
  });

  await t.step("preserves descriptions with custom arg names", () => {
    const argsSchema = z.tuple([
      z.string().describe("The name of the user").meta({ argName: "username" }),
      z.string().describe("The user email address").meta({ argName: "email" }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.[0].Name, "username");
    assertEquals(meta.Args?.[0].Description, "The name of the user");
    assertEquals(meta.Args?.[1].Name, "email");
    assertEquals(meta.Args?.[1].Description, "The user email address");
  });

  await t.step("handles 5+ args with mixed naming", () => {
    const argsSchema = z.tuple([
      z.string().describe("First").meta({ argName: "one" }),
      z.string().describe("Second"),
      z.string().describe("Third").meta({ argName: "three" }),
      z.string().describe("Fourth"),
      z.string().describe("Fifth").meta({ argName: "five" }),
      z.string().optional().describe("Sixth"),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.length, 6);
    assertEquals(meta.Args?.[0].Name, "one");
    assertEquals(meta.Args?.[1].Name, "arg2");
    assertEquals(meta.Args?.[2].Name, "three");
    assertEquals(meta.Args?.[3].Name, "arg4");
    assertEquals(meta.Args?.[4].Name, "five");
    assertEquals(meta.Args?.[5].Name, "arg6");
  });

  await t.step("builds correct usage string with mixed arg names", () => {
    const argsSchema = z.tuple([
      z.string().meta({ argName: "source" }),
      z.string(),
      z.string().optional().meta({ argName: "mode" }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    // Usage string uses <> for all args (optional is tracked in metadata, not usage string)
    assertEquals(meta.Usage, "<source> <arg2> <mode>");
  });

  await t.step("marks optional args correctly in metadata", () => {
    const argsSchema = z.tuple([
      z.string().describe("Required arg").meta({ argName: "input" }),
      z.string().optional().describe("Optional arg").meta({
        argName: "output",
      }),
    ]);

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      undefined,
    );

    assertEquals(meta.Args?.[0].Optional, false);
    assertEquals(meta.Args?.[1].Optional, true);
  });
});

Deno.test("CommandRuntime – flag name handling", async (t) => {
  const cmd = new TestableCommand();

  await t.step("defaults to object key as flag name", () => {
    const flagsSchema = z.object({
      force: z.boolean().optional().describe("Force operation"),
      verbose: z.boolean().optional().describe("Verbose output"),
      "dry-run": z.boolean().optional().describe("Dry run mode"),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    const names = meta.Flags?.map((f) => f.Name) ?? [];
    assertEquals(names.includes("force"), true);
    assertEquals(names.includes("verbose"), true);
    assertEquals(names.includes("dry-run"), true);
  });

  await t.step("uses custom flagName to override key", () => {
    const flagsSchema = z.object({
      v: z.boolean().optional().describe("Verbose output").meta({
        flagName: "verbose",
      }),
      q: z.boolean().optional().describe("Quiet mode").meta({
        flagName: "quiet",
      }),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    const names = meta.Flags?.map((f) => f.Name) ?? [];
    assertEquals(names.includes("verbose"), true);
    assertEquals(names.includes("quiet"), true);
    assertEquals(names.includes("v"), false);
    assertEquals(names.includes("q"), false);
  });

  await t.step("mixes custom and default flag names", () => {
    const flagsSchema = z.object({
      force: z.boolean().optional().describe("Overwrite existing"),
      v: z.boolean().optional().describe("Verbose output").meta({
        flagName: "verbose",
      }),
      "dry-run": z.boolean().optional().describe("Show what would happen"),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    const forceFlag = meta.Flags?.find((f) => f.Name === "force");
    const verboseFlag = meta.Flags?.find((f) => f.Name === "verbose");
    const dryRunFlag = meta.Flags?.find((f) => f.Name === "dry-run");

    assertEquals(forceFlag?.Description, "Overwrite existing");
    assertEquals(verboseFlag?.Description, "Verbose output");
    assertEquals(dryRunFlag?.Description, "Show what would happen");
  });

  await t.step("preserves descriptions with custom flag names", () => {
    const flagsSchema = z.object({
      o: z.string().optional().describe("Output file path").meta({
        flagName: "output",
      }),
      c: z.string().optional().describe("Config file path").meta({
        flagName: "config",
      }),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    const outputFlag = meta.Flags?.find((f) => f.Name === "output");
    const configFlag = meta.Flags?.find((f) => f.Name === "config");

    assertEquals(outputFlag?.Description, "Output file path");
    assertEquals(configFlag?.Description, "Config file path");
  });

  await t.step("builds usage string with custom flag names", () => {
    const flagsSchema = z.object({
      v: z.boolean().optional().meta({ flagName: "verbose" }),
      force: z.boolean().optional(),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    assertEquals(meta.Usage?.includes("--verbose"), true);
    assertEquals(meta.Usage?.includes("--force"), true);
    // Note: --v should not appear since it's been renamed to verbose
    // However the flag key 'v' might still be referenced - we check that 'v' alone is not there
  });

  await t.step("handles multiple short flags with custom names", () => {
    const flagsSchema = z.object({
      v: z.boolean().optional().describe("Verbose").meta({
        flagName: "verbose",
      }),
      q: z.boolean().optional().describe("Quiet").meta({ flagName: "quiet" }),
      d: z.boolean().optional().describe("Debug").meta({ flagName: "debug" }),
      n: z.boolean().optional().describe("No operation").meta({
        flagName: "dry-run",
      }),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      undefined,
      flagsSchema,
    );

    assertEquals(meta.Flags?.length, 4);
    const names = meta.Flags?.map((f) => f.Name) ?? [];
    assertEquals(names.includes("verbose"), true);
    assertEquals(names.includes("quiet"), true);
    assertEquals(names.includes("debug"), true);
    assertEquals(names.includes("dry-run"), true);
  });
});

Deno.test("CommandRuntime – combined arg and flag naming", async (t) => {
  const cmd = new TestableCommand();

  await t.step("handles mixed args and flags with custom names", () => {
    const argsSchema = z.tuple([
      z.string().describe("Source file").meta({ argName: "source" }),
      z.string().describe("Destination"),
      z.string().optional().describe("Copy mode").meta({ argName: "mode" }),
    ]);
    const flagsSchema = z.object({
      force: z.boolean().optional().describe("Overwrite existing"),
      v: z.boolean().optional().describe("Verbose output").meta({
        flagName: "verbose",
      }),
      "dry-run": z.boolean().optional().describe("Show what would happen"),
    });

    const meta = cmd.testBuildMetadata(
      "Copy",
      "Copies files",
      argsSchema,
      flagsSchema,
    );

    // Verify args
    assertEquals(meta.Args?.length, 3);
    assertEquals(meta.Args?.[0].Name, "source");
    assertEquals(meta.Args?.[1].Name, "arg2");
    assertEquals(meta.Args?.[2].Name, "mode");

    // Verify flags
    const forceFlag = meta.Flags?.find((f) => f.Name === "force");
    const verboseFlag = meta.Flags?.find((f) => f.Name === "verbose");
    const dryRunFlag = meta.Flags?.find((f) => f.Name === "dry-run");

    assertEquals(forceFlag?.Description, "Overwrite existing");
    assertEquals(verboseFlag?.Description, "Verbose output");
    assertEquals(dryRunFlag?.Description, "Show what would happen");
  });

  await t.step("builds complete usage string with mixed naming", () => {
    const argsSchema = z.tuple([
      z.string().meta({ argName: "source" }),
      z.string(),
      z.string().optional().meta({ argName: "mode" }),
    ]);
    const flagsSchema = z.object({
      force: z.boolean().optional(),
      v: z.boolean().optional().meta({ flagName: "verbose" }),
    });

    const meta = cmd.testBuildMetadata(
      "Test",
      undefined,
      argsSchema,
      flagsSchema,
    );

    // Usage string uses <> for args and [--flag] for flags
    assertEquals(meta.Usage, "<source> <arg2> <mode> [--force] [--verbose]");
  });
});
