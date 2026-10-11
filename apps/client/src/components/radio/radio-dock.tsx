import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Permissions } from "@snailycad/permissions";
import { usePermission } from "hooks/usePermission";
import { POPOUT_PATH, useRadioHub } from "./radio-hub";

const RadioConsole = dynamic(async () => (await import("./radio-console")).RadioConsole, {
  ssr: false,
});

/** pages that show the full radio console themselves */
const CONSOLE_PAGES = ["/radio", POPOUT_PATH];

/**
 * The floating radio on every page of the CAD (when the RADIO feature is on and the user is a
 * dispatcher, LEO or EMS-FD). Mounted once in _app, so it stays connected between pages.
 */
export function RadioDock() {
  const router = useRouter();
  const hub = useRadioHub();
  const { hasPermissions } = usePermission();

  if (!hub || hub.role === "off" || CONSOLE_PAGES.includes(router.pathname)) return null;
  return <RadioConsole variant="dock" canPlayTones={hasPermissions([Permissions.Dispatch])} />;
}
