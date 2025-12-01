/**
 * Base class for all CLI command parameter sets.
 * Provides typed access to raw flags and args, plus standard dry-run support.
 */
export abstract class CommandParams<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
> {
  constructor(public readonly Args: A, public readonly Flags: F) {}

  /**
   * Indicates whether this command was invoked in dry-run mode.
   * Automatically derived from the `--dry-run` flag.
   */
  public get DryRun(): boolean {
    return !!this.Flag('dry-run');
  }

  /**
   * Get a positional argument by index.
   */
  protected Arg<Index extends keyof A & number>(
    index: Index,
  ): A[Index] | undefined {
    return this.Args?.[index];
  }

  /**
   * Get a named flag by key.
   */
  protected Flag<K extends keyof F>(key: K): F[K] | undefined {
    return this.Flags?.[key];
  }
}

/**
 * Strongly typed constructor for a CommandParams subclass.
 */
export type CommandParamConstructor<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
> = new (args: A, flags: F) => P;
