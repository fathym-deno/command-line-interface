import type { CommandModule } from "../commands/CommandModule.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import { CommandIntentRuntime } from "./CommandIntentRuntime.ts";
import type { CLIInitFn } from "../types/CLIInitFn.ts";

export class CommandIntentBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
> {
  protected args: A = [] as unknown as A;
  protected flags: F = {} as F;
  protected initFn?: CLIInitFn;

  protected expectations: ((runner: CommandIntentRuntime<A, F, P>) => void)[] = [];

  constructor(
    protected testName: string,
    protected command: CommandModule<A, F, P>,
    protected cliConfigUrl: string,
  ) {}

  public Args(args: A): this {
    this.args = args;
    return this;
  }

  public Flags(flags: F): this {
    this.flags = flags;
    return this;
  }

  public WithInit(init: CLIInitFn): this {
    this.initFn = init;
    return this;
  }

  public ExpectLogs(...lines: string[]): this {
    lines.forEach((line) => {
      this.expectations.push((r) => r.ExpectLog(line));
    });
    return this;
  }

  public ExpectExit(code: number): this {
    this.expectations.push((r) => r.ExpectExit(code));
    return this;
  }

  public Run(): void {
    Deno.test(this.testName, async () => {
      await this.execute();
    });
  }

  public async RunStep(step: Deno.TestContext["step"]): Promise<void> {
    await step(this.testName, async () => {
      await this.execute();
    });
  }

  protected async execute(): Promise<void> {
    const runner = new CommandIntentRuntime(
      this.testName,
      this.command,
      this.args,
      this.flags,
      this.cliConfigUrl,
      this.initFn,
    );

    this.expectations.forEach((fn) => fn(runner));

    await runner.Run();
  }
}
