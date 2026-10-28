import type {
  CombinedEmsFdUnit,
  CombinedLeoUnit,
  CombinedDotUnit,
  EmergencyVehicleValue,
  EmsFdDeputy,
  Officer,
  DotWorker,
} from "@snailycad/types";
import { Loader, Button, AsyncListSearchField, Item, TextField } from "@snailycad/ui";
import { FormField } from "components/form/FormField";
import { Modal } from "components/modal/Modal";
import { Form, Formik } from "formik";
import useFetch from "lib/useFetch";
import { useTranslations } from "next-intl";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { Select } from "components/form/Select";
import { isUnitCombined, isUnitCombinedEmsFd, isUnitCombinedDot } from "@snailycad/utils/typeguards";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { makeUnitName } from "lib/utils";
import type { PostDispatchStatusMergeOfficers } from "@snailycad/types/api";
import type { ActiveDeputy } from "state/ems-fd-state";
import type { ActiveOfficer } from "state/leo-state";
import type { ActiveDotWorker } from "state/dot-state";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";

interface Props {
  isDispatch: boolean;
  unit: Officer | EmsFdDeputy | DotWorker;
  onClose?(): void;

  type: "leo" | "ems-fd" | "dot";

  activeUnits: (EmsFdDeputy | CombinedEmsFdUnit | Officer | CombinedLeoUnit | DotWorker | CombinedDotUnit)[];
  setActiveUnits(
    units: (EmsFdDeputy | CombinedEmsFdUnit | Officer | CombinedLeoUnit | DotWorker | CombinedDotUnit)[],
  ): void;

  activeUnit: ActiveDeputy | ActiveOfficer | ActiveDotWorker | null;
  setActiveUnit(
    unit: EmsFdDeputy | CombinedEmsFdUnit | Officer | CombinedLeoUnit | DotWorker | CombinedDotUnit | null,
  ): void;
}

export function MergeUnitModal({
  unit,
  isDispatch,
  activeUnits,
  setActiveUnits,
  activeUnit,
  setActiveUnit,
  onClose,
  type,
}: Props) {
  const modalState = useModal();
  const { state, execute } = useFetch();
  const common = useTranslations("Common");
  const t = useTranslations("Leo");
  const ems = useTranslations("Ems");
  const { generateCallsign } = useGenerateCallsign();
  const { USER_DEFINED_CALLSIGN_COMBINED_UNIT } = useFeatureEnabled();

  function handleClose() {
    onClose?.();
    modalState.closeModal(ModalIds.MergeUnit);
  }

  function makeValuesOption(unit: Officer | EmsFdDeputy | DotWorker, fixed?: boolean) {
    return {
      label: `${generateCallsign(unit)} ${makeUnitName(unit)}`,
      value: unit.id,
      isFixed: fixed,
    };
  }

  async function onSubmit(values: typeof INITIAL_VALUES) {
    const { json } = await execute<PostDispatchStatusMergeOfficers>({
      path: `/dispatch/status/merge/${type}`,
      method: "POST",
      data: {
        ...values,
        ids: values.ids.map((v) => ({
          entry: isDispatch ? v.isFixed : v.value === activeUnit?.id && v.isFixed,
          id: v.value,
        })),
      },
    });

    if (json.id) {
      const newOfficers = [];

      for (const officer of activeUnits) {
        if (values.ids.some((v) => v.value === officer.id)) {
          continue;
        }

        newOfficers.push(officer);
      }

      if (!isDispatch) {
        setActiveUnit(json);
      }

      setActiveUnits([json, ...newOfficers]);
      handleClose();
    }
  }

  const isCombined =
    activeUnit &&
    (isUnitCombined(activeUnit) || isUnitCombinedEmsFd(activeUnit) || isUnitCombinedDot(activeUnit));

  const INITIAL_VALUES = {
    vehicleId: null as string | null,
    vehicleSearch: "",
    userDefinedCallsign: "",
    ids:
      activeUnit && !isCombined && !isDispatch
        ? [makeValuesOption(activeUnit, true), makeValuesOption(unit, true)]
        : [makeValuesOption(unit, true)],
  };

  const title =
    type === "leo" ? t("mergeOfficers") : type === "dot" ? t("mergeDotWorkers") : t("mergeDeputies");
  const label = type === "leo" ? t("officers") : type === "dot" ? t("dotWorkers") : t("deputies");

  return (
    <Modal
      onClose={handleClose}
      isOpen={modalState.isOpen(ModalIds.MergeUnit)}
      title={title}
      className="w-[600px]"
    >
      <Formik onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ values, errors, setValues, setFieldValue, handleChange }) => (
          <Form>
            <FormField label={label}>
              <Select
                isMulti
                values={activeUnits
                  .filter(
                    (u) =>
                      !isUnitCombined(u) || !isUnitCombinedEmsFd(u) || !isUnitCombinedDot(u),
                  )
                  .map((v) => makeValuesOption(v as EmsFdDeputy | Officer | DotWorker))}
                name="ids"
                onChange={handleChange}
                value={values.ids}
              />
            </FormField>

            <AsyncListSearchField<EmergencyVehicleValue>
              isClearable
              errorMessage={errors.vehicleId}
              isOptional
              label={type === "leo" ? t("patrolVehicle") : ems("emergencyVehicle")}
              localValue={values.vehicleSearch}
              onInputChange={(value) => setFieldValue("vehicleSearch", value)}
              onSelectionChange={(node) => {
                if (node) {
                  setValues({
                    ...values,
                    vehicleSearch: node.value?.value.value ?? node.textValue,
                    vehicleId: node.key as string,
                  });
                }
              }}
              fetchOptions={{
                apiPath: (query) => {
                  const basePath = "/admin/values/emergency_vehicle/search?";
                  const queryParams = new URLSearchParams();
                  const departmentId = activeUnit?.departmentId || unit.departmentId;

                  if (query) queryParams.set("query", query);
                  if (departmentId) {
                    queryParams.set("department", departmentId);
                  }

                  return `${basePath}${queryParams.toString()}`;
                },
                filterTextRequired: true,
              }}
            >
              {(item) => <Item key={item.id}>{item.value.value}</Item>}
            </AsyncListSearchField>

            {USER_DEFINED_CALLSIGN_COMBINED_UNIT ? (
              <TextField
                label="Custom Unit Callsign"
                description="This will override the default callsign for this unit."
                onChange={(value) => setFieldValue("userDefinedCallsign", value)}
                errorMessage={errors.userDefinedCallsign}
                isOptional
              />
            ) : null}

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
                {t("merge")}
              </Button>
            </footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
