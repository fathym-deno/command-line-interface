import { CLI } from "../src/cli/CLI.ts";

const cli = new CLI();

await cli.RunFromArgs(Deno.args);
