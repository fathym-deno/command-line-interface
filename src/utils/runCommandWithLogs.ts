import type { CommandLog } from "../commands/CommandLog.ts";

export async function runCommandWithLogs(
  args: string[],
  log: CommandLog,
  {
    command = "deno",
    exitOnFail = true,
    stdin = "inherit",
    prefix = "",
    cwd,
  }: {
    command?: string;
    exitOnFail?: boolean;
    stdin?: "inherit" | "null";
    prefix?: string;
    cwd: string;
  },
): Promise<{ code: number; success: boolean }> {
  const cmd = new Deno.Command(command, {
    args,
    stdin,
    stdout: "piped",
    stderr: "piped",
    cwd,
  });

  const proc = cmd.spawn();
  const { code, success } = await proc.status;

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (stdout.trim()) log.Info(`${prefix}${stdout.trim()}`);
  if (stderr.trim()) log.Error(`${prefix}${stderr.trim()}`);

  if (!success && exitOnFail) {
    log.Error(`❌ ${command} command failed with exit code ${code}`);
    Deno.exit(code);
  }

  return { code, success };
}
