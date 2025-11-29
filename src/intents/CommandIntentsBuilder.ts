// CommandIntentsBuilder.ts
import type { CLIInitFn } from '../types/CLIInitFn.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandInvokerMap } from '../commands/CommandContext.ts';
import { CommandIntentBuilder } from './CommandIntentBuilder.ts';

/**
 * Suite-based test builder for grouping multiple intents for a single command.
 *
 * This is the **preferred** way to test commands. It provides better organization,
 * shared setup via `.BeforeAll()` and `.WithInit()`, and groups related tests.
 *
 * ## Type-Safe Service Mocking
 *
 * The builder preserves the command's service types (`S`) enabling type-safe
 * service mocking via `WithServices()`. Suite-wide mocks apply to all intents,
 * and individual intents can override specific services:
 *
 * ```typescript
 * CommandIntents('Deploy Suite', DeployCommand, configPath)
 *   .WithServices({
 *     deployer: mockDeployer,  // Suite-wide mock
 *   })
 *   .Intent('deploys staging', (int) =>
 *     int.Args(['staging']).ExpectExit(0))
 *   .Intent('deploys prod with different mock', (int) =>
 *     int
 *       .WithServices({ deployer: prodMockDeployer })  // Override
 *       .Args(['prod'])
 *       .ExpectExit(0))
 *   .Run();
 * ```
 *
 * @example
 * ```typescript
 * import { CommandIntents } from '@fathym/cli';
 * import HelloCommand from '../commands/hello.ts';
 * import initFn from '../.cli.init.ts';
 *
 * const cmd = HelloCommand.Build();  // Call .Build() for fluent commands
 * const origin = import.meta.resolve('../.cli.json');
 *
 * CommandIntents('Hello Command Suite', cmd, origin)
 *   .WithInit(initFn)
 *   .BeforeAll(async () => {
 *     await cleanupTempFiles();
 *   })
 *   .Intent('greets default world', (int) =>
 *     int
 *       .Args([undefined])
 *       .Flags({})
 *       .ExpectLogs('👋 Hello, world')
 *       .ExpectExit(0))
 *   .Intent('greets a specific name', (int) =>
 *     int
 *       .Args(['Alice'])
 *       .Flags({})
 *       .ExpectLogs('👋 Hello, Alice')
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
 * @see {@link CommandIntentBuilder} - Single test builder
 * @see {@link CommandIntents} - Factory function
 */
export class CommandIntentsBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
> {
  protected initFn?: CLIInitFn;
  protected beforeAllFn?: () => void | Promise<void>;
  protected mockServices: Partial<S> = {};
  protected testBuilders: CommandIntentBuilder<A, F, P, S, C>[] = [];

  /**
   * Creates a new suite-based test builder.
   *
   * @param suiteName - Name of the test suite
   * @param command - Command module to test (use `.Build()` for fluent commands)
   * @param cliConfigUrl - Path to .cli.json configuration
   */
  constructor(
    protected suiteName: string,
    protected command: CommandModule<A, F, P, S, C>,
    protected cliConfigUrl: string,
  ) {}

  /**
   * Inject an initialization function for IoC service registration.
   *
   * @param init - CLI init function (typically from `.cli.init.ts`)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * import initFn from '../.cli.init.ts';
   *
   * CommandIntents('My Suite', cmd, origin)
   *   .WithInit(initFn)
   *   .Intent(...)
   *   .Run();
   * ```
   */
  public WithInit(init: CLIInitFn): this {
    this.initFn = init;
    return this;
  }

  /**
   * Run setup before all tests in the suite.
   *
   * @param fn - Setup function (can be async)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * CommandIntents('Init Suite', cmd, origin)
   *   .BeforeAll(async () => {
   *     await Deno.remove('./tests/.temp', { recursive: true }).catch(() => {});
   *   })
   *   .Intent(...)
   *   .Run();
   * ```
   */
  public BeforeAll(fn: () => void | Promise<void>): this {
    this.beforeAllFn = fn;
    return this;
  }

  /**
   * Inject mock services for all tests in the suite.
   *
   * Services are typed based on the command's `.Services()` definition,
   * providing autocomplete and type checking for mock objects.
   *
   * Individual intents can override specific services using their own
   * `.WithServices()` call.
   *
   * @param services - Partial map of services to mock
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * CommandIntents('Deploy Suite', DeployCommand, configPath)
   *   .WithServices({
   *     deployer: mockDeployer,  // Applied to all intents
   *   })
   *   .Intent('deploys staging', (int) =>
   *     int.Args(['staging']).ExpectExit(0))
   *   .Intent('deploys with override', (int) =>
   *     int
   *       .WithServices({ deployer: differentMock })  // Overrides suite mock
   *       .Args(['prod'])
   *       .ExpectExit(0))
   *   .Run();
   * ```
   */
  public WithServices(services: Partial<S>): this {
    this.mockServices = { ...this.mockServices, ...services };
    return this;
  }

  /**
   * Add a test intent to the suite.
   *
   * @param name - Test case name
   * @param build - Builder configuration function
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .Intent('test case name', (int) =>
   *   int
   *     .Args(['value'])
   *     .Flags({ flag: true })
   *     .ExpectLogs('expected output')
   *     .ExpectExit(0))
   * ```
   */
  public Intent(
    name: string,
    build: (
      builder: CommandIntentBuilder<A, F, P, S, C>,
    ) => CommandIntentBuilder<A, F, P, S, C>,
  ): this {
    const builder = new CommandIntentBuilder<A, F, P, S, C>(
      name,
      this.command,
      this.cliConfigUrl,
    );

    // Apply suite-level mock services to the builder
    if (Object.keys(this.mockServices).length > 0) {
      builder.WithServices(this.mockServices);
    }

    this.testBuilders.push(build(builder));
    return this;
  }

  /**
   * Execute all intents in the suite.
   *
   * Registers a `Deno.test()` with nested steps for each intent.
   */
  public Run(): void {
    Deno.test(this.suiteName, async (t) => {
      if (this.beforeAllFn) {
        await this.beforeAllFn();
      }

      for (const builder of this.testBuilders) {
        if (this.initFn) {
          builder.WithInit(this.initFn);
        }

        await builder.RunStep(t.step);
      }
    });
  }
}
