import { CallSource } from "@snailycad/types";
import { useTranslations } from "use-intl";
import { classNames } from "lib/classNames";

const SOURCE_STYLES: Record<CallSource, string> = {
  [CallSource.MANUAL]: "bg-gray-200 dark:bg-secondary text-neutral-700 dark:text-gray-300",
  [CallSource.FIVEM]: "bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200",
  [CallSource.ERLC]: "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200",
  [CallSource.OPS_PHONE]: "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200",
};

interface Props {
  source: CallSource;
}

/** small colored pill so a dispatcher can tell a FiveM call from an ER:LC call from a manual one
 *  at a glance in the calls table, without reading the description text. */
export function CallSourceBadge({ source }: Props) {
  const t = useTranslations("Calls");

  return (
    <span
      className={classNames(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        SOURCE_STYLES[source] ?? SOURCE_STYLES[CallSource.MANUAL],
      )}
    >
      {t(`source_${source}`)}
    </span>
  );
}
