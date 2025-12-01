import { CommandIntent } from "../../test.deps.ts";
import DemoCommand from "../../../test-cli/commands/demo-subcommands.ts";

const configPath = "./test-cli/.cli.json";

CommandIntent(
  "Demo subcommands – strong subcommand typing",
  DemoCommand.Build(),
  configPath,
)
  .ExpectLogs("pong:hello", "ping:WORLD", "demo-subcommands finished")
  .ExpectExit(0)
  .Run();
