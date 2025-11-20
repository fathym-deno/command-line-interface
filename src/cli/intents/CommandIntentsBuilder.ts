// CommandIntentsBuilder.ts
import type { CLIInitFn } from "../types/CLIInitFn.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import type { CommandModule } from "../commands/CommandModule.ts";
import { CommandIntentBuilder } from "./CommandIntentBuilder.ts";

export class CommandIntentsBuilder<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
> {
  protected initFn?: CLIInitFn;
  protected testBuilders: CommandIntentBuilder<A, F, P>[] = [];

  constructor(
    protected suiteName: string,
    protected command: CommandModule<A, F, P>,
    protected cliConfigUrl: string,
  ) {}

  public WithInit(init: CLIInitFn): this {
    this.initFn = init;
    return this;
  }

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

  public Run(): void {
    Deno.test(this.suiteName, async (t) => {
      for (const builder of this.testBuilders) {
        if (this.initFn) {
          builder.WithInit(this.initFn);
        }

        await builder.RunStep(t.step);
      }
    });
  }
}
