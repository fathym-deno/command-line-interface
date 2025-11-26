import { CLI } from "../src/CLI.ts";

const cli = new CLI();

await cli.RunFromArgs(Deno.args);
