import * as React from "react";
import { useTranslations } from "use-intl";
import { Button, FullDate, Loader, TextField } from "@snailycad/ui";
import { Modal } from "components/modal/Modal";
import useFetch from "lib/useFetch";
import {
  type DutySession,
  type DutySessionsResponse,
  formatDuration,
  toDateTimeInput,
} from "./utils";

interface Props {
  /** what to load: a user's sessions, or a single unit's sessions (for units without a user) */
  target: { userId: string | null; unitId?: string | null; name: string } | null;
  period: { from: Date; to: Date };
  maxSessionHours: number;
  canEdit: boolean;
  getUnitLabel(unit: any): string;
  onClose(): void;
  /** called after a session was corrected so the report can be refreshed */
  onUpdated(): void;
}

export function DutySessionsModal(props: Props) {
  const t = useTranslations("DutyHours");
  const { state, execute } = useFetch();
  const [sessions, setSessions] = React.useState<DutySession[]>([]);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { target, period, maxSessionHours } = props;

  const load = React.useCallback(async () => {
    if (!target) return;

    const params = new URLSearchParams({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      maxSessionHours: String(maxSessionHours),
    });
    if (target.userId) params.set("userId", target.userId);
    else if (target.unitId) params.set("unitId", target.unitId);

    const { json } = await execute<DutySessionsResponse>({
      path: `/admin/manage/units/duty-hours/sessions?${params.toString()}`,
      method: "GET",
    });

    setSessions(Array.isArray(json.sessions) ? json.sessions : []);
    setHasLoaded(true);
  }, [target, period, maxSessionHours]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setSessions([]);
    setHasLoaded(false);
    setEditingId(null);
    void load();
  }, [load]);

  return (
    <Modal
      title={target ? t("sessionsOf", { name: target.name }) : t("sessions")}
      isOpen={!!target}
      onClose={props.onClose}
      className="w-full max-w-5xl"
    >
      {!hasLoaded && state === "loading" ? (
        <Loader />
      ) : sessions.length <= 0 ? (
        <p className="text-neutral-700 dark:text-gray-400">{t("noSessions")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-quinary">
                <th className="p-2">{t("unit")}</th>
                <th className="p-2">{t("startedAt")}</th>
                <th className="p-2">{t("endedAt")}</th>
                <th className="p-2">{t("duration")}</th>
                <th className="p-2">{t("flags")}</th>
                {props.canEdit ? <th className="p-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) =>
                editingId === session.id ? (
                  <tr key={session.id} className="border-b border-gray-200 dark:border-quinary">
                    <td colSpan={props.canEdit ? 6 : 5} className="p-2">
                      <EditSessionForm
                        session={session}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => {
                          setEditingId(null);
                          void load();
                          props.onUpdated();
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={session.id} className="border-b border-gray-200 dark:border-quinary">
                    <td className="p-2">{props.getUnitLabel(session.unit)}</td>
                    <td className="p-2">
                      <FullDate>{session.startedAt}</FullDate>
                    </td>
                    <td className="p-2">
                      {session.endedAt ? <FullDate>{session.endedAt}</FullDate> : "—"}
                    </td>
                    <td className="p-2">{formatDuration(session.durationSeconds)}</td>
                    <td className="p-2">
                      <SessionFlags session={session} />
                    </td>
                    {props.canEdit ? (
                      <td className="p-2 text-right">
                        <Button size="xs" onPress={() => setEditingId(session.id)}>
                          {t("editSession")}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export function SessionFlags({ session }: { session: DutySession }) {
  const t = useTranslations("DutyHours");

  return (
    <span className="flex flex-wrap gap-1">
      {session.isOnDuty ? (
        <span className="rounded-md px-1.5 py-0.5 text-xs bg-emerald-500/30 text-emerald-900 dark:text-emerald-200">
          {t("stillOnDuty")}
        </span>
      ) : null}
      {session.isLikelyMissedClockOut ? (
        <span className="rounded-md px-1.5 py-0.5 text-xs bg-orange-500/30 text-orange-900 dark:text-orange-200">
          {t("likelyMissedClockOut")}
        </span>
      ) : null}
    </span>
  );
}

function EditSessionForm({
  session,
  onCancel,
  onSaved,
}: {
  session: DutySession;
  onCancel(): void;
  onSaved(): void;
}) {
  const t = useTranslations("DutyHours");
  const common = useTranslations("Common");
  const { state, execute } = useFetch();

  const [startedAt, setStartedAt] = React.useState(toDateTimeInput(session.startedAt));
  const [endedAt, setEndedAt] = React.useState(
    session.endedAt ? toDateTimeInput(session.endedAt) : "",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // `datetime-local` values are local time; convert to ISO (UTC) for the API
    const { json } = await execute<DutySession>({
      path: `/admin/manage/units/duty-hours/sessions/${session.id}`,
      method: "PUT",
      data: {
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
      },
    });

    if (json.id) {
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <TextField
          className="min-w-[14rem]"
          type="datetime-local"
          label={t("startedAt")}
          value={startedAt}
          onChange={setStartedAt}
          isRequired
        />
        <TextField
          className="min-w-[14rem]"
          type="datetime-local"
          label={t("endedAt")}
          value={endedAt}
          onChange={setEndedAt}
          isRequired={!session.isOnDuty}
          isOptional={session.isOnDuty}
        />
      </div>
      {session.isOnDuty ? (
        <p className="text-sm text-neutral-700 dark:text-gray-400">{t("endedAtHint")}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="cancel" onPress={onCancel}>
          {common("cancel")}
        </Button>
        <Button
          type="submit"
          className="flex items-center gap-2"
          isDisabled={state === "loading" || !startedAt}
        >
          {state === "loading" ? <Loader /> : null}
          {common("save")}
        </Button>
      </div>
    </form>
  );
}
