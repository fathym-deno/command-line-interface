import { assert, assertEquals } from '../../test.deps.ts';
import { LocalDevCLIFileSystemHooks } from '../../../src/hooks/LocalDevCLIFileSystemHooks.ts';
import { CLIDFSContextManager } from '../../../src/CLIDFSContextManager.ts';
import { IoCContainer } from '../../../src/.deps.ts';
import { join } from '../../../src/.deps.ts';

Deno.test('LocalDevCLIFileSystemHooks', async (t) => {
  // Shared setup helper
  const createHooks = () => {
    const ioc = new IoCContainer();
    const dfs = new CLIDFSContextManager(ioc);
    const hooks = new LocalDevCLIFileSystemHooks(dfs);
    dfs.RegisterProjectDFS(join(Deno.cwd(), 'test-cli/.cli.json'));
    return { ioc, dfs, hooks };
  };

  await t.step('ResolveConfig – uses provided path', async () => {
    const hooks = new LocalDevCLIFileSystemHooks(
      new CLIDFSContextManager(new IoCContainer()),
    );
    const { config, resolvedPath, remainingArgs } = await hooks.ResolveConfig([
      './test-cli/.cli.json',
      'hello',
    ]);
    assertEquals(config.Name, 'Test CLI');
    assert(resolvedPath.endsWith('.cli.json'));
    assertEquals(remainingArgs, ['hello']);
  });

  await t.step('ResolveCommandEntryPaths – maps commands and metadata', async () => {
    const { hooks } = createHooks();

    const entries = await hooks.ResolveCommandEntryPaths({ Path: './commands' });

    // Expect a few known keys from the fixture
    assert(entries.has('hello'));
    assert(entries.has('scaffold'));
    const scaffold = entries.get('scaffold');
    assert(scaffold?.GroupPath);
    assertEquals(scaffold?.ParentGroup, undefined);

    const aws = entries.get('scaffold/cloud/aws');
    assert(aws?.CommandPath);
    assertEquals(aws?.ParentGroup, 'scaffold');
  });

  await t.step('LoadCommandModule – loads module default export', async () => {
    const { hooks } = createHooks();

    const mod = await hooks.LoadCommandModule(
      join(Deno.cwd(), 'test-cli/commands/hello.ts'),
    );
    assert(mod.Command);
  });

  await t.step('ResolveCommandEntryPaths – applies Root prefix', async () => {
    const { hooks } = createHooks();

    // Load external-commands with Root prefix "ext"
    const entries = await hooks.ResolveCommandEntryPaths({
      Path: './external-commands',
      Root: 'ext',
    });

    // Root-level .metadata.ts should become the "ext" group metadata
    assert(entries.has('ext'), 'Should have "ext" key from root .metadata.ts');
    const extGroup = entries.get('ext');
    assert(extGroup?.GroupPath, 'ext should have GroupPath from root .metadata.ts');
    assertEquals(extGroup?.ParentGroup, undefined, 'ext should have no parent (top-level)');

    // Nested plugin/.metadata.ts should become "ext/plugin"
    assert(entries.has('ext/plugin'), 'Should have "ext/plugin" key');
    const pluginGroup = entries.get('ext/plugin');
    assert(pluginGroup?.GroupPath, 'ext/plugin should have GroupPath');
    assertEquals(pluginGroup?.ParentGroup, 'ext', 'ext/plugin parent should be "ext"');

    // plugin/deploy.ts should become "ext/plugin/deploy"
    assert(entries.has('ext/plugin/deploy'), 'Should have "ext/plugin/deploy" key');
    const deploy = entries.get('ext/plugin/deploy');
    assert(deploy?.CommandPath, 'ext/plugin/deploy should have CommandPath');
    assertEquals(deploy?.ParentGroup, 'ext', 'ext/plugin/deploy parent should be "ext"');
  });

  await t.step('ResolveCommandEntryPaths – handles nested Root prefix', async () => {
    const { hooks } = createHooks();

    // Load with nested Root prefix
    const entries = await hooks.ResolveCommandEntryPaths({
      Path: './external-commands',
      Root: 'plugins/v2',
    });

    // Root-level .metadata.ts should become "plugins/v2"
    assert(entries.has('plugins/v2'), 'Should have "plugins/v2" key');
    const rootGroup = entries.get('plugins/v2');
    assert(rootGroup?.GroupPath, 'plugins/v2 should have GroupPath');
    assertEquals(rootGroup?.ParentGroup, 'plugins', 'plugins/v2 parent should be "plugins"');

    // plugin/deploy.ts should become "plugins/v2/plugin/deploy"
    assert(entries.has('plugins/v2/plugin/deploy'), 'Should have nested command key');
    const deploy = entries.get('plugins/v2/plugin/deploy');
    assertEquals(deploy?.ParentGroup, 'plugins', 'Nested command parent should be "plugins"');
  });

  await t.step('ResolveCommandEntryPaths – skips root .metadata.ts without Root prefix', async () => {
    const { hooks } = createHooks();

    // Load external-commands WITHOUT Root prefix
    const entries = await hooks.ResolveCommandEntryPaths({
      Path: './external-commands',
    });

    // Root-level .metadata.ts should be skipped (no key to attach it to)
    // But nested commands should still be loaded
    assert(entries.has('plugin/deploy'), 'Should have "plugin/deploy" key');
    assert(entries.has('plugin'), 'Should have "plugin" group key');

    // Verify no empty string key was created
    assert(!entries.has(''), 'Should not have empty string key');
  });
});
