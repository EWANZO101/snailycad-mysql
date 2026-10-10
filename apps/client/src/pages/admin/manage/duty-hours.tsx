import * as React from "react";
import type { GetServerSideProps } from "next";
import { useTranslations } from "use-intl";
import { Button, FullDate, Loader, SelectField, TextField } from "@snailycad/ui";
import { AdminLayout } from "components/admin/AdminLayout";
import { Title } from "components/shared/Title";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import useFetch from "lib/useFetch";
import { makeUnitName } from "lib/utils";
import { usePermission, Permissions } from "hooks/usePermission";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import {
  type DutyHoursReport,
  type PeriodPreset,
  downloadBlob,
  formatDuration,
  formatHours,
  getPeriod,
  startOfWeek,
  toCsv,
  toDateInput,
} from "components/admin/manage/duty-hours/utils";
import {
  DutySessionsModal,
  SessionFlags,
} from "components/admin/manage/duty-hours/duty-sessions-modal";

const VIEW_PERMISSIONS = [
  Permissions.ViewUnits,
  Permissions.ManageUnits,
  Permissions.DeleteUnits,
  Permissions.ManageUnitCallsigns,
  Permissions.ManageAwardsAndQualifications,
];

const DEFAULT_MAX_SESSION_HOURS = 12;
/** above this many weeks, the per-week columns are only included in the CSV */
const MAX_INLINE_WEEK_COLUMNS = 8;

const cardClassName =
  "rounded-md border border-gray-300 dark:border-quinary p-4 bg-white dark:bg-tertiary";
const thClassName = "p-2 font-semibold whitespace-nowrap";
const tdClassName = "p-2 whitespace-nowrap";

export default function DutyHoursPage() {
  const t = useTranslations("DutyHours");
  const common = useTranslations("Common");
  const { hasPermissions } = usePermission();
  const { generateCallsign } = useGenerateCallsign();
  const { state, execute } = useFetch();

  const canEdit = hasPermissions([Permissions.ManageUnits]);

  const [preset, setPreset] = React.useState<PeriodPreset>("thisWeek");
  const [custom, setCustom] = React.useState(() => {
    const monday = startOfWeek(new Date());
    return { start: toDateInput(monday), end: toDateInput(new Date()) };
  });
  const [maxSessionHours, setMaxSessionHours] = React.useState(String(DEFAULT_MAX_SESSION_HOURS));
  const [report, setReport] = React.useState<DutyHoursReport | null>(null);
  const [sessionsTarget, setSessionsTarget] = React.useState<{
    userId: string | null;
    unitId?: string | null;
    name: string;
  } | null>(null);

  const parsedMaxHours =
    Number(maxSessionHours) > 0 ? Number(maxSessionHours) : DEFAULT_MAX_SESSION_HOURS;

  // `period` is memoized on its primitive values so that effects don't loop
  const rawPeriod = getPeriod(preset, custom);
  const fromTime = rawPeriod?.from.getTime() ?? null;
  const toTime = rawPeriod?.to.getTime() ?? null;
  const period = React.useMemo(
    () =>
      fromTime !== null && toTime !== null
        ? { from: new Date(fromTime), to: new Date(toTime) }
        : null,
    [fromTime, toTime],
  );

  const fetchReport = React.useCallback(async () => {
    if (!period) return;

    const params = new URLSearchParams({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      weekStart: startOfWeek(period.from).toISOString(),
      maxSessionHours: String(parsedMaxHours),
    });

    const { json } = await execute<DutyHoursReport>({
      path: `/admin/manage/units/duty-hours/report?${params.toString()}`,
      method: "GET",
    });

    if (json && Array.isArray(json.users)) {
      setReport(json);
    }
  }, [period, parsedMaxHours]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  function getUnitLabel(unit: any) {
    if (!unit) return common("unknown");
    try {
      return `${generateCallsign(unit)} ${makeUnitName(unit)}`.trim();
    } catch {
      return makeUnitName(unit);
    }
  }

  function getUserName(user: DutyHoursReport["users"][number]) {
    if (user.username) return user.username;
    const firstUnit = user.units[0];
    return firstUnit ? `${getUnitLabel(firstUnit.unit)} (${t("noUser")})` : t("noUser");
  }

  function formatWeek(weekStart: string) {
    return new Date(weekStart).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function handleDownloadCsv() {
    if (!report) return;

    const weekHeaders = report.weeks.map((week) =>
      t("weekOf", { date: toDateInput(new Date(week.weekStart)) }),
    );
    const rows: unknown[][] = [
      [
        t("user"),
        t("units"),
        t("leoHours"),
        t("emsFdHours"),
        t("totalHours"),
        t("sessions"),
        t("openSessions"),
        t("flaggedSessions"),
        ...weekHeaders,
      ],
    ];

    for (const user of report.users) {
      rows.push([
        getUserName(user),
        user.units.map((unit) => `${getUnitLabel(unit.unit)} [${t(unit.type)}]`).join("; "),
        formatHours(user.leoSeconds),
        formatHours(user.emsFdSeconds),
        formatHours(user.totalSeconds),
        user.sessionCount,
        user.openSessions,
        user.flaggedSessions,
        ...user.weeks.map((seconds) => formatHours(seconds)),
      ]);
    }

    rows.push([
      t("total"),
      "",
      formatHours(report.totals.leoSeconds),
      formatHours(report.totals.emsFdSeconds),
      formatHours(report.totals.totalSeconds),
      report.totals.sessionCount,
      report.totals.openSessions,
      report.totals.flaggedSessions,
      ...report.weeks.map((week) => formatHours(week.totalSeconds)),
    ]);

    const from = toDateInput(new Date(report.from));
    const toInclusive = toDateInput(new Date(new Date(report.to).getTime() - 1));
    downloadBlob(toCsv(rows), `duty-hours_${from}_${toInclusive}.csv`);
  }

  const showWeekColumns =
    !!report && report.weeks.length > 1 && report.weeks.length <= MAX_INLINE_WEEK_COLUMNS;

  return (
    <AdminLayout permissions={{ permissions: VIEW_PERMISSIONS }}>
      <header className="mb-5">
        <Title className="!mb-0">{t("title")}</Title>
        <p className="max-w-2xl mt-2 text-neutral-700 dark:text-gray-400">{t("description")}</p>
      </header>

      <section className="flex flex-wrap items-end gap-3 mb-5">
        <SelectField
          className="w-full max-w-[12rem]"
          label={t("period")}
          selectedKey={preset}
          onSelectionChange={(value) => setPreset((value as PeriodPreset | null) ?? "thisWeek")}
          options={[
            { value: "thisWeek", label: t("thisWeek") },
            { value: "lastWeek", label: t("lastWeek") },
            { value: "thisMonth", label: t("thisMonth") },
            { value: "custom", label: t("custom") },
          ]}
        />

        {preset === "custom" ? (
          <>
            <TextField
              type="date"
              className="w-full max-w-[12rem]"
              label={t("startDate")}
              value={custom.start}
              onChange={(value) => setCustom((prev) => ({ ...prev, start: value }))}
            />
            <TextField
              type="date"
              className="w-full max-w-[12rem]"
              label={t("endDate")}
              value={custom.end}
              onChange={(value) => setCustom((prev) => ({ ...prev, end: value }))}
            />
          </>
        ) : null}

        <TextField
          type="number"
          className="w-full max-w-[16rem]"
          label={t("maxSessionHours")}
          value={maxSessionHours}
          onChange={setMaxSessionHours}
        />

        <div className="flex gap-2 mb-3">
          <Button
            className="flex items-center gap-2"
            onPress={() => void fetchReport()}
            isDisabled={state === "loading" || !period}
          >
            {state === "loading" ? <Loader /> : null}
            {t("refresh")}
          </Button>
          <Button
            variant="blue"
            onPress={handleDownloadCsv}
            isDisabled={!report || report.users.length <= 0}
          >
            {t("downloadCsv")}
          </Button>
        </div>
      </section>

      {report ? (
        <p className="mb-4 text-sm text-neutral-700 dark:text-gray-400">
          <FullDate onlyDate>{report.from}</FullDate> –{" "}
          <FullDate onlyDate>{new Date(new Date(report.to).getTime() - 1).toISOString()}</FullDate>
        </p>
      ) : null}

      {!report ? (
        state === "loading" ? (
          <Loader />
        ) : null
      ) : (
        <div className="flex flex-col gap-6">
          {/* totals per unit type */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label={t("totalHours")} value={formatHours(report.totals.totalSeconds)} />
            <StatCard label={t("leoHours")} value={formatHours(report.totals.leoSeconds)} />
            <StatCard label={t("emsFdHours")} value={formatHours(report.totals.emsFdSeconds)} />
            <StatCard label={t("users")} value={String(report.totals.userCount)} />
            <StatCard
              label={t("flaggedSessions")}
              value={`${report.totals.flaggedSessions} / ${report.totals.openSessions} ${t("openSessions").toLowerCase()}`}
            />
          </section>

          {/* hours per user */}
          <section className={cardClassName}>
            <h2 className="text-xl font-semibold mb-3">{t("byUser")}</h2>
            {report.users.length <= 0 ? (
              <p className="text-neutral-700 dark:text-gray-400">{t("noData")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-quinary">
                      <th className={thClassName}>{t("user")}</th>
                      <th className={thClassName}>{t("units")}</th>
                      <th className={thClassName}>{t("leoHours")}</th>
                      <th className={thClassName}>{t("emsFdHours")}</th>
                      <th className={thClassName}>{t("totalHours")}</th>
                      {showWeekColumns
                        ? report.weeks.map((week) => (
                            <th key={week.weekStart} className={thClassName}>
                              {formatWeek(week.weekStart)}
                            </th>
                          ))
                        : null}
                      <th className={thClassName}>{t("sessions")}</th>
                      <th className={thClassName}>{t("flags")}</th>
                      <th className={thClassName} />
                    </tr>
                  </thead>
                  <tbody>
                    {report.users.map((user) => {
                      const name = getUserName(user);
                      const key = user.userId ?? user.units[0]?.unitId ?? name;

                      return (
                        <tr
                          key={key}
                          className="border-b border-gray-200 dark:border-quinary align-top"
                        >
                          <td className={tdClassName}>{name}</td>
                          <td className="p-2">
                            <ul>
                              {user.units.map((unit) => (
                                <li key={unit.unitId}>
                                  {getUnitLabel(unit.unit)}{" "}
                                  <span className="text-neutral-600 dark:text-gray-400">
                                    ({t(unit.type)}, {formatHours(unit.totalSeconds)}h)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className={tdClassName}>{formatHours(user.leoSeconds)}</td>
                          <td className={tdClassName}>{formatHours(user.emsFdSeconds)}</td>
                          <td className={`${tdClassName} font-semibold`}>
                            {formatHours(user.totalSeconds)}
                          </td>
                          {showWeekColumns
                            ? user.weeks.map((seconds, idx) => (
                                <td
                                  key={report.weeks[idx]?.weekStart ?? idx}
                                  className={tdClassName}
                                >
                                  {formatHours(seconds)}
                                </td>
                              ))
                            : null}
                          <td className={tdClassName}>{user.sessionCount}</td>
                          <td className="p-2">
                            <span className="flex flex-wrap gap-1">
                              {user.openSessions > 0 ? (
                                <span className="rounded-md px-1.5 py-0.5 text-xs bg-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                                  {t("stillOnDuty")}
                                </span>
                              ) : null}
                              {user.flaggedSessions > 0 ? (
                                <span className="rounded-md px-1.5 py-0.5 text-xs bg-orange-500/30 text-orange-900 dark:text-orange-200">
                                  {t("likelyMissedClockOut")} ({user.flaggedSessions})
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              size="xs"
                              onPress={() =>
                                setSessionsTarget({
                                  userId: user.userId,
                                  unitId: user.userId ? null : (user.units[0]?.unitId ?? null),
                                  name,
                                })
                              }
                            >
                              {t("viewSessions")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* weekly summary */}
          <section className={cardClassName}>
            <h2 className="text-xl font-semibold mb-3">{t("weeklySummary")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-quinary">
                    <th className={thClassName}>{t("week")}</th>
                    <th className={thClassName}>{t("leoHours")}</th>
                    <th className={thClassName}>{t("emsFdHours")}</th>
                    <th className={thClassName}>{t("totalHours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.weeks.map((week) => (
                    <tr
                      key={week.weekStart}
                      className="border-b border-gray-200 dark:border-quinary"
                    >
                      <td className={tdClassName}>
                        {t("weekOf", { date: formatWeek(week.weekStart) })}
                      </td>
                      <td className={tdClassName}>{formatHours(week.leoSeconds)}</td>
                      <td className={tdClassName}>{formatHours(week.emsFdSeconds)}</td>
                      <td className={`${tdClassName} font-semibold`}>
                        {formatHours(week.totalSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* per department / unit type */}
          <section className={cardClassName}>
            <h2 className="text-xl font-semibold mb-3">{t("byDepartment")}</h2>
            {report.departments.length <= 0 ? (
              <p className="text-neutral-700 dark:text-gray-400">{t("noData")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-quinary">
                      <th className={thClassName}>{t("department")}</th>
                      <th className={thClassName}>{t("unitType")}</th>
                      <th className={thClassName}>{t("units")}</th>
                      <th className={thClassName}>{t("sessions")}</th>
                      <th className={thClassName}>{t("totalHours")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.departments.map((department) => (
                      <tr
                        key={`${department.type}-${department.departmentId}`}
                        className="border-b border-gray-200 dark:border-quinary"
                      >
                        <td className={tdClassName}>{department.name ?? t("noDepartment")}</td>
                        <td className={tdClassName}>{t(department.type)}</td>
                        <td className={tdClassName}>{department.unitCount}</td>
                        <td className={tdClassName}>{department.sessionCount}</td>
                        <td className={`${tdClassName} font-semibold`}>
                          {formatHours(department.totalSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* open & likely missed clock-out sessions */}
          <section className={cardClassName}>
            <h2 className="text-xl font-semibold mb-1">{t("flaggedSessions")}</h2>
            <p className="mb-3 text-sm text-neutral-700 dark:text-gray-400">
              {t("flaggedDescription", { hours: report.maxSessionHours })}
            </p>
            {report.flaggedSessions.length <= 0 ? (
              <p className="text-neutral-700 dark:text-gray-400">{t("noFlaggedSessions")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-quinary">
                      <th className={thClassName}>{t("user")}</th>
                      <th className={thClassName}>{t("unit")}</th>
                      <th className={thClassName}>{t("startedAt")}</th>
                      <th className={thClassName}>{t("endedAt")}</th>
                      <th className={thClassName}>{t("duration")}</th>
                      <th className={thClassName}>{t("flags")}</th>
                      <th className={thClassName} />
                    </tr>
                  </thead>
                  <tbody>
                    {report.flaggedSessions.map((session) => {
                      const name = session.username ?? getUnitLabel(session.unit);

                      return (
                        <tr
                          key={session.id}
                          className="border-b border-gray-200 dark:border-quinary"
                        >
                          <td className={tdClassName}>{session.username ?? t("noUser")}</td>
                          <td className={tdClassName}>{getUnitLabel(session.unit)}</td>
                          <td className={tdClassName}>
                            <FullDate>{session.startedAt}</FullDate>
                          </td>
                          <td className={tdClassName}>
                            {session.endedAt ? <FullDate>{session.endedAt}</FullDate> : "—"}
                          </td>
                          <td className={tdClassName}>{formatDuration(session.durationSeconds)}</td>
                          <td className="p-2">
                            <SessionFlags session={session} />
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              size="xs"
                              onPress={() =>
                                setSessionsTarget({
                                  userId: session.userId ?? null,
                                  unitId: session.unitId,
                                  name,
                                })
                              }
                            >
                              {canEdit ? t("editSession") : t("viewSessions")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {period ? (
        <DutySessionsModal
          target={sessionsTarget}
          period={period}
          maxSessionHours={parsedMaxHours}
          canEdit={canEdit}
          getUnitLabel={getUnitLabel}
          onClose={() => setSessionsTarget(null)}
          onUpdated={() => void fetchReport()}
        />
      ) : null}
    </AdminLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClassName}>
      <p className="text-sm text-neutral-700 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const user = await getSessionUser(req);

  return {
    props: {
      session: user,
      messages: {
        ...(await getTranslations(["admin", "leo", "ems-fd", "common"], user?.locale ?? locale)),
      },
    },
  };
};
