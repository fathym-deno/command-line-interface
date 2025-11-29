// CommandIntentsBuilder.ts
import type { CLIInitFn } from '../types/CLIInitFn.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import type { CommandModule } from '../commands/CommandModule.ts';
import { CommandIntentBuilder } from './CommandIntentBuilder.ts';

/**
 * Suite-based test builder for grouping multiple intents for a single command.
 *
 * This is the **preferred** way to test commands. It provides better organization,
 * shared setup via `.BeforeAll()` and `.WithInit()`, and groups related tests.
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
 * @see {@link CommandIntentBuilder} - Single test builder
 * @see {@link CommandIntents} - Factory function
 */
export class CommandIntentsBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
> {
  protected initFn?: CLIInitFn;
  protected beforeAllFn?: () => void | Promise<void>;
  protected testBuilders: CommandIntentBuilder<A, F, P>[] = [];

  /**
   * Creates a new suite-based test builder.
   *
   * @param suiteName - Name of the test suite
   * @param command - Command module to test (use `.Build()` for fluent commands)
   * @param cliConfigUrl - Path to .cli.json configuration
   */
  constructor(
    protected suiteName: string,
    protected command: CommandModule<A, F, P>,
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
      builder: CommandIntentBuilder<A, F, P>,
    ) => CommandIntentBuilder<A, F, P>,
  ): this {
    const builder = new CommandIntentBuilder(
      name,
      this.command,
      this.cliConfigUrl,
    );

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
