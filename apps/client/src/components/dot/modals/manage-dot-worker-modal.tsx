import * as React from "react";
import { DOT_WORKER_SCHEMA } from "@snailycad/schemas";
import { Loader, Button, TextField, FormRow } from "@snailycad/ui";
import { FormField } from "components/form/FormField";
import { Select } from "components/form/Select";
import { Modal } from "components/modal/Modal";
import { useModal } from "state/modalState";
import { useValues } from "context/ValuesContext";
import { Formik, type FormikHelpers } from "formik";
import { handleValidate } from "lib/handleValidate";
import useFetch from "lib/useFetch";
import { ModalIds } from "types/modal-ids";
import { useTranslations } from "use-intl";
import { ImageSelectInput, validateFile } from "components/form/inputs/ImageSelectInput";
import { CallSignPreview } from "components/leo/CallsignPreview";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { CitizenSuggestionsField } from "components/shared/CitizenSuggestionsField";
import type {
  PostMyDotWorkersData,
  PostMyDotWorkerByIdData,
  PutMyDotWorkerByIdData,
} from "@snailycad/types/api";

interface Props {
  worker: PostMyDotWorkersData | null;
  onCreate?(worker: PostMyDotWorkersData): void;
  onUpdate?(old: PutMyDotWorkerByIdData, newWorker: PutMyDotWorkerByIdData): void;
  onClose?(): void;
}

export function ManageDotWorkerModal({ worker, onClose, onUpdate, onCreate }: Props) {
  const [image, setImage] = React.useState<File | string | null>(null);
  const modalState = useModal();
  const common = useTranslations("Common");
  const t = useTranslations();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { BADGE_NUMBERS, DIVISIONS } = useFeatureEnabled();

  const { state, execute } = useFetch();
  const { department, division } = useValues();

  function handleClose() {
    modalState.closeModal(ModalIds.ManageDotWorker);
    onClose?.();
  }

  async function onSubmit(
    values: typeof INITIAL_VALUES,
    helpers: FormikHelpers<typeof INITIAL_VALUES>,
  ) {
    const fd = new FormData();
    const validatedImage = validateFile(image, helpers);

    if (validatedImage) {
      if (typeof validatedImage !== "string") {
        fd.set("image", validatedImage, validatedImage.name);
      }
    }

    let workerId;

    if (worker) {
      const { json } = await execute<PutMyDotWorkerByIdData, typeof INITIAL_VALUES>({
        path: `/dot/${worker.id}`,
        method: "PUT",
        data: values,
        helpers,
      });

      if (json.id) {
        workerId = worker.id;
        onUpdate?.(worker, json);
      }
    } else {
      const { json } = await execute<PostMyDotWorkersData, typeof INITIAL_VALUES>({
        path: "/dot",
        method: "POST",
        data: values,
        helpers,
      });

      workerId = json.id;

      if (json.id) {
        onCreate?.(json);
      }
    }

    if (validatedImage && typeof validatedImage === "object") {
      await execute<PostMyDotWorkerByIdData, typeof INITIAL_VALUES>({
        path: `/dot/image/${workerId}`,
        method: "POST",
        data: fd,
        helpers,
        headers: {
          "content-type": "multipart/form-data",
        },
      });
    }

    if (workerId) {
      modalState.closeModal(ModalIds.ManageDotWorker);
    }
  }

  const validate = handleValidate(DOT_WORKER_SCHEMA);
  const INITIAL_VALUES = {
    citizenId: worker?.citizenId ?? "",
    name: worker ? `${worker.citizen.name} ${worker.citizen.surname}` : "",
    department: worker?.departmentId ?? "",
    rank: worker?.rankId ?? "",
    callsign: worker?.callsign ?? "",
    callsign2: worker?.callsign2 ?? "",
    division: worker?.divisionId ?? "",
    badgeNumberString: BADGE_NUMBERS ? (worker?.badgeNumberString ?? "") : undefined,
    image: undefined,
  };

  return (
    <Modal
      title={worker ? t("Dot.editWorker") : t("Dot.createWorker")}
      onClose={handleClose}
      isOpen={modalState.isOpen(ModalIds.ManageDotWorker)}
      className="w-[600px]"
    >
      <Formik validate={validate} initialValues={INITIAL_VALUES} onSubmit={onSubmit}>
        {({ handleChange, setFieldValue, handleSubmit, errors, values, isValid }) => (
          <form ref={formRef} onSubmit={handleSubmit}>
            <ImageSelectInput image={image} setImage={setImage} />

            <CitizenSuggestionsField
              autoFocus
              allowsCustomValue
              label={t("Leo.citizen")}
              fromAuthUserOnly
              labelFieldName="name"
              valueFieldName="citizenId"
            />

            {BADGE_NUMBERS ? (
              <TextField
                errorMessage={errors.badgeNumberString}
                label={t("Leo.badgeNumber")}
                name="badgeNumberString"
                onChange={(value) => setFieldValue("badgeNumberString", value)}
                value={values.badgeNumberString}
              />
            ) : null}

            <FormRow>
              <TextField
                errorMessage={errors.callsign}
                label={t("Leo.callsign1")}
                name="callsign"
                onChange={(value) => setFieldValue("callsign", value)}
                value={values.callsign}
              />

              <TextField
                errorMessage={errors.callsign2}
                label={t("Leo.callsign2")}
                name="callsign2"
                onChange={(value) => setFieldValue("callsign2", value)}
                value={values.callsign2}
              />
            </FormRow>

            <FormField errorMessage={errors.department} label={t("Leo.department")}>
              <Select
                value={values.department}
                name="department"
                onChange={handleChange}
                values={department.values
                  .filter((v) => v.type === "DOT")
                  .map((value) => ({
                    label: value.value.value,
                    value: value.id,
                  }))}
              />
            </FormField>

            {DIVISIONS ? (
              <FormField errorMessage={errors.division} label={t("Leo.division")}>
                <Select
                  value={values.division}
                  name="division"
                  onChange={handleChange}
                  values={division.values
                    .filter((v) =>
                      values.department ? v.departmentId === values.department : true,
                    )
                    .map((value) => ({
                      label: value.value.value,
                      value: value.id,
                    }))}
                />
              </FormField>
            ) : null}

            <CallSignPreview
              divisions={division.values.filter((v) => values.division === v.id)}
              department={department.values.find((v) => v.id === values.department) ?? null}
            />

            <footer className="flex justify-end mt-5">
              <Button type="reset" onPress={handleClose} variant="cancel">
                {common("cancel")}
              </Button>
              <Button
                className="flex items-center"
                disabled={!isValid || state === "loading"}
                type="submit"
              >
                {state === "loading" ? <Loader className="mr-2" /> : null}
                {worker ? common("save") : common("create")}
              </Button>
            </footer>
          </form>
        )}
      </Formik>
    </Modal>
  );
}
