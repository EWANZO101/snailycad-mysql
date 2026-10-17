import * as React from "react";
import type { GetServerSideProps } from "next";
import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import { Permissions } from "@snailycad/permissions";
import { Alert, Button, Loader, SelectField, TextField } from "@snailycad/ui";
import { Layout } from "components/Layout";
import { Title } from "components/shared/Title";
import {
  StatusBadge,
  type ErlcStatus,
} from "components/admin/manage/cad-settings/misc-features/erlc-tab";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { usePermission } from "hooks/usePermission";
import useFetch from "lib/useFetch";

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

interface ErlcVehicle {
  name: string | null;
  owner: string | null;
  plate: string | null;
  texture: string | null;
  colorHex: string | null;
  colorName: string | null;
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
  server: {
    name: string;
    joinKey: string | null;
    currentPlayers: number;
    maxPlayers: number | null;
    queue: number;
  } | null;
  players: ErlcPlayer[];
  vehicles: ErlcVehicle[];
  emergencyCalls: ErlcCall[];
}

type CommandResult =
  | { ok: true; message: string | null }
  | { ok: false; reason: string; retryInSeconds?: number; message?: string | null };

function matches(query: string, ...values: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  return !q || values.some((value) => value?.toLowerCase().includes(q));
}

/** the ER:LC private server as the CAD last saw it: players, vehicles and 911 calls */
export default function ErlcPage() {
  const t = useTranslations("Erlc");
  const { ERLC } = useFeatureEnabled();
  const { hasPermissions } = usePermission();
  const isAdmin = hasPermissions([Permissions.ManageCADSettings]);
  const { execute, state } = useFetch();

  const [playerQuery, setPlayerQuery] = React.useState("");
  const [vehicleQuery, setVehicleQuery] = React.useState("");
  const [commandType, setCommandType] = React.useState<"hint" | "message" | "command">("hint");
  const [commandText, setCommandText] = React.useState("");
  const [commandResult, setCommandResult] = React.useState<CommandResult | null>(null);

  const server = useQuery({
    queryKey: ["erlc", "server"],
    enabled: ERLC,
    queryFn: async () => {
      const { json } = await execute<ErlcData>({ path: "/erlc", noToast: true });
      // a failed request resolves to an empty object
      return "status" in json ? json : null;
    },
    refetchInterval: 10_000,
  });
  const data = server.data;

  async function handleSend() {
    if (!commandText.trim()) return;
    setCommandResult(null);
    const { json } = await execute<CommandResult>({
      path: "/erlc/command",
      method: "POST",
      data: { type: commandType, text: commandText },
      noToast: true,
    });
    if (typeof json === "object" && "ok" in json) {
      setCommandResult(json);
      if (json.ok) setCommandText("");
    }
  }

  const commandOptions = [
    { value: "hint", label: t("command_hint") },
    { value: "message", label: t("command_message") },
    ...(isAdmin ? [{ value: "command", label: t("command_command") }] : []),
  ];

  const players = (data?.players ?? []).filter((player) =>
    matches(playerQuery, player.name, player.callsign, player.team, player.location?.street),
  );
  const vehicles = (data?.vehicles ?? []).filter((vehicle) =>
    matches(vehicleQuery, vehicle.plate, vehicle.name, vehicle.owner),
  );

  return (
    <Layout
      permissions={{ permissions: [Permissions.Dispatch, Permissions.ManageCADSettings] }}
      className="dark:text-white"
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title>{data?.server?.name ?? t("erlc")}</Title>
          <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("pageIntro")}</p>
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

          {data.server ? (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Stat
                label={t("players")}
                value={`${data.server.currentPlayers} / ${data.server.maxPlayers ?? "?"}`}
              />
              <Stat label={t("queue")} value={String(data.server.queue)} />
              <Stat label={t("joinCode")} value={data.server.joinKey ?? "—"} />
              <Stat
                label={t("lastUpdated")}
                value={
                  data.status.lastSuccessAt
                    ? new Date(data.status.lastSuccessAt).toLocaleTimeString()
                    : "—"
                }
              />
            </section>
          ) : null}

          <section className="card p-4 mb-6">
            <h2 className="font-semibold text-xl mb-3">{t("sendToServer")}</h2>
            <div className="grid gap-x-3 md:grid-cols-[12rem_1fr_auto] items-end">
              <SelectField
                label={t("type")}
                selectedKey={commandType}
                onSelectionChange={(key) => setCommandType(key as typeof commandType)}
                options={commandOptions}
              />
              <TextField
                label={t(`commandText_${commandType}`)}
                value={commandText}
                onChange={setCommandText}
                maxLength={200}
                placeholder={commandType === "command" ? ":pm username Hello" : ""}
              />
              <Button
                className="mb-3"
                onPress={handleSend}
                isDisabled={state === "loading" || !commandText.trim()}
              >
                {t("send")}
              </Button>
            </div>
            {commandResult ? (
              <p
                className={`text-sm ${
                  commandResult.ok
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {commandResult.ok
                  ? t("commandSent")
                  : t(`commandError_${commandResult.reason}`, {
                      seconds: commandResult.retryInSeconds ?? 5,
                      message: commandResult.message ?? "",
                    })}
              </p>
            ) : null}
          </section>

          <section className="card p-4 mb-6">
            <h2 className="font-semibold text-xl mb-3">{t("emergencyCalls")}</h2>
            {data.emergencyCalls.length <= 0 ? (
              <p className="text-neutral-600 dark:text-gray-400">{t("noEmergencyCalls")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">{t("team")}</th>
                      <th className="py-2 pr-3">{t("caller")}</th>
                      <th className="py-2 pr-3">{t("description")}</th>
                      <th className="py-2 pr-3">{t("location")}</th>
                      <th className="py-2 pr-3">{t("started")}</th>
                      <th className="py-2 pr-3">{t("cadCall")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.emergencyCalls.map((call) => (
                      <tr
                        key={`${call.callNumber}-${call.startedAt}`}
                        className="border-t border-gray-200 dark:border-quaternary"
                      >
                        <td className="py-2 pr-3">{call.callNumber}</td>
                        <td className="py-2 pr-3">{call.team ?? "—"}</td>
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
                {t("players")} ({data.players.length})
              </h2>
              <TextField
                label={t("search")}
                value={playerQuery}
                onChange={setPlayerQuery}
                placeholder={t("searchPlayers")}
                className="w-full md:w-72"
              />
            </div>
            {players.length <= 0 ? (
              <p className="text-neutral-600 dark:text-gray-400">{t("noPlayers")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">{t("player")}</th>
                      <th className="py-2 pr-3">{t("team")}</th>
                      <th className="py-2 pr-3">{t("callsign")}</th>
                      <th className="py-2 pr-3">{t("location")}</th>
                      <th className="py-2 pr-3">{t("postal")}</th>
                      <th className="py-2 pr-3">{t("wanted")}</th>
                      <th className="py-2 pr-3">{t("role")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr
                        key={player.robloxId ?? player.name}
                        className="border-t border-gray-200 dark:border-quaternary"
                      >
                        <td className="py-2 pr-3">
                          {player.robloxId ? (
                            <a
                              className="underline text-blue-600 dark:text-blue-400"
                              href={`https://www.roblox.com/users/${player.robloxId}/profile`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {player.name}
                            </a>
                          ) : (
                            player.name
                          )}
                        </td>
                        <td className="py-2 pr-3">{player.team ?? "—"}</td>
                        <td className="py-2 pr-3">{player.callsign || "—"}</td>
                        <td className="py-2 pr-3">
                          {[player.location?.buildingNumber, player.location?.street]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>
                        <td className="py-2 pr-3">{player.location?.postal || "—"}</td>
                        <td className="py-2 pr-3">
                          {player.wantedStars > 0
                            ? "★".repeat(Math.min(player.wantedStars, 10))
                            : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {player.permission && player.permission !== "Normal"
                            ? player.permission
                            : "—"}
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
                {t("vehicles")} ({data.vehicles.length})
              </h2>
              <TextField
                label={t("search")}
                value={vehicleQuery}
                onChange={setVehicleQuery}
                placeholder={t("searchVehicles")}
                className="w-full md:w-72"
              />
            </div>
            {vehicles.length <= 0 ? (
              <p className="text-neutral-600 dark:text-gray-400">{t("noVehicles")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-3">{t("plate")}</th>
                      <th className="py-2 pr-3">{t("model")}</th>
                      <th className="py-2 pr-3">{t("owner")}</th>
                      <th className="py-2 pr-3">{t("color")}</th>
                      <th className="py-2 pr-3">{t("livery")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle, index) => (
                      <tr
                        key={`${vehicle.plate}-${vehicle.owner}-${index}`}
                        className="border-t border-gray-200 dark:border-quaternary"
                      >
                        <td className="py-2 pr-3 font-mono">{vehicle.plate || "—"}</td>
                        <td className="py-2 pr-3">{vehicle.name ?? "—"}</td>
                        <td className="py-2 pr-3">{vehicle.owner ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-1.5">
                            {vehicle.colorHex && /^#[0-9a-f]{3,8}$/i.test(vehicle.colorHex) ? (
                              <span
                                aria-hidden
                                className="inline-block w-3 h-3 rounded-full border border-gray-300 dark:border-quaternary"
                                style={{ backgroundColor: vehicle.colorHex }}
                              />
                            ) : null}
                            {vehicle.colorName ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{vehicle.texture ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-sm text-neutral-500 dark:text-gray-400">{props.label}</p>
      <p className="text-lg font-semibold break-all">{props.value}</p>
    </div>
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
