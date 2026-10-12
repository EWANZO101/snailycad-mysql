import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SAFE_PATH = /^[^"'`$\r\n;&|<>]+$/;

/**
 * Runs a PowerShell script as a one-off SYSTEM scheduled task, so it outlives this API: anything
 * the API starts itself is killed with the CAD's Windows service (NSSM stops the process tree).
 * The script gets `-TaskName <name>` and should unregister the task when it's done.
 */
export async function runDetachedPowerShellTask(options: {
  taskName: string;
  scriptPath: string;
  /** extra arguments, already safe to put on a command line (validated by the caller) */
  args: string[];
}) {
  if (!SAFE_PATH.test(options.scriptPath) || !/^[\w-]+$/.test(options.taskName)) {
    throw new Error("unsafe task name or script path");
  }

  const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
  const argument = [
    "-NoProfile -ExecutionPolicy Bypass",
    `-File "${options.scriptPath}"`,
    ...options.args,
    `-TaskName "${options.taskName}"`,
  ].join(" ");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ${quote(argument)}`,
    "$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest",
    "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 3)",
    `Register-ScheduledTask -TaskName ${quote(
      options.taskName,
    )} -Action $action -Principal $principal -Settings $settings -Force | Out-Null`,
    `Start-ScheduledTask -TaskName ${quote(options.taskName)}`,
  ].join("\n");

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(script, "utf16le").toString("base64"),
    ],
    { timeout: 60_000, windowsHide: true },
  );
}
