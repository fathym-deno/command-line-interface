import { assertEquals } from '../../test.deps.ts';
import { CommandRuntime } from '../../../src/cli/commands/CommandRuntime.ts';
import { CommandParams } from '../../../src/cli/commands/CommandParams.ts';
import { z } from '../../test.deps.ts';

class NoopParams extends CommandParams<[], Record<string, unknown>> {}

class NoopCommand extends CommandRuntime<NoopParams> {
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

Deno.test('CommandRuntime – metadata builds usage and examples', () => {
  const cmd = new NoopCommand();
  const meta = cmd.BuildMetadata();

  assertEquals(meta.Name, 'Noop');
  assertEquals(meta.Description, 'Does nothing');
  assertEquals(meta.Usage, '[--foo]');
  assertEquals(meta.Examples, ['[--foo]']);
});

Deno.test('CommandRuntime – suggestions derive from schemas', () => {
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
