import * as React from "react";
import { CitizenListItem } from "components/citizen/citizen-list/citizen-list-item";
import { TablePagination } from "components/shared/table/table-pagination";
import { useTranslations } from "next-intl";
import type { GetCitizensData } from "@snailycad/types/api";
import { SearchArea } from "components/shared/search/search-area";
import { MAX_CITIZENS_PER_PAGE, useCitizensList } from "hooks/citizen/use-citizens-list";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";

interface Props {
  citizens: GetCitizensData;
}

export function CitizenList({ citizens: data }: Props) {
  const t = useTranslations("Citizen");
  const { MODERN_CITIZEN_THEME } = useFeatureEnabled();

  const [search, setSearch] = React.useState("");
  const citizensList = useCitizensList({
    initialData: data,
    search,
  });

  if (data.citizens.length <= 0) {
    if (!MODERN_CITIZEN_THEME) {
      return <p className="font-medium text-gray-600 dark:text-gray-300">{t("userNoCitizens")}</p>;
    }

    return (
      <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center font-medium text-gray-600 dark:border-quinary dark:text-gray-300">
        {t("userNoCitizens")}
      </p>
    );
  }

  return (
    <section className={MODERN_CITIZEN_THEME ? "mt-2" : "mt-5"}>
      <SearchArea
        search={{ search, setSearch }}
        asyncTable={citizensList}
        totalCount={data.totalCount}
      />

      <ul
        className={
          data.citizens.length <= 0
            ? "flex flex-col space-y-3"
            : MODERN_CITIZEN_THEME
              ? "mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              : "grid grid-cols-1 sm:grid-cols-2 gap-3"
        }
      >
        {citizensList.items.map((citizen) => (
          <CitizenListItem key={citizen.id} citizen={citizen} />
        ))}
      </ul>

      {data.totalCount > MAX_CITIZENS_PER_PAGE ? (
        <TablePagination
          isLoading={citizensList.pagination.isLoading}
          table={citizensList as any}
        />
      ) : null}
    </section>
  );
}
