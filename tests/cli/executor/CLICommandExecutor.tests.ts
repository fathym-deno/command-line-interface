// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "../../test.deps.ts";
import { CLICommandExecutor } from "../../../src/executor/CLICommandExecutor.ts";
import { CommandRuntime } from "../../../src/commands/CommandRuntime.ts";
import { CommandParams } from "../../../src/commands/CommandParams.ts";
import {
  DFSFileHandler,
  IoCContainer,
  type TelemetryLogger,
} from "../../../src/.deps.ts";
import { CLIDFSContextManager } from "../../../src/CLIDFSContextManager.ts";

class StubParams extends CommandParams<[], { "dry-run"?: boolean }> {}

class StubCommand extends CommandRuntime<StubParams> {
  public calls: string[] = [];
  constructor(private runReturn?: number | void) {
    super();
  }

  public BuildMetadata() {
    return this.buildMetadataFromSchemas("stub", "stub cmd");
  }

  public override Init() {
    this.calls.push("Init");
  }

  public override Run() {
    this.calls.push("Run");
    return this.runReturn;
  }

  public override DryRun() {
    this.calls.push("DryRun");
  }

  public override Cleanup() {
    this.calls.push("Cleanup");
  }
}

class StubResolver {
  public ResolveTemplateLocator() {
    return undefined;
  }
}

class MinimalDFS extends DFSFileHandler {
  public Root = ".";

  constructor() {
    super({ FileRoot: "." });
  }

  override loadAllPaths(): Promise<string[]> {
    return Promise.resolve([]);
  }

  override LoadAllPaths(): Promise<string[]> {
    return Promise.resolve([]);
  }

  GetFileInfo() {
    return Promise.resolve(undefined);
  }

  override ResolvePath(...parts: string[]): string {
    return parts.join("/");
  }

  WriteFile(): Promise<void> {
    return Promise.resolve();
  }

  RemoveFile(): Promise<void> {
    return Promise.resolve();
  }
}

class StubDFS extends CLIDFSContextManager {
  constructor(ioc: IoCContainer) {
    super(ioc);
  }

  public override GetProjectDFS(): Promise<DFSFileHandler> {
    return Promise.resolve(new MinimalDFS());
  }
}

const config = { Name: "Test CLI", Tokens: ["test"], Version: "0.0.0" };

Deno.test(
  "CLICommandExecutor – lifecycle runs Init->Run->Cleanup",
  async () => {
    const ioc = new IoCContainer();
    const resolver = new StubResolver();
    const dfs = new StubDFS(ioc);

    const logs: string[] = [];
    const logger: TelemetryLogger = {
      debug: () => {},
      info: (msg) => logs.push(`info:${msg}`),
      warn: (msg) => logs.push(`warn:${msg}`),
      error: (msg) => logs.push(`error:${msg}`),
      fatal: (msg) => logs.push(`fatal:${msg}`),
      withContext: () => logger,
    };

    ioc.Register(() => logger, { Type: ioc.Symbol("TelemetryLogger") });
    ioc.Register(CLIDFSContextManager, () => dfs);

    const cmd = new StubCommand();
    const executor = new CLICommandExecutor(ioc, resolver as any);

    const originalExit = Deno.exit;
    let exitCode: number | null = null;
    (Deno as any).exit = (code: number) => {
      exitCode = code;
    };

    try {
      await executor.Execute(config as any, cmd, {
        key: "hello",
        flags: {},
        positional: [],
        paramsCtor: StubParams,
        baseTemplatesDir: "/templates",
      });
    } finally {
      (Deno as any).exit = originalExit;
    }

    assertEquals(cmd.calls, ["Init", "Run", "Cleanup"]);
    assertEquals(exitCode, null);
    assert(logs.some((l) => l.includes("completed")));
  },
);

Deno.test("CLICommandExecutor – uses DryRun when flag set", async () => {
  const ioc = new IoCContainer();
  const resolver = new StubResolver();
  const dfs = new StubDFS(ioc);

  const logger: TelemetryLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    withContext: () => logger,
  };

  ioc.Register(() => logger, { Type: ioc.Symbol("TelemetryLogger") });
  ioc.Register(CLIDFSContextManager, () => dfs);

  const cmd = new StubCommand();
  const executor = new CLICommandExecutor(ioc, resolver as any);

  await executor.Execute(config as any, cmd, {
    key: "hello",
    flags: { "dry-run": true },
    positional: [],
    paramsCtor: StubParams,
    baseTemplatesDir: "/templates",
  });

  assertEquals(cmd.calls, ["Init", "DryRun", "Cleanup"]);
});

Deno.test(
  "CLICommandExecutor – exits with code when Run returns number",
  async () => {
    const ioc = new IoCContainer();
    const resolver = new StubResolver();
    const dfs = new StubDFS(ioc);

    const logger: TelemetryLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      withContext: () => logger,
    };

    ioc.Register(() => logger, { Type: ioc.Symbol("TelemetryLogger") });
    ioc.Register(CLIDFSContextManager, () => dfs);

    const cmd = new StubCommand(5);
    const executor = new CLICommandExecutor(ioc, resolver as any);

    const originalExit = Deno.exit;
    let exitCode: number | null = null;
    (Deno as any).exit = (code: number) => {
      exitCode = code;
    };

    try {
      await executor.Execute(config as any, cmd, {
        key: "hello",
        flags: {},
        positional: [],
        paramsCtor: StubParams,
        baseTemplatesDir: "/templates",
      });
    } finally {
      Deno.exit = originalExit;
    }

    assertEquals(exitCode, 5);
  },
);
