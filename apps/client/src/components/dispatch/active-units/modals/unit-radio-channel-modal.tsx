import * as React from "react";
import type {
  CombinedEmsFdUnit,
  CombinedLeoUnit,
  EmsFdDeputy,
  Officer,
  DotWorker,
  CombinedDotUnit,
} from "@snailycad/types";
import { Loader, Button, SelectField, TextField } from "@snailycad/ui";
import { Modal } from "components/modal/Modal";
import { Form, Formik } from "formik";
import useFetch from "lib/useFetch";
import { useTranslations } from "next-intl";
import { Pencil } from "react-bootstrap-icons";
import { useRouter } from "next/router";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { handleValidate } from "lib/handleValidate";
import { UPDATE_RADIO_CHANNEL_SCHEMA } from "@snailycad/schemas";
import { isUnitCombined, isUnitCombinedEmsFd } from "@snailycad/utils";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";
import type { PutDispatchRadioChannelData } from "@snailycad/types/api";
import { useQuery } from "@tanstack/react-query";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";

interface RadioChannelOption {
  id: string;
  name: string;
  frequency: string | null;
}

/** the CAD's radio channels, when the built-in radio is on (shared by every unit row) */
function useRadioChannels(enabled: boolean) {
  const { execute } = useFetch();
  return useQuery({
    queryKey: ["radio-channels"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { json } = await execute<RadioChannelOption[]>({
        path: "/radio/channels",
        noToast: true,
      });
      return Array.isArray(json) ? json : [];
    },
  });
}

interface Props {
  unit: Officer | EmsFdDeputy | CombinedLeoUnit | CombinedEmsFdUnit | DotWorker | CombinedDotUnit;
  type?: "leo" | "ems-fd" | "dot";
  onClose?(): void;
}

export function UnitRadioChannelModal({ unit, type, onClose }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { state, execute } = useFetch();
  const common = useTranslations("Common");
  const t = useTranslations("Leo");
  const dispatchState = useDispatchState((state) => ({
    setActiveOfficers: state.setActiveOfficers,
    setActiveDeputies: state.setActiveDeputies,
    setActiveDotUnits: state.setActiveDotUnits,
    activeOfficers: state.activeOfficers,
    activeDeputies: state.activeDeputies,
    activeDotUnits: state.activeDotUnits,
  }));
  const { hasActiveDispatchers } = useActiveDispatchers();
  const { RADIO } = useFeatureEnabled();
  const radioChannels = useRadioChannels(RADIO);
  // with the built-in radio, units store a channel id: show its name
  const currentChannel = radioChannels.data?.find((channel) => channel.id === unit.radioChannelId);

  const router = useRouter();
  const isDispatch = router.pathname.includes("/dispatch");

  function handleClose() {
    onClose?.();
    setIsOpen(false);
  }

  function handleStateChange(json: any) {
    if (type === "dot") {
      dispatchState.setActiveDotUnits(
        dispatchState.activeDotUnits.map((worker) => {
          if (worker.id === unit.id) {
            return { ...worker, ...json };
          }
          return worker;
        }),
      );
      return;
    }

    const isCombined = isUnitCombined(unit) || isUnitCombinedEmsFd(unit);

    if (!isCombined) {
      dispatchState.setActiveOfficers(
        dispatchState.activeOfficers.map((off) => {
          if (off.id === unit.id) {
            return { ...unit, ...json };
          }
          return off;
        }),
      );
    } else {
      dispatchState.setActiveDeputies(
        dispatchState.activeDeputies.map((dep) => {
          if (dep.id === unit.id) {
            return { ...unit, ...json };
          }
          return dep;
        }),
      );
    }
  }

  async function onSubmit(values: typeof INITIAL_VALUES) {
    handleStateChange({ radioChannelId: values.radioChannel });

    const { json } = await execute<PutDispatchRadioChannelData>({
      path: `/dispatch/radio-channel/${unit.id}`,
      method: "PUT",
      data: {
        radioChannel: values.radioChannel.trim() || null,
      },
    });

    if (json.id) {
      handleStateChange(json);
      handleClose();
    }
  }

  const validate = handleValidate(UPDATE_RADIO_CHANNEL_SCHEMA);
  const INITIAL_VALUES = {
    radioChannel: unit.radioChannelId ?? "",
  };

  return (
    <>
      <span className="flex items-center gap-2">
        <span>
          {currentChannel
            ? `${currentChannel.name}${currentChannel.frequency ? ` (${currentChannel.frequency})` : ""}`
            : unit.radioChannelId
              ? unit.radioChannelId
              : common("none")}
        </span>

        {isDispatch ? (
          <Button
            className="px-1.5"
            onPress={() => setIsOpen(true)}
            disabled={!hasActiveDispatchers}
          >
            <Pencil aria-label={t("manageRadioChannel")} className="fill-current text-white" />
          </Button>
        ) : null}
      </span>

      {isOpen && isDispatch ? (
        <Modal
          onClose={handleClose}
          isOpen
          title={t("manageRadioChannel")}
          className="min-w-[500px]"
        >
          <Formik validate={validate} onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
            {({ values, errors, setFieldValue }) => (
              <Form>
                {RADIO && radioChannels.data?.length ? (
                  <SelectField
                    errorMessage={errors.radioChannel}
                    label={t("radioChannel")}
                    selectedKey={values.radioChannel || null}
                    onSelectionChange={(value) => setFieldValue("radioChannel", value ?? "")}
                    options={radioChannels.data.map((channel) => ({
                      value: channel.id,
                      label: channel.frequency
                        ? `${channel.name} (${channel.frequency})`
                        : channel.name,
                    }))}
                  />
                ) : (
                  <TextField
                    errorMessage={errors.radioChannel}
                    autoFocus
                    isRequired
                    label={t("radioChannel")}
                    value={values.radioChannel}
                    onChange={(value) => setFieldValue("radioChannel", value)}
                  />
                )}

                <footer className="flex mt-5 justify-end">
                  <Button onPress={handleClose} type="button" variant="cancel">
                    {common("cancel")}
                  </Button>
                  <Button
                    disabled={state === "loading"}
                    className="flex items-center ml-2"
                    type="submit"
                  >
                    {state === "loading" ? <Loader className="mr-2 border-red-200" /> : null}

                    {common("save")}
                  </Button>
                </footer>
              </Form>
            )}
          </Formik>
        </Modal>
      ) : null}
    </>
  );
}
