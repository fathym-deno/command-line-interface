import type { ZodSchema } from "../.deps.ts";
import type { CommandParamConstructor } from "./CommandParams.ts";
import type { CommandRuntime } from "./CommandRuntime.ts";
import type { ValidateCallback } from "../validation/types.ts";

export type CommandMatch = {
  Command: CommandRuntime | undefined;
  Flags: Record<string, unknown>;
  Args: string[];
  Params: CommandParamConstructor | undefined;
  ArgsSchema?: ZodSchema;
  FlagsSchema?: ZodSchema;
  Validate?: ValidateCallback;
};
