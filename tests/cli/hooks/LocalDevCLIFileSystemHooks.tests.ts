import { assert, assertEquals } from '../../test.deps.ts';
import { LocalDevCLIFileSystemHooks } from '../../../src/hooks/LocalDevCLIFileSystemHooks.ts';
import { CLIDFSContextManager } from '../../../src/CLIDFSContextManager.ts';
import { IoCContainer } from '../../../src/.deps.ts';
import { join } from '../../../src/.deps.ts';

Deno.test('LocalDevCLIFileSystemHooks – ResolveConfig picks arg or fallback', async (t) => {
  const hooks = new LocalDevCLIFileSystemHooks(new CLIDFSContextManager(new IoCContainer()));

  await t.step('uses provided path', async () => {
    const { config, resolvedPath, remainingArgs } = await hooks.ResolveConfig([
      './test-cli/.cli.json',
      'hello',
    ]);
    assertEquals(config.Name, 'Test CLI');
    assert(resolvedPath.endsWith('.cli.json'));
    assertEquals(remainingArgs, ['hello']);
  });
});

Deno.test('LocalDevCLIFileSystemHooks – ResolveCommandEntryPaths maps commands and metadata', async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);
  const hooks = new LocalDevCLIFileSystemHooks(dfs);

  // Register a project DFS rooted at test-cli
  dfs.RegisterProjectDFS(join(Deno.cwd(), 'test-cli/.cli.json'));

  const entries = await hooks.ResolveCommandEntryPaths('./commands');

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

Deno.test('LocalDevCLIFileSystemHooks – LoadCommandModule loads module default export', async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);
  const hooks = new LocalDevCLIFileSystemHooks(dfs);

  dfs.RegisterProjectDFS(join(Deno.cwd(), 'test-cli/.cli.json'));

  const mod = await hooks.LoadCommandModule(join(Deno.cwd(), 'test-cli/commands/hello.ts'));
  assert(mod.Command);
});
