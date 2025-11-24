import { assert, assertEquals, stripColor } from '../test.deps.ts';
import { CLI } from '../../src/cli/CLI.ts';
import { CommandRuntime } from '../../src/cli/commands/CommandRuntime.ts';
import { CommandParams } from '../../src/cli/commands/CommandParams.ts';
import type { CLIParsedResult } from '../../src/cli/types/CLIParsedResult.ts';
import type { CLICommandEntry } from '../../src/cli/types/CLICommandEntry.ts';
import type { CLIConfig } from '../../src/cli/types/CLIConfig.ts';

class StubParams extends CommandParams<unknown[], Record<string, unknown>> {}

class StubRuntime extends CommandRuntime<StubParams> {
  constructor(private label: string, private calls: string[]) {
    super();
  }

  override async Run(): Promise<void> {
    this.calls.push(`run:${this.label}`);
  }

  override BuildMetadata() {
    return this.buildMetadataFromSchemas(this.label, `${this.label} desc`);
  }
}

class StubResolver {
  constructor(
    private map: Map<string, CLICommandEntry>,
    private calls: string[],
  ) {}

  public ResolveCommandMap(): Promise<Map<string, CLICommandEntry>> {
    return Promise.resolve(this.map);
  }

  public async LoadCommandInstance(path: string) {
    this.calls.push(`load:${path}`);
    return { Command: new StubRuntime(path, this.calls), Params: StubParams };
  }

  public ResolveTemplateLocator() {
    return Promise.resolve(undefined);
  }
}

class StubParser {
  constructor(private parsed: CLIParsedResult) {}

  public ParseInvocation(): Promise<CLIParsedResult> {
    return Promise.resolve(this.parsed);
  }
}

class StubDFSContextManager {
  RegisterExecutionDFS() {
    return '';
  }
  RegisterProjectDFS() {
    return '';
  }
  ResolvePath(): Promise<string> {
    return Promise.resolve('');
  }
  GetProjectDFS(): Promise<unknown> {
    return Promise.resolve({} as unknown);
  }
}

const config: CLIConfig = {
  Name: 'Test CLI',
  Version: '0.0.0',
  Tokens: ['test'],
};

class BufferWriter {
  public chunks: Uint8Array[] = [];
  writeSync(p: Uint8Array): number {
    this.chunks.push(p.slice());
    return p.length;
  }
  toString(): string {
    const decoder = new TextDecoder();
    return this.chunks.map((c) => decoder.decode(c)).join('');
  }
}

Deno.test('CLI – registry overrides filesystem command and uses telemetry writer', async () => {
  const calls: string[] = [];

  const resolverMap = new Map<string, CLICommandEntry>([
    ['hello', { CommandPath: 'fs' }],
  ]);
  const resolver = new StubResolver(resolverMap, calls);

  const parser = new StubParser({
    parsed: {},
    flags: {},
    positional: ['hello'],
    key: 'hello',
    config,
    baseCommandDir: '/cmds',
    baseTemplatesDir: '/tpls',
    initPath: undefined,
  });

  const cli = new CLI(
    {
      parser: parser as any,
      resolver: resolver as any,
      dfsCtxMgr: new StubDFSContextManager() as any,
    },
  );

  // In-memory registry should win over filesystem map
  (cli as any).registry.RegisterCommand('hello', { CommandPath: 'registry' });

  const writer = new BufferWriter();
  (globalThis as any).__telemetryWriter = writer;

  await cli.RunWithConfig(config, ['hello'], './config.json');

  delete (globalThis as any).__telemetryWriter;

  assert(calls.includes('load:registry'));
  const text = stripColor(writer.toString());
  assert(text.includes('running "hello"'));
  assert(text.includes('completed'));
});
