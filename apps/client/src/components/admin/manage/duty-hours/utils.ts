/**
 * Shared types & helpers for the Duty Hours report (`/admin/manage/duty-hours`).
 * The response types mirror `apps/api/src/controllers/admin/manage/units/duty-hours-controller.ts`.
 */

export type DutyUnitType = "LEO" | "EMS_FD";

export interface DutyHoursUnitEntry {
  unitId: string;
  type: DutyUnitType;
  unit: any;
  totalSeconds: number;
  sessionCount: number;
  openSessions: number;
  flaggedSessions: number;
  firstSeen: string;
  lastSeen: string;
}

export interface DutyHoursUserEntry {
  userId: string | null;
  username: string | null;
  totalSeconds: number;
  leoSeconds: number;
  emsFdSeconds: number;
  sessionCount: number;
  openSessions: number;
  flaggedSessions: number;
  /** seconds per week, same order as `DutyHoursReport["weeks"]` */
  weeks: number[];
  units: DutyHoursUnitEntry[];
}

export interface DutySession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  type: DutyUnitType | null;
  unitId: string | null;
  unit: any;
  userId?: string | null;
  username?: string | null;
  durationSeconds: number;
  isOnDuty: boolean;
  isLikelyMissedClockOut: boolean;
}

export interface DutyHoursReport {
  from: string;
  to: string;
  generatedAt: string;
  maxSessionHours: number;
  totals: {
    totalSeconds: number;
    leoSeconds: number;
    emsFdSeconds: number;
    sessionCount: number;
    openSessions: number;
    flaggedSessions: number;
    userCount: number;
  };
  weeks: {
    weekStart: string;
    weekEnd: string;
    totalSeconds: number;
    leoSeconds: number;
    emsFdSeconds: number;
  }[];
  users: DutyHoursUserEntry[];
  departments: {
    departmentId: string | null;
    name: string | null;
    type: DutyUnitType;
    totalSeconds: number;
    sessionCount: number;
    unitCount: number;
  }[];
  flaggedSessions: DutySession[];
}

export interface DutySessionsResponse {
  maxSessionHours: number;
  sessions: DutySession[];
}

export type PeriodPreset = "thisWeek" | "lastWeek" | "thisMonth" | "custom";

/** monday 00:00 (local time) of the week containing `date` */
export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** `YYYY-MM-DD` in local time, for `<input type="date">` */
export function toDateInput(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DDTHH:mm` in local time, for `<input type="datetime-local">` */
export function toDateTimeInput(value: string | Date) {
  const date = new Date(value);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateInput(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** returns the `[from, to)` range for a preset, in local time. */
export function getPeriod(
  preset: PeriodPreset,
  custom: { start: string; end: string },
  now = new Date(),
): { from: Date; to: Date } | null {
  switch (preset) {
    case "thisWeek": {
      const from = startOfWeek(now);
      return { from, to: addDays(from, 7) };
    }
    case "lastWeek": {
      const to = startOfWeek(now);
      return { from: addDays(to, -7), to };
    }
    case "thisMonth": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    }
    case "custom": {
      const from = parseDateInput(custom.start);
      const end = parseDateInput(custom.end);
      if (!from || !end) return null;
      const to = addDays(end, 1); // end date is inclusive
      if (to.getTime() <= from.getTime()) return null;
      return { from, to };
    }
    default:
      return null;
  }
}

export function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(2);
}

export function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function escapeCsv(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

/** client-side download of a generated file via a Blob URL */
export function downloadBlob(content: string, filename: string, type = "text/csv;charset=utf-8") {
  // BOM so Excel detects UTF-8
  const blob = new Blob(["﻿", content], { type });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
