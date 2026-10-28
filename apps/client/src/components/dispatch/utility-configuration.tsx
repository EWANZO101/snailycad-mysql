import { useTranslations } from "use-intl";
import { Button } from "@snailycad/ui";
import useFetch from "lib/useFetch";
import { useSignal100 } from "hooks/shared/useSignal100";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";
import * as modalButtons from "components/modal-buttons/buttons";
import { ModalButton } from "components/modal-buttons/modal-button";
import { ModalIds } from "types/modal-ids";
import { useModal } from "state/modalState";
import type {
  PostDispatchDispatchersStateData,
  PostDispatchSignal100Data,
} from "@snailycad/types/api";
import {
  BuildingsFill,
  CarFrontFill,
  ExclamationOctagonFill,
  GeoAltFill,
  JournalText,
  MegaphoneFill,
  PersonBadge,
  Power,
  Sliders,
  Soundwave,
  TelephonePlusFill,
} from "react-bootstrap-icons";

import dynamic from "next/dynamic";
import { useCall911State } from "state/dispatch/call-911-state";
import { ActiveToneType } from "@snailycad/types";
import { useActiveDispatcherState } from "state/dispatch/active-dispatcher-state";

const EnableSignal100Modal = dynamic(
  async () => (await import("./modals/enable-signal-100-modal")).EnableSignal100Modal,
  { ssr: false },
);

const TonesModal = dynamic(async () => (await import("./modals/tones-modal")).TonesModal, {
  ssr: false,
});

const SelectDepartmentModal = dynamic(
  async () => (await import("./modals/select-department-modal")).SelectDepartmentModal,
  { ssr: false },
);

const buttons: modalButtons.ModalButton[] = [
  modalButtons.nameSearchBtn,
  modalButtons.plateSearchBtn,
  modalButtons.weaponSearchBtn,
  modalButtons.addressSearchBtn,
  modalButtons.customFieldSearchBtn,
  modalButtons.createBoloBtn,
  modalButtons.create911CallBtn,
  modalButtons.notepadBtn,
  modalButtons.selectDepartmentBtn,
];

const buttonIcons = [
  <PersonBadge key="name" size={15} />,
  <CarFrontFill key="plate" size={15} />,
  <ExclamationOctagonFill key="weapon" size={15} />,
  <GeoAltFill key="address" size={15} />,
  <Sliders key="custom-field" size={15} />,
  <MegaphoneFill key="bolo" size={15} />,
  <TelephonePlusFill key="911" size={15} />,
  <JournalText key="notepad" size={15} />,
  <BuildingsFill key="department" size={15} />,
];

export function DispatchModalButtons() {
  const t = useTranslations();
  const { execute } = useFetch();
  const { enabled: signal100Enabled } = useSignal100();
  const features = useFeatureEnabled();

  const { userActiveDispatcher } = useActiveDispatchers();
  const setUserActiveDispatcher = useActiveDispatcherState((s) => s.setUserActiveDispatcher);

  const { ACTIVE_DISPATCHERS, TONES } = useFeatureEnabled();
  const modalState = useModal();
  const { calls, setCalls } = useCall911State((state) => ({
    calls: state.calls,
    setCalls: state.setCalls,
  }));

  const isActive = ACTIVE_DISPATCHERS ? Boolean(userActiveDispatcher) : true;

  async function handleStateChangeDispatcher() {
    const newState = !isActive;

    const { json } = await execute<PostDispatchDispatchersStateData>({
      path: "/dispatch/dispatchers-state",
      method: "POST",
      data: { value: newState },
    });

    setUserActiveDispatcher(json.dispatcher, json.activeDispatchersCount);
  }

  async function handleSignal100() {
    if (signal100Enabled) {
      await execute<PostDispatchSignal100Data>({
        path: "/dispatch/signal-100",
        method: "POST",
        data: { value: !signal100Enabled },
      });

      setCalls(calls.map((call) => ({ ...call, isSignal100: false })));
    } else {
      modalState.openModal(ModalIds.EnableSignal100);
    }
  }

  return (
    <div className="px-4 py-2 pb-3">
      <div className="modal-buttons-grid">
        {buttons.map((button, idx) => (
          <ModalButton disabled={!isActive} key={idx} button={button} icon={buttonIcons[idx]} />
        ))}
      </div>

      <div className="dispatch-status-row">
        <Button
          variant={signal100Enabled ? "default" : "danger"}
          className="flex items-center gap-2"
          disabled={!isActive}
          onPress={handleSignal100}
          id="signal100"
        >
          <MegaphoneFill size={15} />
          {signal100Enabled ? t("Leo.disableSignal100") : t("Leo.enableSignal100")}
        </Button>

        {TONES ? (
          <Button
            className="flex items-center gap-2"
            disabled={!isActive}
            onPress={() => modalState.openModal(ModalIds.Tones)}
          >
            <Soundwave size={15} />
            {t("Leo.tones")}
          </Button>
        ) : null}

        {features.ACTIVE_DISPATCHERS ? (
          <Button
            variant={isActive ? "amber" : "success"}
            className="flex items-center gap-2"
            onPress={handleStateChangeDispatcher}
          >
            <Power size={15} />
            {isActive ? t("Leo.goOffDuty") : t("Leo.goOnDuty")}
          </Button>
        ) : null}
      </div>

      {TONES ? <TonesModal types={[ActiveToneType.LEO, ActiveToneType.EMS_FD]} /> : null}
      {signal100Enabled ? null : <EnableSignal100Modal />}
      <SelectDepartmentModal />
    </div>
  );
}
