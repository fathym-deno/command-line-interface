import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import { CommandIntentRuntime } from './CommandIntentRuntime.ts';
import type { CLIInitFn } from '../types/CLIInitFn.ts';

/**
 * Builder for configuring a single command test intent.
 *
 * Used both directly via `CommandIntent()` for standalone tests and indirectly
 * via `CommandIntents().Intent()` for suite-based tests.
 *
 * @example Standalone usage
 * ```typescript
 * CommandIntent('greets the user', GreetCommand.Build(), configPath)
 *   .Args(['World'])
 *   .ExpectLogs('Hello, World!')
 *   .ExpectExit(0)
 *   .Run();
 * ```
 *
 * @example Suite usage
 * ```typescript
 * CommandIntents('Greet Suite', cmd, origin)
 *   .Intent('greets by name', (int) =>
 *     int
 *       .Args(['Alice'])
 *       .ExpectLogs('Hello, Alice!')
 *       .ExpectExit(0))
 *   .Run();
 * ```
 *
 * @see {@link CommandIntentsBuilder} - Suite-based testing (preferred)
 */
export class CommandIntentBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
> {
  protected args: A = [] as unknown as A;
  protected flags: F = {} as F;
  protected initFn?: CLIInitFn;

  protected expectations: ((runner: CommandIntentRuntime<A, F, P>) => void)[] = [];

  /**
   * Creates a new intent builder.
   *
   * @param testName - Test description
   * @param command - Command module to test
   * @param cliConfigUrl - Path to .cli.json
   */
  constructor(
    protected testName: string,
    protected command: CommandModule<A, F, P>,
    protected cliConfigUrl: string,
  ) {}

  /**
   * Set positional arguments for the test.
   *
   * @param args - Array of argument values
   * @returns This builder for chaining
   */
  public Args(args: A): this {
    this.args = args;
    return this;
  }

  /**
   * Set flags for the test.
   *
   * @param flags - Flag key-value pairs
   * @returns This builder for chaining
   */
  public Flags(flags: F): this {
    this.flags = flags;
    return this;
  }

  /**
   * Inject an initialization function for IoC service registration.
   *
   * @param init - CLI init function
   * @returns This builder for chaining
   */
  public WithInit(init: CLIInitFn): this {
    this.initFn = init;
    return this;
  }

  /**
   * Assert log output contains the specified messages (in order).
   *
   * @param lines - Expected log messages
   * @returns This builder for chaining
   */
  public ExpectLogs(...lines: string[]): this {
    lines.forEach((line) => {
      this.expectations.push((r) => r.ExpectLog(line));
    });
    return this;
  }

  /**
   * Assert the expected exit code.
   *
   * @param code - Expected exit code (0 = success)
   * @returns This builder for chaining
   */
  public ExpectExit(code: number): this {
    this.expectations.push((r) => r.ExpectExit(code));
    return this;
  }

  /**
   * Execute the intent test.
   *
   * Registers a `Deno.test()` with the configured assertions.
   */
  public Run(): void {
    Deno.test(this.testName, async () => {
      await this.execute();
    });
  }

  /**
   * Execute as a nested test step (used by CommandIntentsBuilder).
   *
   * @param step - Deno test step function
   */
  public async RunStep(step: Deno.TestContext['step']): Promise<void> {
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
