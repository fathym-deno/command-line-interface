import type { CommandModule } from "../commands/CommandModule.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import type { CommandInvokerMap } from "../commands/CommandContext.ts";
import { CommandIntentRuntime } from "./CommandIntentRuntime.ts";
import type { CLIInitFn } from "../types/CLIInitFn.ts";

/**
 * Builder for configuring a single command test intent.
 *
 * Used both directly via `CommandIntent()` for standalone tests and indirectly
 * via `CommandIntents().Intent()` for suite-based tests.
 *
 * ## Type-Safe Service Mocking
 *
 * The builder preserves the command's service types (`S`) enabling type-safe
 * service mocking via `WithServices()`:
 *
 * ```typescript
 * // Services are typed based on the command's Services() definition
 * CommandIntent('deploys', DeployCommand, configPath)
 *   .WithServices({
 *     deployer: mockDeployer,  // TypeScript knows the expected shape
 *   })
 *   .Args(['staging'])
 *   .ExpectExit(0)
 *   .Run();
 * ```
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
 * @typeParam A - Positional arguments tuple type
 * @typeParam F - Flags record type
 * @typeParam P - CommandParams subclass
 * @typeParam S - Services record type for type-safe mocking
 * @typeParam C - CommandInvokerMap for subcommands
 *
 * @see {@link CommandIntentsBuilder} - Suite-based testing (preferred)
 */
export class CommandIntentBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
> {
  protected args: A = [] as unknown as A;
  protected flags: F = {} as F;
  protected initFn?: CLIInitFn;
  protected mockServices: Partial<S> = {};

  protected expectations:
    ((runner: CommandIntentRuntime<A, F, P, S, C>) => void)[] = [];

  /**
   * Creates a new intent builder.
   *
   * @param testName - Test description
   * @param command - Command module to test (with full type info)
   * @param cliConfigUrl - Path to .cli.json
   */
  constructor(
    protected testName: string,
    protected command: CommandModule<A, F, P, S, C>,
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
   * Inject mock services for testing.
   *
   * Services are typed based on the command's `.Services()` definition,
   * providing autocomplete and type checking for mock objects.
   *
   * Mock services override the real services returned by the command's
   * service factory during test execution.
   *
   * @param services - Partial map of services to mock
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * CommandIntent('deploys to staging', DeployCommand, configPath)
   *   .WithServices({
   *     deployer: {
   *       deploy: async () => ({ success: true }),
   *     },
   *     // Other services use real implementations
   *   })
   *   .Args(['staging'])
   *   .ExpectExit(0)
   *   .Run();
   * ```
   */
  public WithServices(services: Partial<S>): this {
    this.mockServices = { ...this.mockServices, ...services };
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
  public async RunStep(step: Deno.TestContext["step"]): Promise<void> {
    await step(this.testName, async () => {
      await this.execute();
    });
  }

  protected async execute(): Promise<void> {
    const runner = new CommandIntentRuntime<A, F, P, S, C>(
      this.testName,
      this.command,
      this.args,
      this.flags,
      this.cliConfigUrl,
      this.initFn,
      this.mockServices,
    );

    this.expectations.forEach((fn) => fn(runner));

    await runner.Run();
  }
}
