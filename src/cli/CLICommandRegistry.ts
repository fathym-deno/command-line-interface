import type { CLICommandEntry } from "./types/CLICommandEntry.ts";

export class CLICommandRegistry {
  protected commands: Map<string, CLICommandEntry>;

  constructor() {
    this.commands = new Map<string, CLICommandEntry>();
  }

  public RegisterCommand(key: string, entry: CLICommandEntry): void {
    this.commands.set(key, entry);
  }

  public GetCommands(): Map<string, CLICommandEntry> {
    return new Map(this.commands);
  }
}
