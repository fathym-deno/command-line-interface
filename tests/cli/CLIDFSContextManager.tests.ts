import { assertEquals, assertThrows } from '../test.deps.ts';
import { CLIDFSContextManager } from '../../src/CLIDFSContextManager.ts';
import { IoCContainer, join } from '../../src/.deps.ts';

Deno.test('CLIDFSContextManager – discovers project root via .cli.json', async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const tmp = await Deno.makeTempDir();
  const projectRoot = join(tmp, 'proj');
  const nestedDir = join(projectRoot, 'commands');
  await Deno.mkdir(nestedDir, { recursive: true });

  await Deno.writeTextFile(join(projectRoot, '.cli.json'), '{}');
  const nestedFile = join(nestedDir, 'hello.ts');
  await Deno.writeTextFile(nestedFile, '// test');

  const registeredRoot = dfs.RegisterProjectDFS(nestedFile);
  assertEquals(registeredRoot, projectRoot);

  const projectDFS = await dfs.GetProjectDFS();
  const resolved = await projectDFS.ResolvePath('commands', 'hello.ts');
  assertEquals(resolved, join(projectRoot, 'commands', 'hello.ts'));
});

Deno.test('CLIDFSContextManager – RegisterExecutionDFS uses provided cwd', async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const cwd = await Deno.makeTempDir();
  const root = dfs.RegisterExecutionDFS(cwd);
  const execDFS = await dfs.GetExecutionDFS();

  assertEquals(root, cwd);
  const resolved = await execDFS.ResolvePath('a', 'b.txt');
  assertEquals(resolved, join(cwd, 'a', 'b.txt'));
});

Deno.test('CLIDFSContextManager – throws when root marker is missing', () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const path = join(Deno.cwd(), 'nonexistent', 'file.ts');
  assertThrows(() => dfs.RegisterProjectDFS(path));
});
