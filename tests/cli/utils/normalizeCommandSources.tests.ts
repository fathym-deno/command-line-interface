import { assertEquals } from '../../test.deps.ts';
import { normalizeCommandSources } from '../../../src/utils/normalizeCommandSources.ts';

Deno.test('normalizeCommandSources', async (t) => {
  await t.step('returns default for undefined', () => {
    const result = normalizeCommandSources(undefined);
    assertEquals(result, [{ Path: './commands' }]);
  });

  await t.step('wraps string in array', () => {
    const result = normalizeCommandSources('./my-commands');
    assertEquals(result, [{ Path: './my-commands' }]);
  });

  await t.step('passes array through unchanged', () => {
    const input = [
      { Path: './commands' },
      { Path: './plugins', Root: 'plugins' },
    ];
    const result = normalizeCommandSources(input);
    assertEquals(result, input);
  });

  await t.step('handles array with nested Root', () => {
    const input = [
      { Path: './commands' },
      { Path: '../external', Root: 'ext/v2' },
    ];
    const result = normalizeCommandSources(input);
    assertEquals(result, input);
    assertEquals(result[1].Root, 'ext/v2');
  });

  await t.step('handles empty array', () => {
    const result = normalizeCommandSources([]);
    assertEquals(result, []);
  });
});
