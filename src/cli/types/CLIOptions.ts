import type { CLICommandResolver } from "../CLICommandResolver.ts";
import type { CLICommandInvocationParser } from "../CLICommandInvocationParser.ts";
import type { CLIDFSContextManager } from "../CLIDFSContextManager.ts";

export type CLIOptions = {
  dfsCtxMgr?: CLIDFSContextManager;

  parser?: CLICommandInvocationParser;

  resolver?: CLICommandResolver;
};
