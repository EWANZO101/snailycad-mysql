import { useTranslations } from "use-intl";
import { Layout } from "components/Layout";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import type { GetServerSideProps } from "next";
import { makeUnitName, requestAll } from "lib/utils";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { Title } from "components/shared/Title";
import { OfficerLogsTable } from "components/leo/logs/OfficerLogsTable";
import { Permissions } from "@snailycad/permissions";
import type { DotWorker, OfficerLog } from "@snailycad/types";
import type { GetMyDotWorkersLogsData } from "@snailycad/types/api";
import { useAsyncTable } from "components/shared/Table";
import { useGetUserDotWorkers } from "hooks/dot/use-get-user-dot-workers";
import { SelectField } from "@snailycad/ui";

export interface OfficerLogWithDotWorker extends Omit<OfficerLog, "dotWorker" | "officer"> {
  dotWorker: DotWorker;
}

interface Props {
  logs: GetMyDotWorkersLogsData;
}

export default function MyDotWorkerLogs({ logs: data }: Props) {
  const { userWorkers, isLoading } = useGetUserDotWorkers();

  const asyncTable = useAsyncTable({
    fetchOptions: {
      pageSize: 25,
      onResponse: (json: GetMyDotWorkersLogsData) => ({
        data: json.logs,
        totalCount: json.totalCount,
      }),
      path: "/dot/logs?currentUserOnly",
    },
    totalCount: data.totalCount,
    initialData: data.logs,
  });

  const t = useTranslations();
  const { generateCallsign } = useGenerateCallsign();

  const workerNames = userWorkers.reduce(
    (ac, cv) => ({
      ...ac,
      [cv.id]: `${generateCallsign(cv)} ${makeUnitName(cv)}`,
    }),
    {} as Record<string, string>,
  );

  return (
    <Layout permissions={{ permissions: [Permissions.Dot] }} className="dark:text-white">
      <header className="flex items-center justify-between">
        <Title className="!mb-0">{t("Dot.myWorkerLogs")}</Title>

        <div className="ml-3 w-64">
          <SelectField
            isDisabled={isLoading}
            isLoading={isLoading}
            onSelectionChange={(value) => {
              asyncTable.setFilters((prev) => ({
                ...prev,
                dotWorkerId: value,
              }));
            }}
            selectedKey={asyncTable.filters?.dotWorkerId ?? null}
            isClearable
            label={t("Dot.groupByWorker")}
            options={Object.entries(workerNames).map(([id, name]) => ({
              label: name,
              value: id,
            }))}
          />
        </div>
      </header>

      {data.totalCount <= 0 ? (
        <p className="my-2">{t("Dot.noWorkers")}</p>
      ) : (
        <OfficerLogsTable unit={null} asyncTable={asyncTable} />
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  const user = await getSessionUser(req);
  const [logs] = await requestAll(req, [["/dot/logs", { logs: [], totalCount: 0 }]]);

  return {
    props: {
      session: user,
      logs,
      messages: {
        ...(await getTranslations(["dot", "leo", "common"], user?.locale ?? locale)),
      },
    },
  };
};
