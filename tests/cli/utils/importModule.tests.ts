// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, fromFileUrl } from '../../test.deps.ts';
import { importModule } from '../../../src/utils/importModule.ts';
import type { DFSFileHandler } from '../../../src/.deps.ts';
import type { CommandLog } from '../../../src/commands/CommandLog.ts';

function createCommandLog() {
  const entries: string[] = [];

  const log: CommandLog = {
    Info: (msg: unknown) => entries.push(`info:${String(msg)}`),
    Warn: (msg: unknown) => entries.push(`warn:${String(msg)}`),
    Error: (msg: unknown) => entries.push(`error:${String(msg)}`),
    Success: (msg: unknown) => entries.push(`success:${String(msg)}`),
  };

  return { log, entries };
}

Deno.test('importModule – imports TypeScript module in dev mode', async () => {
  const { log, entries } = createCommandLog();
  const filePath = fromFileUrl(
    import.meta.resolve('../../../test-cli/commands/hello.ts'),
  );

  const originalExecPath = Deno.execPath;
  Deno.execPath = () => 'deno';

  const mod = await importModule<{ default: { Command: unknown } }>(
    log,
    filePath,
    {
      ResolvePath: (...parts: string[]) => parts.join('/'),
    } as unknown as DFSFileHandler,
    {} as DFSFileHandler,
  );

  Deno.execPath = originalExecPath;

  assert('default' in mod && 'Command' in mod.default);
  assertEquals(entries.length, 0);
});

Deno.test('importModule – bundles and loads module when compiled', async () => {
  const { log, entries } = createCommandLog();

  const removed: string[] = [];
  const bundleContents = new TextEncoder().encode('export const bundled = 7;');

  const rootDFS = {
    ResolvePath: (...parts: string[]) => parts.join('/'),
  } as unknown as DFSFileHandler;

  const buildDFS = {
    ResolvePath: (...parts: string[]) => parts.join('/'),
    GetFileInfo(_path: string) {
      return { Contents: bundleContents };
    },
    RemoveFile(path: string) {
      removed.push(path);
    },
  } as unknown as DFSFileHandler;

  const originalExecPath = Deno.execPath;
  const originalCommand = Deno.Command;

  Deno.execPath = () => '/tmp/ftm-binary';
  class StubCommand {
    constructor(_cmd: string, _options: unknown) {}
    spawn() {
      return {
        status: Promise.resolve({ code: 0, success: true }),
        stdout: new TextEncoder().encode('bundle ok'),
        stderr: new TextEncoder().encode(''),
      };
    }
  }
  Deno.Command = StubCommand as any;

  try {
    const mod = await importModule<{ bundled: number }>(
      log,
      '/tmp/mod.ts',
      rootDFS,
      buildDFS,
    );

    assertEquals(mod.bundled, 7);
  } finally {
    Deno.execPath = originalExecPath;
    Deno.Command = originalCommand;
  }

  await Promise.resolve();

  assert(entries.some((e) => e.includes('Bundling')));
  assert(removed.includes('/tmp/mod.ts'));
});
