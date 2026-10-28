import * as React from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import { Permissions } from "@snailycad/permissions";
import { Alert, Loader, TextField } from "@snailycad/ui";
import { Layout } from "components/Layout";
import { Title } from "components/shared/Title";
import {
  StatusBadge,
  type ErlcStatus,
} from "components/admin/manage/cad-settings/misc-features/erlc-tab";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import useFetch from "lib/useFetch";

const DOT_TEAM = "dot";

interface ErlcPlayer {
  name: string;
  robloxId: string | null;
  team: string | null;
  callsign: string | null;
  permission: string | null;
  wantedStars: number;
  location: {
    street: string | null;
    buildingNumber: string | null;
    postal: string | null;
  } | null;
}

interface ErlcCall {
  callNumber: number;
  team: string | null;
  caller: string | null;
  description: string | null;
  location: string | null;
  startedAt: number;
  responders: number;
  cadCall: { id: string; caseNumber: number | null; ended: boolean; tow?: boolean } | null;
}

interface ErlcData {
  status: ErlcStatus;
  server: { name: string } | null;
  players: ErlcPlayer[];
  emergencyCalls: ErlcCall[];
}

function isDotTeam(team: string | null) {
  return team?.trim().toLowerCase() === DOT_TEAM;
}

function matches(query: string, ...values: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  return !q || values.some((value) => value?.toLowerCase().includes(q));
}

/** Dispatch > ER:LC, filtered down to the DOT team: its units and its 911 calls */
export default function DotPage() {
  const t = useTranslations("Erlc");
  const { ERLC } = useFeatureEnabled();
  const { execute } = useFetch();

  const [unitQuery, setUnitQuery] = React.useState("");

  const server = useQuery({
    queryKey: ["erlc", "server"],
    enabled: ERLC,
    queryFn: async () => {
      const { json } = await execute<ErlcData>({ path: "/erlc", noToast: true });
      return "status" in json ? json : null;
    },
    refetchInterval: 10_000,
  });
  const data = server.data;

  const units = (data?.players ?? [])
    .filter((player) => isDotTeam(player.team))
    .filter((player) => matches(unitQuery, player.name, player.callsign, player.location?.street));
  const calls = (data?.emergencyCalls ?? []).filter((call) => isDotTeam(call.team));

  return (
    <Layout
      permissions={{ permissions: [Permissions.Dispatch, Permissions.ManageCADSettings] }}
      className="dark:text-white"
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title>{t("dot")}</Title>
          <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("dotPageIntro")}</p>
        </div>
        {data ? (
          <StatusBadge state={data.status.state} label={t(`state_${data.status.state}`)} />
        ) : null}
      </header>

      {!ERLC ? (
        <Alert type="warning" title={t("featureOffTitle")}>
          <p>{t("featureOffMessage")}</p>
        </Alert>
      ) : server.isPending ? (
        <Loader />
      ) : !data ? null : (
        <>
          {data.status.state !== "online" ? (
            <Alert className="mb-5" type="warning" title={t(`state_${data.status.state}`)}>
              <p>{t(`state_${data.status.state}Details`)}</p>
            </Alert>
          ) : null}

          <section className="card p-4 mb-6">
            <h2 className="font-semibold text-xl mb-3">{t("dotCalls")}</h2>
            {calls.length <= 0 ? (
              <p className="text-neutral-600 dark:text-gray-400">{t("noDotCalls")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">{t("caller")}</th>
                      <th className="py-2 pr-3">{t("description")}</th>
                      <th className="py-2 pr-3">{t("location")}</th>
                      <th className="py-2 pr-3">{t("started")}</th>
                      <th className="py-2 pr-3">{t("cadCall")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <tr
                        key={`${call.callNumber}-${call.startedAt}`}
                        className="border-t border-gray-200 dark:border-quaternary"
                      >
                        <td className="py-2 pr-3">{call.callNumber}</td>
                        <td className="py-2 pr-3">{call.caller ?? "—"}</td>
                        <td className="py-2 pr-3">{call.description || "—"}</td>
                        <td className="py-2 pr-3">{call.location || "—"}</td>
                        <td className="py-2 pr-3">
                          {new Date(call.startedAt * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-3">
                          {call.cadCall?.tow ? (
                            t("towCall")
                          ) : call.cadCall ? (
                            <span>
                              #{call.cadCall.caseNumber}
                              {call.cadCall.ended ? ` (${t("ended")})` : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card p-4 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
              <h2 className="font-semibold text-xl">
                {t("dotUnits")} ({units.length})
              </h2>
              <TextField
                label={t("search")}
                value={unitQuery}
                onChange={setUnitQuery}
                placeholder={t("searchPlayers")}
                className="w-full md:w-72"
              />
            </div>
            {units.length <= 0 ? (
              <p className="text-neutral-600 dark:text-gray-400">{t("noDotUnits")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">{t("player")}</th>
                      <th className="py-2 pr-3">{t("callsign")}</th>
                      <th className="py-2 pr-3">{t("location")}</th>
                      <th className="py-2 pr-3">{t("postal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => (
                      <tr
                        key={unit.robloxId ?? unit.name}
                        className="border-t border-gray-200 dark:border-quaternary"
                      >
                        <td className="py-2 pr-3">
                          {unit.robloxId ? (
                            <a
                              className="underline text-blue-600 dark:text-blue-400"
                              href={`https://www.roblox.com/users/${unit.robloxId}/profile`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {unit.name}
                            </a>
                          ) : (
                            unit.name
                          )}
                        </td>
                        <td className="py-2 pr-3">{unit.callsign || "—"}</td>
                        <td className="py-2 pr-3">
                          {[unit.location?.buildingNumber, unit.location?.street]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>
                        <td className="py-2 pr-3">{unit.location?.postal || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-sm text-neutral-600 dark:text-gray-400">
            <Link className="underline" href="/dispatch/erlc">
              {t("openFullErlcPage")}
            </Link>
          </p>
        </>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const user = await getSessionUser(req);

  return {
    props: {
      session: user,
      messages: {
        ...(await getTranslations(["erlc", "leo"], user?.locale ?? locale)),
      },
    },
  };
};
