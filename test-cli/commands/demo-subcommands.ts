import { Command, CommandParams } from "../../src/.exports.ts";
import { z } from "../../tests/test.deps.ts";

const ParentArgs = z.tuple([]);
const ParentFlags = z.object({});

const ChildArgs = z.tuple([z.string().describe("message")]);
const ChildFlags = z.object({
  loud: z.boolean().optional().describe("Uppercase the message."),
});

class ParentParams extends CommandParams<
  z.infer<typeof ParentArgs>,
  z.infer<typeof ParentFlags>
> {}

class ChildParams extends CommandParams<
  z.infer<typeof ChildArgs>,
  z.infer<typeof ChildFlags>
> {
  get Message(): string {
    return this.Arg(0) ?? "";
  }
  get Loud(): boolean {
    return this.Flag("loud") ?? false;
  }
}

const PingCommand = Command("demo:ping", "Ping subcommand")
  .Args(ChildArgs)
  .Flags(ChildFlags)
  .Params(ChildParams)
  .Run(({ Log, Params }) => {
    const msg = Params.Loud ? Params.Message.toUpperCase() : Params.Message;
    Log.Info(`pong:${msg}`);
    return 0;
  });

const PongCommand = Command("demo:pong", "Pong subcommand")
  .Args(ChildArgs)
  .Flags(ChildFlags)
  .Params(ChildParams)
  .Run(({ Log, Params }) => {
    const msg = Params.Loud ? Params.Message.toUpperCase() : Params.Message;
    Log.Info(`ping:${msg}`);
    return 0;
  });

export default Command(
  "demo-subcommands",
  "Demo command to prove subcommand strong typing.",
)
  .Args(ParentArgs)
  .Flags(ParentFlags)
  .Params(ParentParams)
  // Use .Build() for subcommands to ensure strong type inference
  .Commands({
    Ping: PingCommand.Build(),
    Pong: PongCommand.Build(),
  })
  .Run(async ({ Commands, Log }) => {
    if (!Commands) throw new Error("Commands not injected");
    const commands = Commands;

    // Type-level assertions - will error if inference widens
    type PingInvoker = (typeof commands)["Ping"];
    type PingArgs = Parameters<PingInvoker>[0];
    type PingFlags = Parameters<PingInvoker>[1];

    type AssertEqual<A, B> =
      (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
        ? true
        : never;

    // These lines will become errors if subcommand typing degrades
    type _AssertPingArgs = AssertEqual<PingArgs, z.infer<typeof ChildArgs> | undefined>;
    type _AssertPingFlags = AssertEqual<PingFlags, z.infer<typeof ChildFlags> | undefined>;

    // Suppress unused type warnings
    const _typeCheck: [_AssertPingArgs, _AssertPingFlags] = [true, true];
    void _typeCheck;

    // Runtime usage with strong typing
    await commands.Ping(["hello"], { loud: false });
    await commands.Pong(["world"], { loud: true });

    Log.Success("demo-subcommands finished");

    return 0;
  });
