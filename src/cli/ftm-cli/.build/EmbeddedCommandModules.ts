
import BuildCommand from "../commands/build.ts";
import CompileCommand from "../commands/compile.ts";
import InitCommand from "../commands/init.ts";
import InstallCommand from "../commands/install.ts";
import RunCommand from "../commands/run.ts";
import TestCommand from "../commands/test.ts";

export const EmbeddedCommandModules = {
  "build": BuildCommand,
  "compile": CompileCommand,
  "init": InitCommand,
  "install": InstallCommand,
  "run": RunCommand,
  "test": TestCommand,
};
