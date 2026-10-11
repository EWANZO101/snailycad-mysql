import * as React from "react";
import { useListener } from "@casperiv/use-socket.io";
import { SocketEvents } from "@snailycad/config";
import {
  ActiveToneType,
  type CombinedEmsFdUnit,
  type CombinedLeoUnit,
  type DepartmentValue,
  type EmsFdDeputy,
  type Officer,
} from "@snailycad/types";
import { Button, Loader, SelectField, TextField } from "@snailycad/ui";
import { isUnitCombined, isUnitCombinedEmsFd, isUnitOfficer } from "@snailycad/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { useValues } from "context/ValuesContext";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { toastMessage } from "lib/toastMessage";
import { playToneSound } from "lib/tone-sounds";
import useFetch from "lib/useFetch";
import { makeUnitName } from "lib/utils";
import { useCall911State } from "state/dispatch/call-911-state";
import { useDispatchState } from "state/dispatch/dispatch-state";

export interface TonePreset {
  id: string;
  name: string;
  sound: string;
  type: ActiveToneType;
  departmentId: string | null;
  department: DepartmentValue | null;
  position: number;
}

type ToneTarget = "ALL" | "LEO" | "EMS_FD" | "DEPARTMENT" | "UNIT" | "CALL";

interface PlayToneEvent {
  tone: { id: string; name: string; sound: string };
  target: ToneTarget;
  unitIds: string[] | null;
  departmentId: string | null;
  description: string | null;
  sentBy: string;
}

type ActiveUnit = Officer | EmsFdDeputy | CombinedLeoUnit | CombinedEmsFdUnit;

export function useTonePresets(enabled = true) {
  const { TONES } = useFeatureEnabled();
  const { execute } = useFetch();

  return useQuery({
    enabled: Boolean(TONES && enabled),
    queryKey: ["tone-presets"],
    queryFn: async () => {
      const { json } = await execute<TonePreset[]>({ path: "/tone-presets", noToast: true });
      return Array.isArray(json) ? json : [];
    },
  });
}

function getUnitDepartmentIds(unit: ActiveUnit) {
  if (isUnitCombined(unit)) return unit.officers.map((officer) => officer.departmentId);
  if (isUnitCombinedEmsFd(unit)) return unit.deputies.map((deputy) => deputy.departmentId);
  return [unit.departmentId];
}

function isToneForUnit(event: PlayToneEvent, unit: ActiveUnit, type: ActiveToneType) {
  switch (event.target) {
    case "ALL": {
      return true;
    }
    case "LEO": {
      return type === ActiveToneType.LEO;
    }
    case "EMS_FD": {
      return type === ActiveToneType.EMS_FD;
    }
    case "DEPARTMENT": {
      return getUnitDepartmentIds(unit).includes(event.departmentId);
    }
    case "UNIT":
    case "CALL": {
      return event.unitIds?.includes(unit.id) ?? false;
    }
    default: {
      return false;
    }
  }
}

/** plays tones dispatch sends to this unit, its department, its call or its whole service */
export function TargetedToneListener(props: {
  activeUnit: ActiveUnit | null;
  type: ActiveToneType;
}) {
  const { TONES } = useFeatureEnabled();
  const t = useTranslations("Tones");

  useListener(
    SocketEvents.PlayTone,
    (event: PlayToneEvent) => {
      if (!TONES || !props.activeUnit) return;
      if (!isToneForUnit(event, props.activeUnit, props.type)) return;

      playToneSound(event.tone.sound);
      toastMessage({
        icon: "info",
        title: t("toneReceived", { name: event.tone.name }),
        message: [event.description, t("sentBy", { username: event.sentBy })]
          .filter(Boolean)
          .join(" · "),
      });
    },
    [TONES, props.activeUnit?.id, props.type],
  );

  return null;
}

/** dispatch: play a configured tone for a specific audience */
export function PlayToneSection() {
  const t = useTranslations("Tones");
  const { execute, state } = useFetch();
  const { data: presets = [], isPending } = useTonePresets();
  const { department } = useValues();
  const { generateCallsign } = useGenerateCallsign();
  const { activeOfficers, activeDeputies } = useDispatchState((state) => ({
    activeOfficers: state.activeOfficers,
    activeDeputies: state.activeDeputies,
  }));
  const calls = useCall911State((state) => state.calls);

  const [typeFilter, setTypeFilter] = React.useState<"ALL" | ActiveToneType>("ALL");
  const [toneId, setToneId] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<ToneTarget>("ALL");
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");

  const filteredPresets = presets.filter(
    (preset) =>
      typeFilter === "ALL" || preset.type === typeFilter || preset.type === ActiveToneType.SHARED,
  );
  const selectedTone = presets.find((preset) => preset.id === toneId) ?? null;

  const targetOptions = React.useMemo(() => {
    if (target === "DEPARTMENT") {
      return department.values.map((value) => ({ value: value.id, label: value.value.value }));
    }
    if (target === "UNIT") {
      return [...activeOfficers, ...activeDeputies].map((unit) => ({
        value: unit.id,
        label:
          isUnitCombined(unit) || isUnitCombinedEmsFd(unit)
            ? generateCallsign(unit, "pairedUnitTemplate")
            : `${generateCallsign(unit, isUnitOfficer(unit) ? "callsignTemplate" : "pairedUnitTemplate")} ${makeUnitName(unit)}`,
      }));
    }
    if (target === "CALL") {
      return calls
        .filter((call) => !call.ended)
        .map((call) => ({
          value: call.id,
          label: `#${call.caseNumber} ${call.location} (${call.assignedUnits.length})`,
        }));
    }
    return [];
  }, [target, department.values, activeOfficers, activeDeputies, calls, generateCallsign]);

  // a tone scoped to a department defaults to that department
  React.useEffect(() => {
    if (selectedTone?.departmentId) {
      setTarget("DEPARTMENT");
      setTargetId(selectedTone.departmentId);
    }
  }, [selectedTone?.departmentId]);

  const needsTargetId = ["DEPARTMENT", "UNIT", "CALL"].includes(target);
  const canPlay = Boolean(selectedTone) && (!needsTargetId || Boolean(targetId));

  async function handlePlay() {
    if (!selectedTone || !canPlay) return;

    const { json } = await execute<{ played: boolean; unitCount: number | null }>({
      path: `/tone-presets/${selectedTone.id}/play`,
      method: "POST",
      data: { target, targetId: needsTargetId ? targetId : null, description: description || null },
    });

    if (json.played) {
      setDescription("");
      toastMessage({
        icon: "success",
        message:
          json.unitCount === null
            ? t("tonePlayed", { name: selectedTone.name })
            : t("tonePlayedToUnits", { name: selectedTone.name, count: json.unitCount }),
      });
    }
  }

  if (isPending) return <Loader />;
  if (presets.length <= 0) {
    return <p className="text-neutral-700 dark:text-gray-400 mb-4">{t("noPresets")}</p>;
  }

  return (
    <section className="card p-4 mb-5">
      <h3 className="font-semibold text-lg mb-2">{t("playATone")}</h3>

      <div className="grid gap-x-3 sm:grid-cols-2">
        <SelectField
          label={t("filter")}
          selectedKey={typeFilter}
          onSelectionChange={(value) => setTypeFilter((value as typeof typeFilter) ?? "ALL")}
          options={[
            { value: "ALL", label: t("allTones") },
            { value: ActiveToneType.LEO, label: t("leoTones") },
            { value: ActiveToneType.EMS_FD, label: t("emsFdTones") },
          ]}
        />
        <SelectField
          label={t("tone")}
          selectedKey={toneId}
          onSelectionChange={(value) => setToneId(value ? String(value) : null)}
          options={filteredPresets.map((preset) => ({
            value: preset.id,
            label: preset.department
              ? `${preset.name} (${preset.department.value.value})`
              : preset.name,
          }))}
        />
        <SelectField
          label={t("playFor")}
          selectedKey={target}
          onSelectionChange={(value) => {
            setTarget((value ?? "ALL") as ToneTarget);
            setTargetId(null);
          }}
          options={(["ALL", "LEO", "EMS_FD", "DEPARTMENT", "UNIT", "CALL"] as const).map(
            (value) => ({ value, label: t(`target_${value}`) }),
          )}
        />
        {needsTargetId ? (
          <SelectField
            label={t(`target_${target}`)}
            selectedKey={targetId}
            onSelectionChange={(value) => setTargetId(value ? String(value) : null)}
            options={targetOptions}
          />
        ) : null}
      </div>

      <TextField
        label={t("message")}
        isOptional
        value={description}
        onChange={setDescription}
        maxLength={355}
      />

      <footer className="flex justify-end gap-2">
        <Button
          variant="cancel"
          isDisabled={!selectedTone}
          onPress={() => selectedTone && playToneSound(selectedTone.sound)}
        >
          {t("preview")}
        </Button>
        <Button
          className="flex items-center gap-2"
          isDisabled={!canPlay || state === "loading"}
          onPress={handlePlay}
        >
          {state === "loading" ? <Loader /> : null}
          {t("play")}
        </Button>
      </footer>
    </section>
  );
}
