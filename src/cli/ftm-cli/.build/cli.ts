import { CLI, CLICommandResolver } from "@fathym/common/cli";
import { EmbeddedCLIFileSystemHooks } from "./EmbeddedCLIFileSystemHooks.ts";

const cli = new CLI({
  resolver: new CLICommandResolver(new EmbeddedCLIFileSystemHooks()),
});

cli.RunFromArgs(Deno.args);
