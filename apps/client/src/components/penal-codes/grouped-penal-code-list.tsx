import * as React from "react";
import type { PenalCode } from "@snailycad/types";
import { Button, Infofield, TextField } from "@snailycad/ui";
import { useTranslations } from "use-intl";
import { ChevronDown, ChevronRight } from "react-bootstrap-icons";
import { yesOrNoText } from "lib/utils";
import { Editor, dataToSlate } from "components/editor/editor";
import {
  getPenalCodeMaxFines,
  getPenalCodeMinFines,
} from "components/leo/modals/manage-record/table-item-form";
import { groupPenalCodes, penalCodeMatchesSearch } from "lib/penal-codes/group-penal-codes";

interface Props {
  penalCodes: PenalCode[];
}

/**
 * Read-only list of penal codes grouped by their penal code group (sorted by group position,
 * then title) with collapsible groups and a search box that filters across every group.
 * Used by the Law Book (`/law-book`) and the officer penal codes page (`/officer/penal-codes`).
 * Requires the `citizen` translations (LawBook namespace) to be loaded.
 */
export function GroupedPenalCodeList({ penalCodes }: Props) {
  const t = useTranslations("LawBook");
  const common = useTranslations("Common");
  const [search, setSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const groups = React.useMemo(
    () => groupPenalCodes(penalCodes, { ungroupedName: t("ungrouped") }),
    [penalCodes, t],
  );

  const filteredGroups = React.useMemo(() => {
    if (!search.trim()) return groups;

    return groups
      .map((group) => ({
        ...group,
        penalCodes: group.penalCodes.filter((penalCode) =>
          penalCodeMatchesSearch(penalCode, search),
        ),
      }))
      .filter((group) => group.penalCodes.length > 0);
  }, [groups, search]);

  const isSearching = search.trim().length > 0;

  function setAllCollapsed(value: boolean) {
    setCollapsed(Object.fromEntries(groups.map((group) => [group.id, value])));
  }

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          label={common("search")}
          className="my-2 flex-1"
          name="search"
          value={search}
          onChange={(value) => setSearch(value)}
        />

        <div className="flex gap-2 mb-2">
          <Button type="button" size="sm" onPress={() => setAllCollapsed(false)}>
            {t("expandAll")}
          </Button>
          <Button type="button" size="sm" onPress={() => setAllCollapsed(true)}>
            {t("collapseAll")}
          </Button>
        </div>
      </div>

      {filteredGroups.length <= 0 ? <p className="mt-3">{t("noSearchResults")}</p> : null}

      <div className="flex flex-col mt-3 gap-y-4">
        {filteredGroups.map((group) => {
          // always show the matches while searching
          const isCollapsed = !isSearching && Boolean(collapsed[group.id]);
          const Icon = isCollapsed ? ChevronRight : ChevronDown;

          return (
            <section key={group.id} aria-label={group.name}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleGroup(group.id)}
                className="flex items-center gap-2 w-full text-left text-xl font-semibold py-2 border-b border-gray-300 dark:border-gray-700"
              >
                <Icon className="w-4 h-4" aria-hidden />
                {group.name}
                <span className="text-base font-normal text-neutral-500 dark:text-gray-400">
                  ({group.penalCodes.length})
                </span>
              </button>

              {isCollapsed ? null : (
                <ul className="flex flex-col mt-3 gap-y-2">
                  {group.penalCodes.map((penalCode) => (
                    <PenalCodeItem key={penalCode.id} penalCode={penalCode} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function PenalCodeItem({ penalCode }: { penalCode: PenalCode }) {
  const t = useTranslations("LawBook");
  const common = useTranslations("Common");

  const description = dataToSlate(penalCode);
  const maxFine = getPenalCodeMaxFines(penalCode);
  const minFine = getPenalCodeMinFines(penalCode);
  const [minJailTime, maxJailTime] = penalCode.warningNotApplicable?.prisonTerm ?? [];
  const [minBail, maxBail] = penalCode.warningNotApplicable?.bail ?? [];

  return (
    <li className="card p-4">
      <header>
        <h3 className="text-2xl font-semibold">{penalCode.title}</h3>

        <div className="mt-2">
          <Infofield label={common("type")}>
            {penalCode.type?.toLowerCase() ?? common("none")}
          </Infofield>
          <Infofield label={t("isPrimary")}>{common(yesOrNoText(penalCode.isPrimary))}</Infofield>
          <Infofield label={t("warningApplicable")}>
            {String(Boolean(penalCode.warningApplicable))}
          </Infofield>
          <Infofield label={t("fines")}>
            {minFine}-{maxFine}
          </Infofield>
          {typeof minJailTime !== "undefined" ? (
            <Infofield label={t("jailTime")}>
              {minJailTime}-{maxJailTime}
            </Infofield>
          ) : null}
          {typeof minBail !== "undefined" ? (
            <Infofield label={t("bail")}>
              {minBail}-{maxBail}
            </Infofield>
          ) : null}
        </div>
      </header>

      <Editor hideBorder isReadonly value={description} />
    </li>
  );
}
