import type { CommandLog } from "../commands/CommandLog.ts";

export async function runWithPassthroughLogs(
  cmd: Deno.Command,
  log: CommandLog,
  {
    exitOnFail = true,
    prefix,
  }: {
    exitOnFail?: boolean;
    prefix?: string; // optional prefix label for logs
  } = {},
): Promise<{ code: number; success: boolean }> {
  const proc = cmd.spawn();
  const { code, success } = await proc.status;

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (stdout.trim()) {
    log.Info(`${prefix ?? ""}${stdout.trim()}`);
  }
  if (stderr.trim()) {
    log.Error(`${prefix ?? ""}${stderr.trim()}`);
  }

  if (!success && exitOnFail) {
    log.Error(`❌ Command failed with exit code ${code}`);
    Deno.exit(code);
  }

  return { code, success };
}
