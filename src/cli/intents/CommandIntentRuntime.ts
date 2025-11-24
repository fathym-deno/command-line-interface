// deno-lint-ignore-file no-explicit-any
import { assert, IoCContainer } from '../.deps.ts';
import {
  captureLogs,
  CLICommandExecutor,
  CLICommandResolver,
  type CLIConfig,
  type CLIInitFn,
} from '../.exports.ts';

import type { CommandRuntime } from '../commands/CommandRuntime.ts';
import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import { CLICommandInvocationParser } from '../parser/CLICommandInvocationParser.ts';
import { CLIDFSContextManager } from '../CLIDFSContextManager.ts';
import { LocalDevCLIFileSystemHooks } from '../hooks/LocalDevCLIFileSystemHooks.ts';

export class CommandIntentRuntime<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
> {
  protected dfsCtxMgr: CLIDFSContextManager;
  protected expectedLogs: string[] = [];
  protected expectedExitCode: number | null = null;
  protected capturedOutput = '';
  protected actualExitCode: number | null = null;

  protected runtime: CommandRuntime<P>;
  protected ioc: IoCContainer;

  public get Output(): string {
    return this.capturedOutput;
  }

  public get Logs(): string[] {
    return this.capturedOutput.split('\n').filter(Boolean);
  }

  public get ExitCode(): number | null {
    return this.actualExitCode;
  }

  constructor(
    protected testName: string,
    protected module: CommandModule<A, F, P>,
    protected args: A,
    protected flags: F,
    protected cliConfigUrl: string,
    protected initFn?: CLIInitFn,
  ) {
    this.ioc = new IoCContainer();
    this.runtime = new module.Command();

    this.dfsCtxMgr = new CLIDFSContextManager(this.ioc);

    this.ioc.Register(CLIDFSContextManager, () => this.dfsCtxMgr);
    this.ioc.Register(
      CLICommandResolver,
      () => new CLICommandResolver(new LocalDevCLIFileSystemHooks(this.dfsCtxMgr)),
    );
    this.ioc.Register(
      CLICommandInvocationParser,
      () => new CLICommandInvocationParser(this.dfsCtxMgr),
    );
  }

  public ExpectLog(msg: string): this {
    this.expectedLogs.push(msg);
    return this;
  }

  public ExpectLogs(...msgs: string[]): this {
    msgs.forEach((msg) => this.ExpectLog(msg));
    return this;
  }

  public ExpectExit(code: number): this {
    this.expectedExitCode = code;
    return this;
  }

  public async Run(): Promise<void> {
    const originalExit = Deno.exit;
    let interceptedExitCode: number | null = null;

    // Intercept Deno.exit during test
    (Deno as any).exit = (code: number) => {
      interceptedExitCode = code;
      if (code > 0) throw new Error(`Deno.exit(${code}) intercepted`);
    };

    try {
      const dfsCtx = await this.ioc.Resolve(CLIDFSContextManager);
      dfsCtx.RegisterExecutionDFS();
      dfsCtx.RegisterProjectDFS(this.cliConfigUrl);

      const projectDFS = await dfsCtx.GetProjectDFS();

      const cliConfigFile = await projectDFS.GetFileInfo('.cli.json');

      const configText = cliConfigFile
        ? await new Response(cliConfigFile.Contents).text()
        : undefined;

      if (!configText) {
        throw new Error(
          `❌ Missing or unreadable .cli.json configuration file.`,
        );
      }

      const config = JSON.parse(configText) as CLIConfig;

      // const config: CLIConfig = {
      //   Name: "TestCLI",
      //   Version: "0.0.0",
      //   Description: "CLI under test",
      //   Tokens: ["test-cli"],
      // };

      await this.initFn?.(this.ioc, config);

      const executor = new CLICommandExecutor(
        this.ioc,
        await this.ioc.Resolve(CLICommandResolver),
      );

      const baseTemplatesDir = await this.dfsCtxMgr.ResolvePath(
        'project',
        './templates',
      );

      this.capturedOutput = await captureLogs(async () => {
        await executor.Execute(config, this.runtime, {
          key: this.runtime.BuildMetadata().Name,
          flags: this.flags,
          positional: this.args as string[],
          paramsCtor: this.module.Params,
          baseTemplatesDir,
          commands: undefined,
        });
      }, true);
    } catch (err) {
      if (
        interceptedExitCode === null &&
        err instanceof Error &&
        /Deno\.exit\(\d+\)/.test(err.message)
      ) {
        const match = err.message.match(/\d+/);
        if (match) interceptedExitCode = parseInt(match[0], 10);
      } else if (!/Deno\.exit/.test((err as any).message)) {
        throw err;
      }
    } finally {
      (Deno as any).exit = originalExit;
    }

    this.actualExitCode = interceptedExitCode ?? 0;

    this.assert();
  }

  protected assert(): void {
    const failures: string[] = [];

    if (
      this.expectedExitCode !== null &&
      this.actualExitCode !== this.expectedExitCode
    ) {
      failures.push(
        `❌ Expected exit code ${this.expectedExitCode}, got ${this.actualExitCode}`,
      );
    }

    for (const expected of this.expectedLogs) {
      if (!this.capturedOutput.includes(expected)) {
        failures.push(`❌ Expected log line not found:\n  → "${expected}"`);
      }
    }

    assert(
      failures.length === 0,
      `❌ Test "${this.testName}" failed with ${failures.length} issue(s):\n\n` +
        failures.map((f, i) => `${i + 1}. ${f}`).join('\n') +
        `\n\n📋 Captured Output:\n${this.capturedOutput.trim()}`,
    );
  }
}
