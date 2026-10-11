import { Prisma } from "@prisma/client";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { Controller } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { UseBeforeEach } from "@tsed/platform-middlewares";
import { ContentType, Description, Get, Put } from "@tsed/schema";
import { AuditLogActionType, createAuditLogEntry } from "@snailycad/audit-logger/server";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";
import { _leoProperties, unitProperties } from "utils/leo/includes";

/**
 * Duty clocking reports (roadmap 11.1).
 *
 * Builds on the existing `OfficerLog` model (one row per on-duty session for an officer or
 * EMS/FD deputy, created/ended by `handleStartEndOfficerLog`). Hours are aggregated in SQL:
 * sessions are clipped to the requested period and split into weekly buckets, and open sessions
 * (`endedAt IS NULL`) are counted up to "now".
 *
 * NOTE: routes live under `/admin/manage/units/duty-hours/*` with at least two path segments so
 * they never collide with `GET /admin/manage/units/:id` in the manage-units controller.
 */

const VIEW_DUTY_HOURS_PERMISSIONS = [
  Permissions.ViewUnits,
  Permissions.DeleteUnits,
  Permissions.ManageUnits,
  Permissions.ManageUnitCallsigns,
  Permissions.ManageAwardsAndQualifications,
];

const DEFAULT_MAX_SESSION_HOURS = 12;
const MAX_PERIOD_DAYS = 400;
const MAX_FLAGGED_SESSIONS = 500;
const MAX_SESSIONS = 500;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// referenced by string so that the API keeps working even if `@snailycad/audit-logger`'s dist
// has not been rebuilt yet after adding this action type.
const DUTY_SESSION_UPDATE_TYPE =
  "UnitDutySessionUpdate" as AuditLogActionType.UnitDutySessionUpdate;

type DutyUnitType = "LEO" | "EMS_FD";

interface UnitWeekRow {
  officerId: string | null;
  emsFdDeputyId: string | null;
  weekStart: Date;
  seconds: number;
}

interface UnitStatsRow {
  officerId: string | null;
  emsFdDeputyId: string | null;
  logUserId: string | null;
  sessionCount: number;
  openCount: number;
  flaggedCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampMaxHours(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_SESSION_HOURS;
  }
  return Math.min(Math.max(value, 1), 24 * 7);
}

function utcTimestamp(date: Date) {
  // `OfficerLog` timestamps are `DATETIME(3)` holding UTC values.
  const utc = date.toISOString().replace("T", " ").replace("Z", "");
  return Prisma.sql`CAST(${utc} AS DATETIME(3))`;
}

function getUnitKey(row: { officerId: string | null; emsFdDeputyId: string | null }) {
  if (row.officerId) return { id: row.officerId, type: "LEO" as DutyUnitType };
  if (row.emsFdDeputyId) return { id: row.emsFdDeputyId, type: "EMS_FD" as DutyUnitType };
  return null;
}

function mapSession(
  log: { id: string; startedAt: Date; endedAt: Date | null },
  now: Date,
  maxSessionHours: number,
) {
  const end = log.endedAt ?? now;
  const durationSeconds = Math.max(0, (end.getTime() - log.startedAt.getTime()) / 1000);
  return {
    isOnDuty: log.endedAt === null,
    durationSeconds,
    isLikelyMissedClockOut: durationSeconds > maxSessionHours * 3600,
  };
}

@UseBeforeEach(IsAuth)
@Controller("/admin/manage/units/duty-hours")
@ContentType("application/json")
export class AdminDutyHoursController {
  @Get("/report")
  @Description(
    "Get a duty hours report (per user, per department, per unit type and per week) for a period.",
  )
  @UsePermissions({ permissions: VIEW_DUTY_HOURS_PERMISSIONS })
  async getDutyHoursReport(
    @QueryParams("from", String) rawFrom?: string,
    @QueryParams("to", String) rawTo?: string,
    @QueryParams("weekStart", String) rawWeekStart?: string,
    @QueryParams("maxSessionHours", Number) rawMaxSessionHours?: number,
  ) {
    const now = new Date();
    const maxSessionHours = clampMaxHours(rawMaxSessionHours);

    const from = parseDate(rawFrom) ?? startOfWeek(now);
    const to = parseDate(rawTo) ?? now;

    if (to.getTime() <= from.getTime()) {
      throw new ExtendedBadRequest({ to: "End date must be after the start date." });
    }

    if (to.getTime() - from.getTime() > MAX_PERIOD_DAYS * 24 * 60 * 60 * 1000) {
      throw new ExtendedBadRequest({
        to: `The period cannot be longer than ${MAX_PERIOD_DAYS} days.`,
      });
    }

    // week buckets are anchored to `weekStart` (the client's local monday on/before `from`)
    let weekStart = parseDate(rawWeekStart);
    if (
      !weekStart ||
      weekStart.getTime() > from.getTime() ||
      from.getTime() - weekStart.getTime() >= WEEK_MS
    ) {
      weekStart = startOfWeek(from);
    }

    const pFrom = utcTimestamp(from);
    const pTo = utcTimestamp(to);
    const pNow = utcTimestamp(now);
    const pWeekStart = utcTimestamp(weekStart);
    const maxSeconds = maxSessionHours * 3600;

    const sessionsCte = Prisma.sql`
      sessions AS (
        SELECT
          l.\`id\`,
          l.\`officerId\`,
          l.\`emsFdDeputyId\`,
          l.\`userId\`,
          l.\`startedAt\`,
          l.\`endedAt\`,
          GREATEST(l.\`startedAt\`, ${pFrom}) AS clipStart,
          LEAST(COALESCE(l.\`endedAt\`, ${pNow}), ${pTo}) AS clipEnd
        FROM \`OfficerLog\` l
        WHERE l.\`startedAt\` < ${pTo}
          AND COALESCE(l.\`endedAt\`, ${pNow}) > ${pFrom}
          AND (l.\`officerId\` IS NOT NULL OR l.\`emsFdDeputyId\` IS NOT NULL)
      )
    `;
    const seconds = (start: Prisma.Sql, end: Prisma.Sql) =>
      Prisma.sql`(TIMESTAMPDIFF(MICROSECOND, ${start}, ${end}) / 1000000)`;

    const [rawWeekRows, rawStatsRows, flaggedRows] = await Promise.all([
      prisma.$queryRaw<UnitWeekRow[]>`
        WITH RECURSIVE ${sessionsCte},
        weeks AS (
          SELECT ${pWeekStart} AS weekStart, DATE_ADD(${pWeekStart}, INTERVAL 7 DAY) AS weekEnd
          UNION ALL
          SELECT weekEnd, DATE_ADD(weekEnd, INTERVAL 7 DAY) FROM weeks WHERE weekEnd < ${pTo}
        )
        SELECT
          s.\`officerId\` AS officerId,
          s.\`emsFdDeputyId\` AS emsFdDeputyId,
          w.weekStart AS weekStart,
          SUM(${seconds(Prisma.sql`GREATEST(s.clipStart, w.weekStart)`, Prisma.sql`LEAST(s.clipEnd, w.weekEnd)`)}) AS seconds
        FROM sessions s
        INNER JOIN weeks w ON s.clipStart < w.weekEnd AND s.clipEnd > w.weekStart
        WHERE w.weekStart < ${pTo}
        GROUP BY s.\`officerId\`, s.\`emsFdDeputyId\`, w.weekStart
      `,
      prisma.$queryRaw<UnitStatsRow[]>`
        WITH ${sessionsCte}
        SELECT
          s.\`officerId\` AS officerId,
          s.\`emsFdDeputyId\` AS emsFdDeputyId,
          MAX(s.\`userId\`) AS logUserId,
          COUNT(*) AS sessionCount,
          SUM(CASE WHEN s.\`endedAt\` IS NULL THEN 1 ELSE 0 END) AS openCount,
          SUM(CASE WHEN ${seconds(Prisma.sql`s.\`startedAt\``, Prisma.sql`COALESCE(s.\`endedAt\`, ${pNow})`)} > ${maxSeconds} THEN 1 ELSE 0 END) AS flaggedCount,
          MIN(s.\`startedAt\`) AS firstSeen,
          MAX(COALESCE(s.\`endedAt\`, ${pNow})) AS lastSeen
        FROM sessions s
        GROUP BY s.\`officerId\`, s.\`emsFdDeputyId\`
      `,
      prisma.$queryRaw<{ id: string }[]>`
        WITH ${sessionsCte}
        SELECT s.\`id\` AS id
        FROM sessions s
        WHERE s.\`endedAt\` IS NULL
          OR ${seconds(Prisma.sql`s.\`startedAt\``, Prisma.sql`s.\`endedAt\``)} > ${maxSeconds}
        ORDER BY s.\`startedAt\` DESC
        LIMIT ${MAX_FLAGGED_SESSIONS}
      `,
    ]);

    // MySQL returns COUNT() as BigInt and SUM() as Decimal
    const weekRows = rawWeekRows.map((row) => ({ ...row, seconds: Number(row.seconds) }));
    const statsRows = rawStatsRows.map((row) => ({
      ...row,
      sessionCount: Number(row.sessionCount),
      openCount: Number(row.openCount),
      flaggedCount: Number(row.flaggedCount),
    }));

    const officerIds = new Set<string>();
    const deputyIds = new Set<string>();
    for (const row of statsRows) {
      if (row.officerId) officerIds.add(row.officerId);
      else if (row.emsFdDeputyId) deputyIds.add(row.emsFdDeputyId);
    }

    const [officers, deputies, flaggedLogs] = await Promise.all([
      officerIds.size
        ? prisma.officer.findMany({
            where: { id: { in: [...officerIds] } },
            include: _leoProperties,
          })
        : [],
      deputyIds.size
        ? prisma.emsFdDeputy.findMany({
            where: { id: { in: [...deputyIds] } },
            include: unitProperties,
          })
        : [],
      flaggedRows.length
        ? prisma.officerLog.findMany({
            where: { id: { in: flaggedRows.map((v) => v.id) } },
            orderBy: { startedAt: "desc" },
          })
        : [],
    ]);

    const unitsById = new Map<string, any>();
    for (const unit of [...officers, ...deputies]) {
      unitsById.set(unit.id, unit);
    }

    const userIds = new Set<string>();
    for (const row of statsRows) {
      const key = getUnitKey(row);
      const unit = key ? unitsById.get(key.id) : null;
      const userId = unit?.userId ?? row.logUserId;
      if (userId) userIds.add(userId);
    }

    const users = userIds.size
      ? await prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, username: true },
        })
      : [];
    const usernames = new Map(users.map((user) => [user.id, user.username]));

    /** build week list (every week of the period, even ones without hours) */
    const weeks: {
      weekStart: Date;
      weekEnd: Date;
      totalSeconds: number;
      leoSeconds: number;
      emsFdSeconds: number;
    }[] = [];
    for (let t = weekStart.getTime(); t < to.getTime(); t += WEEK_MS) {
      weeks.push({
        weekStart: new Date(t),
        weekEnd: new Date(t + WEEK_MS),
        totalSeconds: 0,
        leoSeconds: 0,
        emsFdSeconds: 0,
      });
    }
    const weekIndexByTime = new Map(weeks.map((week, idx) => [week.weekStart.getTime(), idx]));

    type UnitEntry = {
      unitId: string;
      type: DutyUnitType;
      unit: any;
      totalSeconds: number;
      sessionCount: number;
      openSessions: number;
      flaggedSessions: number;
      firstSeen: Date;
      lastSeen: Date;
    };

    type UserEntry = {
      /** `null` for units that are not linked to a user (e.g. temporary units) */
      userId: string | null;
      username: string | null;
      totalSeconds: number;
      leoSeconds: number;
      emsFdSeconds: number;
      sessionCount: number;
      openSessions: number;
      flaggedSessions: number;
      /** seconds per week, same order as `weeks` */
      weeks: number[];
      units: UnitEntry[];
    };

    const unitEntries = new Map<string, UnitEntry>();
    for (const row of statsRows) {
      const key = getUnitKey(row);
      if (!key) continue;

      unitEntries.set(key.id, {
        unitId: key.id,
        type: key.type,
        unit: unitsById.get(key.id) ?? null,
        totalSeconds: 0,
        sessionCount: row.sessionCount,
        openSessions: row.openCount,
        flaggedSessions: row.flaggedCount,
        firstSeen: row.firstSeen,
        lastSeen: row.lastSeen,
      });
    }

    const unitWeekSeconds = new Map<string, number[]>();
    for (const row of weekRows) {
      const key = getUnitKey(row);
      if (!key) continue;

      const seconds = Number(row.seconds) || 0;
      const entry = unitEntries.get(key.id);
      if (entry) entry.totalSeconds += seconds;

      const weekIdx = weekIndexByTime.get(new Date(row.weekStart).getTime());
      if (weekIdx === undefined) continue;

      const week = weeks[weekIdx]!;
      week.totalSeconds += seconds;
      if (key.type === "LEO") week.leoSeconds += seconds;
      else week.emsFdSeconds += seconds;

      const perWeek = unitWeekSeconds.get(key.id) ?? weeks.map(() => 0);
      perWeek[weekIdx] = (perWeek[weekIdx] ?? 0) + seconds;
      unitWeekSeconds.set(key.id, perWeek);
    }

    const userEntries = new Map<string, UserEntry>();
    const departmentEntries = new Map<
      string,
      {
        departmentId: string | null;
        name: string | null;
        type: DutyUnitType;
        totalSeconds: number;
        sessionCount: number;
        unitCount: number;
      }
    >();

    const logUserIds = new Map(
      statsRows.map((row) => [row.officerId ?? row.emsFdDeputyId, row.logUserId] as const),
    );

    for (const [unitId, entry] of unitEntries) {
      const userId: string | null = entry.unit?.userId ?? logUserIds.get(unitId) ?? null;
      const userKey = userId ?? `unit:${unitId}`;

      const user: UserEntry = userEntries.get(userKey) ?? {
        userId,
        username: userId ? (usernames.get(userId) ?? null) : null,
        totalSeconds: 0,
        leoSeconds: 0,
        emsFdSeconds: 0,
        sessionCount: 0,
        openSessions: 0,
        flaggedSessions: 0,
        weeks: weeks.map(() => 0),
        units: [],
      };

      user.totalSeconds += entry.totalSeconds;
      if (entry.type === "LEO") user.leoSeconds += entry.totalSeconds;
      else user.emsFdSeconds += entry.totalSeconds;
      user.sessionCount += entry.sessionCount;
      user.openSessions += entry.openSessions;
      user.flaggedSessions += entry.flaggedSessions;
      user.units.push(entry);

      const perWeek = unitWeekSeconds.get(unitId);
      if (perWeek) {
        perWeek.forEach((seconds, idx) => {
          user.weeks[idx] = (user.weeks[idx] ?? 0) + seconds;
        });
      }
      userEntries.set(userKey, user);

      const departmentId: string | null = entry.unit?.departmentId ?? null;
      const departmentKey = `${entry.type}-${departmentId ?? "none"}`;
      const department = departmentEntries.get(departmentKey) ?? {
        departmentId,
        name: entry.unit?.department?.value?.value ?? null,
        type: entry.type,
        totalSeconds: 0,
        sessionCount: 0,
        unitCount: 0,
      };
      department.totalSeconds += entry.totalSeconds;
      department.sessionCount += entry.sessionCount;
      department.unitCount += 1;
      departmentEntries.set(departmentKey, department);
    }

    const usersList = [...userEntries.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
    for (const user of usersList) {
      user.units.sort((a, b) => b.totalSeconds - a.totalSeconds);
    }

    const totals = {
      totalSeconds: 0,
      leoSeconds: 0,
      emsFdSeconds: 0,
      sessionCount: 0,
      openSessions: 0,
      flaggedSessions: 0,
      userCount: usersList.length,
    };
    for (const user of usersList) {
      totals.totalSeconds += user.totalSeconds;
      totals.leoSeconds += user.leoSeconds;
      totals.emsFdSeconds += user.emsFdSeconds;
      totals.sessionCount += user.sessionCount;
      totals.openSessions += user.openSessions;
      totals.flaggedSessions += user.flaggedSessions;
    }

    const flaggedSessions = flaggedLogs.map((log) => {
      const key = getUnitKey(log);
      const unit = key ? (unitsById.get(key.id) ?? null) : null;
      const userId: string | null = unit?.userId ?? log.userId ?? null;

      return {
        id: log.id,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        type: key?.type ?? null,
        unitId: key?.id ?? null,
        unit,
        userId,
        username: userId ? (usernames.get(userId) ?? null) : null,
        ...mapSession(log, now, maxSessionHours),
      };
    });

    return {
      from,
      to,
      generatedAt: now,
      maxSessionHours,
      totals,
      weeks,
      users: usersList,
      departments: [...departmentEntries.values()].sort((a, b) => b.totalSeconds - a.totalSeconds),
      flaggedSessions,
    };
  }

  @Get("/sessions")
  @Description("Get the on-duty sessions of a user (or of a single unit) within a period.")
  @UsePermissions({ permissions: VIEW_DUTY_HOURS_PERMISSIONS })
  async getDutySessions(
    @QueryParams("userId", String) userId?: string,
    @QueryParams("unitId", String) unitId?: string,
    @QueryParams("from", String) rawFrom?: string,
    @QueryParams("to", String) rawTo?: string,
    @QueryParams("maxSessionHours", Number) rawMaxSessionHours?: number,
  ) {
    if (!userId && !unitId) {
      throw new ExtendedBadRequest({ userId: "Either userId or unitId is required." });
    }

    const now = new Date();
    const maxSessionHours = clampMaxHours(rawMaxSessionHours);
    const from = parseDate(rawFrom) ?? startOfWeek(now);
    const to = parseDate(rawTo) ?? now;

    const ownerWhere: Prisma.OfficerLogWhereInput = unitId
      ? { OR: [{ officerId: unitId }, { emsFdDeputyId: unitId }] }
      : {
          OR: [
            { officer: { userId } },
            { emsFdDeputy: { userId } },
            { userId, officer: { userId: null } },
            { userId, emsFdDeputy: { userId: null } },
          ],
        };

    const logs = await prisma.officerLog.findMany({
      where: {
        AND: [
          ownerWhere,
          { startedAt: { lt: to } },
          { OR: [{ endedAt: null }, { endedAt: { gt: from } }] },
          { OR: [{ officerId: { not: null } }, { emsFdDeputyId: { not: null } }] },
        ],
      },
      include: {
        officer: { include: _leoProperties },
        emsFdDeputy: { include: unitProperties },
      },
      orderBy: { startedAt: "desc" },
      take: MAX_SESSIONS,
    });

    return {
      maxSessionHours,
      sessions: logs.map((log) => ({
        id: log.id,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        type: (log.officerId ? "LEO" : "EMS_FD") as DutyUnitType,
        unitId: log.officerId ?? log.emsFdDeputyId,
        unit: log.officer ?? log.emsFdDeputy ?? null,
        ...mapSession(log, now, maxSessionHours),
      })),
    };
  }

  @Put("/sessions/:id")
  @Description("Correct the start/end time of an on-duty session.")
  @UsePermissions({ permissions: [Permissions.ManageUnits] })
  async updateDutySession(
    @Context("sessionUserId") sessionUserId: string,
    @PathParams("id") id: string,
    @BodyParams("startedAt") rawStartedAt: unknown,
    @BodyParams("endedAt") rawEndedAt: unknown,
  ) {
    const log = await prisma.officerLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFound("sessionNotFound");
    }

    const now = new Date();
    const startedAt = typeof rawStartedAt === "string" ? parseDate(rawStartedAt) : null;
    const endedAt =
      rawEndedAt === null || rawEndedAt === undefined || rawEndedAt === ""
        ? null
        : typeof rawEndedAt === "string"
          ? parseDate(rawEndedAt)
          : undefined;

    if (!startedAt) {
      throw new ExtendedBadRequest({ startedAt: "A valid start time is required." });
    }

    if (endedAt === undefined || (rawEndedAt && !endedAt)) {
      throw new ExtendedBadRequest({ endedAt: "The end time is invalid." });
    }

    // allow a small clock skew between the browser and the server
    const maxAllowed = now.getTime() + 5 * 60 * 1000;
    if (startedAt.getTime() > maxAllowed) {
      throw new ExtendedBadRequest({ startedAt: "The start time cannot be in the future." });
    }

    if (endedAt) {
      if (endedAt.getTime() > maxAllowed) {
        throw new ExtendedBadRequest({ endedAt: "The end time cannot be in the future." });
      }

      if (endedAt.getTime() <= startedAt.getTime()) {
        throw new ExtendedBadRequest({ endedAt: "The end time must be after the start time." });
      }
    } else if (log.endedAt !== null) {
      // re-opening a closed session could result in two concurrent open sessions for a unit
      throw new ExtendedBadRequest({ endedAt: "An end time is required for a closed session." });
    }

    const unitWhere: Prisma.OfficerLogWhereInput = log.officerId
      ? { officerId: log.officerId }
      : { emsFdDeputyId: log.emsFdDeputyId };

    const overlapping = await prisma.officerLog.findFirst({
      where: {
        ...unitWhere,
        id: { not: log.id },
        startedAt: { lt: endedAt ?? now },
        OR: [{ endedAt: null }, { endedAt: { gt: startedAt } }],
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new ExtendedBadRequest({
        startedAt: "This session would overlap another session of the same unit.",
      });
    }

    const updated = await prisma.officerLog.update({
      where: { id: log.id },
      data: { startedAt, endedAt },
    });

    await createAuditLogEntry({
      action: {
        type: DUTY_SESSION_UPDATE_TYPE,
        previous: log,
        new: updated,
      },
      prisma,
      executorId: sessionUserId,
    });

    return {
      id: updated.id,
      startedAt: updated.startedAt,
      endedAt: updated.endedAt,
      ...mapSession(updated, new Date(), DEFAULT_MAX_SESSION_HOURS),
    };
  }
}
