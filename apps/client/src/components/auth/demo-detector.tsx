import * as React from "react";
import { Alert, Button, Loader } from "@snailycad/ui";
import Link from "next/link";
import { useRouter } from "next/router";
import useFetch from "lib/useFetch";
import type { PostLoginUserData } from "@snailycad/types/api";

export interface DemoStatus {
  enabled: boolean;
  username?: string;
  password?: string;
  resetMinutes?: number;
  nextResetAt?: string | null;
}

export function useDemoCountdown(nextResetAt: string | null | undefined) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!nextResetAt || now === null) return null;

  const remaining = Math.max(0, Math.floor((new Date(nextResetAt).getTime() - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function DemoDetector({ demo }: { demo?: DemoStatus | null }) {
  const [isHostedDemo, setIsHostedDemo] = React.useState(false);
  const countdown = useDemoCountdown(demo?.nextResetAt);
  const router = useRouter();
  const { state, execute } = useFetch();

  React.useEffect(() => {
    setIsHostedDemo(window.location.hostname === "demo.snailycad.org");
  }, []);

  async function handleDemoLogin() {
    if (!demo?.username || !demo.password) return;

    const { json } = await execute<PostLoginUserData>({
      path: "/auth/login",
      method: "POST",
      data: { username: demo.username, password: demo.password },
    });

    if (json?.userId) {
      router.push("/admin");
    }
  }

  if (demo?.enabled) {
    return (
      <Alert className="max-w-md w-full mb-5" type="warning" title="Try the SnailyCAD demo">
        <p>
          Log in with the demo account below. It has full admin access, so feel free to explore and
          change anything.
        </p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-3 font-mono text-sm">
          <dt className="font-sans font-semibold">Username</dt>
          <dd className="select-all">{demo.username}</dd>
          <dt className="font-sans font-semibold">Password</dt>
          <dd className="select-all">{demo.password}</dd>
        </dl>

        <p className="mt-3 text-sm">
          All changes are wiped every {demo.resetMinutes} minutes.
          {countdown ? (
            <>
              {" "}
              Next reset in <span className="font-semibold tabular-nums">{countdown}</span>.
            </>
          ) : null}
        </p>

        <Button
          className="mt-3 flex items-center gap-2"
          onPress={handleDemoLogin}
          disabled={state === "loading"}
        >
          {state === "loading" ? <Loader /> : null}
          Log in as demo admin
        </Button>
      </Alert>
    );
  }

  if (!isHostedDemo) return null;

  return (
    <Alert className="max-w-md mb-5" type="warning" title="How to use this demo">
      <p>
        This demo is a fully functional version of SnailyCADv4. You can use this demo to test out
        SnailyCADv4 before you decide to install and use it for your own community.
        <br />
        To use this demo, please create a new account. This will give you access to 99% of the
        features of SnailyCADv4
      </p>

      <Link className="mt-2 underline text-black font-medium" href="https://docs.snailycad.org">
        Learn more about SnailyCAD
      </Link>
    </Alert>
  );
}
