import dynamic from "next/dynamic";
import { Permissions } from "@snailycad/permissions";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { usePermission } from "hooks/usePermission";

const RadioConsole = dynamic(async () => (await import("./radio-console")).RadioConsole, {
  ssr: false,
});

interface RadioDockProps {
  /** the active unit's radio channel, opened when nothing was picked yet */
  defaultChannelId?: string | null;
}

/** the floating radio on the dispatch, LEO and EMS-FD pages (when the RADIO feature is on) */
export function RadioDock({ defaultChannelId }: RadioDockProps) {
  const { RADIO } = useFeatureEnabled();
  const { hasPermissions } = usePermission();

  const canUseRadio = hasPermissions([Permissions.Dispatch, Permissions.Leo, Permissions.EmsFd]);
  if (!RADIO || !canUseRadio) return null;

  return (
    <RadioConsole
      variant="dock"
      canPlayTones={hasPermissions([Permissions.Dispatch])}
      defaultChannelId={defaultChannelId}
    />
  );
}
