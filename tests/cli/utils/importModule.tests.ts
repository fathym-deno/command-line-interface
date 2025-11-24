import { assert, assertEquals, fromFileUrl } from '../../test.deps.ts';
import { importModule } from '../../../src/cli/utils/importModule.ts';
import type { DFSFileHandler } from '../../../src/cli/.deps.ts';
import type { CommandLog } from '../../../src/cli/commands/CommandLog.ts';

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
  const filePath = fromFileUrl(import.meta.resolve('../../../test-cli/commands/hello.ts'));

  const mod = await importModule<{ default: { Command: unknown } }>(
    log,
    filePath,
    {} as DFSFileHandler,
    {} as DFSFileHandler,
  );

  assert('default' in mod && 'Command' in (mod as any).default);
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
    async GetFileInfo(_path: string) {
      return { Contents: bundleContents };
    },
    async RemoveFile(path: string) {
      removed.push(path);
    },
  } as unknown as DFSFileHandler;

  const originalExecPath = Deno.execPath;
  const originalCommand = Deno.Command;

  (Deno as any).execPath = () => '/tmp/ftm-binary';
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
  (Deno as any).Command = StubCommand;

  try {
    const mod = await importModule<{ bundled: number }>(
      log,
      '/tmp/mod.ts',
      rootDFS,
      buildDFS,
    );

    assertEquals(mod.bundled, 7);
  } finally {
    (Deno as any).execPath = originalExecPath;
    (Deno as any).Command = originalCommand;
  }

  await Promise.resolve();

  assert(entries.some((e) => e.includes('Bundling')));
  assert(removed.includes('/tmp/mod.ts'));
});
