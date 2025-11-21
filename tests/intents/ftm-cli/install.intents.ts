import { CommandIntents } from "../../test.deps.ts";
import InstallCommand from "../../../src/cli/ftm-cli/commands/install.ts";

CommandIntents(
  "Install Command Suite",
  InstallCommand.Build(),
  import.meta.resolve("../../../src/cli/ftm-cli/.cli.json"),
)
  .Intent("Install CLI binary to system path", (int) =>
    int
      .Args([])
      .Flags({
        config: "./test/my-cli/.cli.json",
      })
      .ExpectLogs(
        "✅ Installed: ", // main binary copy success
        "🎉 CLI installed successfully", // final success message
      )
      .ExpectExit(0))
  .Run();
