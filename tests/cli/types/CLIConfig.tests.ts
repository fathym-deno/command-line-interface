import { assert, assertEquals, assertRejects } from '../../test.deps.ts';
import {
  type CLIConfig,
  CLIConfigSchema,
  type ExtendedCLIConfig,
  isCLIConfig,
  loadCLIConfig,
} from '../../../src/types/CLIConfig.ts';

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

  await t.step('accepts ConfigDFS as optional string', () => {
    const config = {
      ...baseConfig,
      ConfigDFS: '.ftm',
    };
    const parsed = CLIConfigSchema.safeParse(config);
    assert(parsed.success);
    assertEquals(parsed.data.ConfigDFS, '.ftm');
  });

  await t.step('accepts config without ConfigDFS', () => {
    const parsed = CLIConfigSchema.safeParse(baseConfig);
    assert(parsed.success);
    assertEquals(parsed.data.ConfigDFS, undefined);
  });
});

Deno.test('loadCLIConfig – loads base config', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Test CLI',
        Tokens: ['test'],
        Version: '1.0.0',
        Description: 'A test CLI',
      }),
    );

    const config = await loadCLIConfig(configPath);

    assertEquals(config.Name, 'Test CLI');
    assertEquals(config.Tokens, ['test']);
    assertEquals(config.Version, '1.0.0');
    assertEquals(config.Description, 'A test CLI');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('loadCLIConfig – loads extended config with generic type', async () => {
  interface MyExtendedConfig extends CLIConfig {
    CustomField: string;
    NestedConfig: {
      Option1: boolean;
      Option2: string[];
    };
  }

  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Extended CLI',
        Tokens: ['ext'],
        Version: '2.0.0',
        CustomField: 'custom value',
        NestedConfig: {
          Option1: true,
          Option2: ['a', 'b', 'c'],
        },
      }),
    );

    const config = await loadCLIConfig<MyExtendedConfig>(configPath);

    // Base fields work
    assertEquals(config.Name, 'Extended CLI');
    assertEquals(config.Tokens, ['ext']);

    // Extended fields are typed correctly
    assertEquals(config.CustomField, 'custom value');
    assertEquals(config.NestedConfig.Option1, true);
    assertEquals(config.NestedConfig.Option2, ['a', 'b', 'c']);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('loadCLIConfig – throws on missing required fields', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    // Missing Version field
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Incomplete CLI',
        Tokens: ['inc'],
      }),
    );

    await assertRejects(
      () => loadCLIConfig(configPath),
      Error,
      'Invalid CLI config',
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('loadCLIConfig – preserves unknown fields', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Test CLI',
        Tokens: ['test'],
        Version: '1.0.0',
        UnknownField: 'should be preserved',
        AnotherField: { nested: true },
      }),
    );

    const config = await loadCLIConfig(configPath);

    // deno-lint-ignore no-explicit-any
    assertEquals((config as any).UnknownField, 'should be preserved');
    // deno-lint-ignore no-explicit-any
    assertEquals((config as any).AnotherField.nested, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('loadCLIConfig – type inference works correctly', async () => {
  interface ReleaseConfig {
    Targets?: string[];
    DefaultInstallDir?: {
      unix?: string;
      windows?: string;
    };
  }

  interface FathymCLIConfig extends CLIConfig {
    Release?: ReleaseConfig;
  }

  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Fathym CLI',
        Tokens: ['ftm'],
        Version: '1.0.0',
        Release: {
          Targets: ['x86_64-pc-windows-msvc', 'x86_64-apple-darwin'],
          DefaultInstallDir: {
            unix: '~/.bin',
            windows: '~/.bin',
          },
        },
      }),
    );

    const config = await loadCLIConfig<FathymCLIConfig>(configPath);

    // TypeScript knows these fields exist
    assertEquals(config.Release?.Targets?.length, 2);
    assertEquals(config.Release?.DefaultInstallDir?.unix, '~/.bin');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('loadCLIConfig – backward compatible with existing usage', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/.cli.json`;

  try {
    await Deno.writeTextFile(
      configPath,
      JSON.stringify({
        Name: 'Legacy CLI',
        Tokens: ['legacy'],
        Version: '0.1.0',
        Commands: './commands',
      }),
    );

    // Old style: no generic parameter
    const config = await loadCLIConfig(configPath);

    // Should work exactly as before
    assertEquals(config.Name, 'Legacy CLI');
    assertEquals(config.Commands, './commands');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ExtendedCLIConfig type helper', () => {
  // This is a compile-time test - if it compiles, the types work correctly
  type MyConfig = ExtendedCLIConfig<{
    CustomField: string;
    NestedConfig: { option: boolean };
  }>;

  // Create a valid config object
  const config: MyConfig = {
    Name: 'Test',
    Tokens: ['test'],
    Version: '1.0.0',
    CustomField: 'value',
    NestedConfig: { option: true },
  };

  // Verify base fields exist
  assertEquals(config.Name, 'Test');
  assertEquals(config.Tokens, ['test']);

  // Verify extended fields exist
  assertEquals(config.CustomField, 'value');
  assertEquals(config.NestedConfig.option, true);
});
