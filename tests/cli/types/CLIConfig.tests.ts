import { assert, assertEquals } from '../../test.deps.ts';
import { CLIConfigSchema, isCLIConfig } from '../../../src/types/CLIConfig.ts';

const baseConfig = {
  Name: 'Test CLI',
  Tokens: ['test'],
  Version: '0.0.0',
};

Deno.test('CLIConfig schema and guard', async (t) => {
  await t.step('accepts minimal valid config', () => {
    const parsed = CLIConfigSchema.safeParse(baseConfig);
    assert(parsed.success);
    assertEquals(parsed.data.Name, 'Test CLI');
  });

  await t.step('rejects missing required fields', () => {
    const parsed = CLIConfigSchema.safeParse({ Tokens: [], Version: '' });
    assert(!parsed.success);
  });

  await t.step('guard accepts valid and rejects invalid shapes', () => {
    assertEquals(isCLIConfig(baseConfig), true);
    assertEquals(isCLIConfig({ Name: '', Tokens: [], Version: '' }), false);
  });

  await t.step('accepts Commands as single string', () => {
    const config = {
      ...baseConfig,
      Commands: './commands',
    };
    const parsed = CLIConfigSchema.safeParse(config);
    assert(parsed.success);
  });

  await t.step('accepts Commands as array of strings', () => {
    const config = {
      ...baseConfig,
      Commands: ['./commands', './plugins'],
    };
    const parsed = CLIConfigSchema.safeParse(config);
    assert(parsed.success);
  });

  await t.step('accepts Commands as array of CLICommandSource', () => {
    const config = {
      ...baseConfig,
      Commands: [
        { Path: './commands' },
        { Path: './plugins', Root: 'plugins' },
      ],
    };
    const parsed = CLIConfigSchema.safeParse(config);
    assert(parsed.success);
  });
});
