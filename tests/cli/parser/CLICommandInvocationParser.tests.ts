import { assertEquals, assert } from '../../test.deps.ts';
import { CLICommandInvocationParser } from '../../../src/cli/CLICommandInvocationParser.ts';
import { CLIDFSContextManager } from '../../../src/cli/CLIDFSContextManager.ts';
import { LocalDevCLIFileSystemHooks } from '../../../src/cli/LocalDevCLIFileSystemHooks.ts';
import { CLICommandResolver } from '../../../src/cli/CLICommandResolver.ts';
import { IoCContainer } from '../../../src/cli/.deps.ts';

Deno.test('CLICommandInvocationParser – parses args, flags, and init detection', async (t) => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);
  const parser = new CLICommandInvocationParser(dfs);
  const resolver = new CLICommandResolver(new LocalDevCLIFileSystemHooks(dfs));

  const configPath = './test-cli/.cli.json';
  const { config, resolvedPath, remainingArgs } = await resolver.ResolveConfig([configPath, 'hello', '--loud']);

  const parsed = await parser.ParseInvocation(config, remainingArgs, resolvedPath);

  await t.step('resolves base command/templates dirs', () => {
    assert(parsed.baseCommandDir.replace(/\\/g, '/').includes('test-cli/commands'));
    // Templates may fall back to default when not specified; just ensure a templates path is present.
    assert(parsed.baseTemplatesDir.replace(/\\/g, '/').endsWith('/templates'));
  });

  await t.step('parses positional/flags', () => {
    assertEquals(parsed.key, 'hello');
    assertEquals(parsed.positional, ['hello']);
    assertEquals(parsed.flags.loud, true);
  });

  await t.step('detects init file', () => {
    assert(parsed.initPath?.endsWith('.cli.init.ts'));
  });
});
