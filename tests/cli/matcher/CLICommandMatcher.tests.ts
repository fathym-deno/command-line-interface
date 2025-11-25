import { assert, assertEquals } from '../../test.deps.ts';
import { CLICommandMatcher } from '../../../src/cli//matcher/CLICommandMatcher.ts';
import { CLICommandResolver } from '../../../src/cli/CLICommandResolver.ts';
import { LocalDevCLIFileSystemHooks } from '../../../src/cli/hooks/LocalDevCLIFileSystemHooks.ts';
import { CLIDFSContextManager } from '../../../src/cli/CLIDFSContextManager.ts';
import { IoCContainer } from '../../../src/cli/.deps.ts';

const config = {
  Name: 'Test CLI',
  Tokens: ['test'],
  Version: '0.0.0',
};

const cwd = Deno.cwd().replace(/\\/g, '/');
const commandMap = new Map<string, { CommandPath?: string; GroupPath?: string }>([
  ['hello', { CommandPath: `${cwd}/test-cli/commands/hello.ts` }],
  ['scaffold', { GroupPath: `${cwd}/test-cli/commands/scaffold/.metadata.ts` }],
  ['scaffold/cloud', { GroupPath: `${cwd}/test-cli/commands/scaffold/cloud/.metadata.ts` }],
  ['scaffold/cloud/aws', { CommandPath: `${cwd}/test-cli/commands/scaffold/cloud/aws.ts` }],
]);

Deno.test('CLICommandMatcher – resolves command vs help', async (t) => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);
  const matcher = new CLICommandMatcher(
    new CLICommandResolver(new LocalDevCLIFileSystemHooks(dfs)),
  );

  await dfs.RegisterExecutionDFS();
  dfs.RegisterProjectDFS('./test-cli/.cli.json');

  await t.step('resolves leaf command and remaining args', async () => {
    const result = await matcher.Resolve(
      config,
      commandMap,
      'hello',
      {},
      ['hello', 'extra'],
      '/templates',
    );
    assert(result.Command);
    assertEquals(result.Args, ['extra']);
    assertEquals(result.Flags.baseTemplatesDir, '/templates');
  });

  await t.step('falls back to help when unknown key', async () => {
    const result = await matcher.Resolve(
      config,
      commandMap,
      'unknown',
      {},
      ['unknown'],
      '/templates',
    );
    assertEquals(result.Command?.constructor.name, 'HelpCommand');
  });

  await t.step('shows group help when only group exists', async () => {
    const result = await matcher.Resolve(
      config,
      commandMap,
      'scaffold',
      {},
      ['scaffold'],
      '/templates',
    );
    assertEquals(result.Command?.constructor.name, 'HelpCommand');
  });

  await t.step('respects --help flag', async () => {
    const result = await matcher.Resolve(
      config,
      commandMap,
      'hello',
      { help: true },
      ['hello'],
      '/templates',
    );
    assertEquals(result.Command?.constructor.name, 'HelpCommand');
  });
});
