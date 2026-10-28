import { CallSource } from "@snailycad/types";
import { useTranslations } from "use-intl";
import { classNames } from "lib/classNames";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useCallsFilters } from "state/callsFiltersState";
import type { useAsyncTable } from "components/shared/Table";
import type { Full911Call } from "state/dispatch/dispatch-state";

interface Props {
  asyncTable: ReturnType<typeof useAsyncTable<Full911Call>>;
}

/**
 * Lets a dispatcher isolate calls by which integration created them (FiveM, ER:LC, ops-phone,
 * or plain manual/dispatch calls) instead of only being able to tell them apart by reading the
 * free text stuffed into the call description. ER:LC only shows up when the ER:LC feature is
 * actually enabled on this CAD (it's the one integration with a real Feature flag); FiveM and
 * ops-phone calls go through the same endpoint as manual calls with no dedicated flag to check,
 * so those two tabs are always offered - an unused one just stays empty.
 */
export function CallSourceTabs({ asyncTable }: Props) {
  const t = useTranslations("Calls");
  const { source, setSource } = useCallsFilters((state) => ({
    source: state.source,
    setSource: state.setSource,
  }));
  const { ERLC } = useFeatureEnabled();

  const tabs: { value: CallSource | null; label: string }[] = [
    { value: null, label: t("allSources") },
    { value: CallSource.MANUAL, label: t("source_MANUAL") },
    { value: CallSource.FIVEM, label: t("source_FIVEM") },
    ERLC ? { value: CallSource.ERLC, label: t("source_ERLC") } : null,
    { value: CallSource.OPS_PHONE, label: t("source_OPS_PHONE") },
  ].filter(Boolean) as { value: CallSource | null; label: string }[];

  function selectSource(value: CallSource | null) {
    setSource(value);
    asyncTable.setFilters((prev) => ({ ...prev, source: value ?? undefined }));
  }

  return (
    <div className="flex items-center gap-1 px-4 pt-2 flex-wrap" role="tablist" aria-label={t("source")}>
      {tabs.map((tab) => (
        <button
          key={tab.value ?? "all"}
          type="button"
          role="tab"
          aria-selected={source === tab.value}
          onClick={() => selectSource(tab.value)}
          className={classNames(
            "text-sm px-3 py-1 rounded-full border transition-colors",
            source === tab.value
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-gray-400 dark:border-quinary text-neutral-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-secondary",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
