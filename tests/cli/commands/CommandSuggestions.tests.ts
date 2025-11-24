import { assertEquals } from '../../test.deps.ts';
import type { CommandSuggestions } from '../../../src/cli/commands/CommandSuggestions.ts';

Deno.test('CommandSuggestions – defaults and arrays', () => {
  const suggestions: CommandSuggestions = {
    Flags: ['foo', 'bar'],
    Args: ['<arg1>'],
  };

  assertEquals(suggestions.Flags, ['foo', 'bar']);
  assertEquals(suggestions.Args, ['<arg1>']);
});

Deno.test('CommandSuggestions – record form for flags', () => {
  const suggestions: CommandSuggestions = {
    Flags: { foo: ['--foo'], bar: ['--bar'] },
  };

  assertEquals(Object.keys(suggestions.Flags || {}).sort(), ['bar', 'foo']);
});
