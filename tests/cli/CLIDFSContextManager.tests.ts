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

Deno.test('CLIDFSContextManager – RegisterConfigDFS creates directory and registers DFS', async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  // Create a temp directory to act as "home" and override environment
  const tempHome = await Deno.makeTempDir();
  const originalEnv = Deno.build.os === 'windows'
    ? Deno.env.get('USERPROFILE')
    : Deno.env.get('HOME');

  try {
    // Override home directory for test
    if (Deno.build.os === 'windows') {
      Deno.env.set('USERPROFILE', tempHome);
    } else {
      Deno.env.set('HOME', tempHome);
    }

    const configPath = await dfsCtx.RegisterConfigDFS('.test-cli');

    // Verify directory was created
    const stat = await Deno.stat(configPath);
    assertEquals(stat.isDirectory, true);

    // Verify path is correct
    assertEquals(configPath, join(tempHome, '.test-cli'));

    // Verify DFS is accessible
    const configDfs = await dfsCtx.GetConfigDFS();
    const resolved = await configDfs.ResolvePath('config.json');
    assertEquals(resolved, join(tempHome, '.test-cli', 'config.json'));
  } finally {
    // Restore environment
    if (Deno.build.os === 'windows') {
      if (originalEnv) Deno.env.set('USERPROFILE', originalEnv);
    } else {
      if (originalEnv) Deno.env.set('HOME', originalEnv);
    }
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test('CLIDFSContextManager – GetConfigDFS throws when not registered', async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  // GetConfigDFS should throw when config DFS has not been registered
  let threw = false;
  try {
    await dfsCtx.GetConfigDFS();
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
