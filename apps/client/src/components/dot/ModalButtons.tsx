import { Button } from "@snailycad/ui";
import { ModalIds } from "types/modal-ids";
import { ActiveToneType, ShouldDoType } from "@snailycad/types";
import { useModal } from "state/modalState";
import { useTranslations } from "use-intl";
import { type ActiveDotWorker, useDotState } from "state/dot-state";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { makeUnitName } from "lib/utils";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useMounted } from "@casperiv/useful";
import { usePermission } from "hooks/usePermission";
import { defaultPermissions } from "@snailycad/permissions";
import { isUnitCombinedDot } from "@snailycad/utils";

import dynamic from "next/dynamic";
import { ActiveCallColumn } from "components/dispatch/active-units/officers/columns/active-call-column";
import { ActiveIncidentColumn } from "components/dispatch/active-units/officers/columns/active-incident-column";
import { TargetedToneListener } from "components/tones/tone-presets";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";

const TonesModal = dynamic(
  async () => (await import("components/dispatch/modals/tones-modal")).TonesModal,
  { ssr: false },
);

interface MButton {
  nameKey: [string, string];
  modalId: ModalIds;
}

const buttons: MButton[] = [
  {
    nameKey: ["Leo", "notepad"],
    modalId: ModalIds.Notepad,
  },
  {
    nameKey: ["Leo", "departmentInformation"],
    modalId: ModalIds.DepartmentInfo,
  },
];

export function ModalButtons({
  initialActiveWorker,
}: {
  initialActiveWorker: ActiveDotWorker | null;
}) {
  const _activeWorker = useDotState((s) => s.activeWorker);
  const isMounted = useMounted();
  const modalState = useModal();
  const t = useTranslations();
  const { generateCallsign } = useGenerateCallsign();
  const { hasActiveDispatchers } = useActiveDispatchers();
  const { TONES } = useFeatureEnabled();
  const activeWorker = isMounted ? _activeWorker : initialActiveWorker;

  const { hasPermissions } = usePermission();
  const isAdmin = hasPermissions(defaultPermissions.allDefaultAdminPermissions);

  const isButtonDisabled = isAdmin
    ? false
    : !activeWorker ||
      activeWorker.status?.shouldDo === ShouldDoType.SET_OFF_DUTY ||
      activeWorker.statusId === null;

  const nameAndCallsign =
    activeWorker &&
    !isButtonDisabled &&
    (isUnitCombinedDot(activeWorker)
      ? generateCallsign(activeWorker, "pairedUnitTemplate")
      : `${generateCallsign(activeWorker)} ${makeUnitName(activeWorker)}`);

  return (
    <div className="py-2">
      {nameAndCallsign && activeWorker ? (
        <div className="flex items-center gap-x-12">
          <p>
            <span className="font-semibold">{t("Dot.activeWorker")}: </span>
            {nameAndCallsign}
          </p>

          <p className="flex items-center gap-x-1">
            <span className="font-semibold">{t("Leo.activeCall")}: </span>
            <ActiveCallColumn
              size="sm"
              callId={activeWorker.activeCallId}
              isDispatch={false}
              unitId={activeWorker.id}
            />
          </p>

          <p className="flex items-center gap-x-1">
            <span className="font-semibold">{t("Leo.incident")}: </span>
            <ActiveIncidentColumn
              size="sm"
              incidentId={activeWorker.activeIncidentId}
              isDispatch={false}
              unitId={activeWorker.id}
            />
          </p>

          <TargetedToneListener activeUnit={activeWorker} type={ActiveToneType.SHARED} />
        </div>
      ) : null}

      <div className="mt-2 modal-buttons-grid">
        {buttons.map((button, idx) => (
          <Button
            id={button.nameKey[1]}
            key={idx}
            disabled={isButtonDisabled}
            title={isButtonDisabled ? "Go on-duty before continuing" : button.nameKey[1]}
            onPress={() => modalState.openModal(button.modalId)}
          >
            {t(button.nameKey.join("."))}
          </Button>
        ))}

        {!hasActiveDispatchers && TONES ? (
          <>
            <Button
              disabled={isButtonDisabled}
              onPress={() => modalState.openModal(ModalIds.Tones)}
            >
              {t("Leo.tones")}
            </Button>

            <TonesModal types={[ActiveToneType.SHARED]} />
          </>
        ) : null}
      </div>
    </div>
  );
}
