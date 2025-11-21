import { CommandIntents } from "../../test.deps.ts";
import InitCommand from "../../../src/cli/ftm-cli/commands/init.ts";

CommandIntents(
  "Init Command Suite",
  InitCommand.Build(),
  import.meta.resolve("../../../src/cli/ftm-cli/.cli.json"),
)
  .Intent("Init with default 'hello' template", (int) =>
    int
      .Args(["./test/my-cli"])
      .Flags({})
      .ExpectLogs(
        `Project created from "hello" template.`,
        "📂 Initialized at:",
      )
      .ExpectExit(0))
  .Run();
