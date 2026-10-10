import * as React from "react";
import useFetch from "lib/useFetch";
import { type DemoStatus, useDemoCountdown } from "components/auth/demo-detector";

let cachedStatus: DemoStatus | null = null;

/**
 * shown on every page when the API runs in demo mode, so people know their changes are temporary.
 */
export function DemoModeBanner() {
  const [status, setStatus] = React.useState<DemoStatus | null>(cachedStatus);
  const { execute } = useFetch();
  const countdown = useDemoCountdown(status?.nextResetAt);

  React.useEffect(() => {
    if (cachedStatus) return;

    (async () => {
      const { json } = await execute<DemoStatus>({ path: "/demo", method: "GET", noToast: true });
      if (json && typeof json.enabled === "boolean") {
        cachedStatus = json;
        setStatus(json);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    // refresh the next reset time once the countdown has run out
    if (!status?.enabled || countdown !== "0:00") return;

    const timeout = setTimeout(async () => {
      const { json } = await execute<DemoStatus>({ path: "/demo", method: "GET", noToast: true });
      if (json) {
        cachedStatus = json;
        setStatus(json);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [countdown, status?.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!status?.enabled) return null;

  return (
    <div className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/60 bg-amber-100/80 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <span>
        <strong>Demo CAD:</strong> everything you change here is reset every{" "}
        {status.resetMinutes} minutes.
      </span>
      {countdown ? (
        <span>
          Next reset in <strong className="tabular-nums">{countdown}</strong>
        </span>
      ) : null}
    </div>
  );
}
