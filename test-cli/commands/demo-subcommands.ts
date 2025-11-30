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
    return this.Arg(0)!;
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
  "Demo command to prove builder vs module subcommands.",
)
  .Args(ParentArgs)
  .Flags(ParentFlags)
  .Params(ParentParams)
  // Pass builder for Ping and built module for Pong to exercise both code paths.
  .Commands({
    Ping: PingCommand,
    Pong: PongCommand.Build(),
  })
  .Run(async ({ Commands, Log }) => {
    await Commands?.Ping(["hello"], { loud: false });
    await Commands?.Pong(["world"], { loud: true });
    Log.Success("demo-subcommands finished");
    return 0;
  });
