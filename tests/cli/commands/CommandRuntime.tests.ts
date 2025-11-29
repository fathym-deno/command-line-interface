import { assertEquals } from '../../test.deps.ts';
import { CommandRuntime } from '../../../src/commands/CommandRuntime.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';
import { z } from '../../test.deps.ts';

class _NoopParams extends CommandParams<[], Record<string, unknown>> {}

class NoopCommand extends CommandRuntime<_NoopParams> {
  public BuildMetadata() {
    return this.buildMetadataFromSchemas(
      'Noop',
      'Does nothing',
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
    return { Name: 'Test' };
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
    return this.buildMetadataFromSchemas(name, description, argsSchema, flagsSchema);
  }
}

Deno.test('CommandRuntime – metadata and suggestions', async (t) => {
  await t.step('builds usage and examples from schemas', () => {
    const cmd = new NoopCommand();
    const meta = cmd.BuildMetadata();

    assertEquals(meta.Name, 'Noop');
    assertEquals(meta.Description, 'Does nothing');
    assertEquals(meta.Usage, '[--foo]');
    assertEquals(meta.Examples, ['[--foo]']);
  });

  await t.step('derives suggestions from schemas', () => {
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

    const flags = Array.isArray(suggestions.Flags) ? [...suggestions.Flags].sort() : [];
    const args = Array.isArray(suggestions.Args) ? [...suggestions.Args] : [];

    assertEquals(flags, ['bar', 'foo']);
    assertEquals(args, ['<arg1>', '<arg2>']);
  });
});

Deno.test('CommandRuntime – buildMetadataFromSchemas extracts descriptions', async (t) => {
  const cmd = new TestableCommand();

  await t.step('extracts arg description from .describe()', () => {
    const argsSchema = z.tuple([
      z.string().describe('The name to greet'),
    ]);

    const meta = cmd.testBuildMetadata('Test', undefined, argsSchema, undefined);

    assertEquals(meta.Args?.length, 1);
    assertEquals(meta.Args?.[0].Description, 'The name to greet');
  });

  await t.step('extracts flag description from .describe()', () => {
    const flagsSchema = z.object({
      loud: z.boolean().optional().describe('Shout the output'),
      quiet: z.boolean().optional().describe('Suppress output'),
    });

    const meta = cmd.testBuildMetadata('Test', undefined, undefined, flagsSchema);

    assertEquals(meta.Flags?.length, 2);
    const loudFlag = meta.Flags?.find((f) => f.Name === 'loud');
    const quietFlag = meta.Flags?.find((f) => f.Name === 'quiet');
    assertEquals(loudFlag?.Description, 'Shout the output');
    assertEquals(quietFlag?.Description, 'Suppress output');
  });

  await t.step('uses default arg name when no meta.argName provided', () => {
    const argsSchema = z.tuple([
      z.string().describe('First arg'),
      z.number().describe('Second arg'),
    ]);

    const meta = cmd.testBuildMetadata('Test', undefined, argsSchema, undefined);

    assertEquals(meta.Args?.[0].Name, 'arg1');
    assertEquals(meta.Args?.[1].Name, 'arg2');
  });

  await t.step('uses meta.argName to override default arg name', () => {
    const argsSchema = z.tuple([
      z.string().describe('The target name').meta({ argName: 'name' }),
      z.string().describe('The file path').meta({ argName: 'path' }),
    ]);

    const meta = cmd.testBuildMetadata('Test', undefined, argsSchema, undefined);

    assertEquals(meta.Args?.[0].Name, 'name');
    assertEquals(meta.Args?.[0].Description, 'The target name');
    assertEquals(meta.Args?.[1].Name, 'path');
    assertEquals(meta.Args?.[1].Description, 'The file path');
  });

  await t.step('uses meta.flagName to override flag key', () => {
    const flagsSchema = z.object({
      v: z.boolean().optional().describe('Enable verbose').meta({ flagName: 'verbose' }),
    });

    const meta = cmd.testBuildMetadata('Test', undefined, undefined, flagsSchema);

    assertEquals(meta.Flags?.[0].Name, 'verbose');
    assertEquals(meta.Flags?.[0].Description, 'Enable verbose');
    assertEquals(meta.Usage, '[--verbose]');
  });

  await t.step('handles missing descriptions gracefully', () => {
    const argsSchema = z.tuple([z.string()]);
    const flagsSchema = z.object({
      flag: z.boolean().optional(),
    });

    const meta = cmd.testBuildMetadata('Test', undefined, argsSchema, flagsSchema);

    assertEquals(meta.Args?.[0].Description, undefined);
    assertEquals(meta.Flags?.[0].Description, undefined);
  });

  await t.step('builds correct usage string with args and flags', () => {
    const argsSchema = z.tuple([
      z.string().meta({ argName: 'target' }),
    ]);
    const flagsSchema = z.object({
      force: z.boolean().optional(),
      config: z.string().optional(),
    });

    const meta = cmd.testBuildMetadata('Test', undefined, argsSchema, flagsSchema);

    assertEquals(meta.Usage, '<target> [--force] [--config]');
  });
});
