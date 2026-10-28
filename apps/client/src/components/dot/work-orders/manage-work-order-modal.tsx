import { useTranslations } from "use-intl";
import { Button, Loader, TextField, FormRow } from "@snailycad/ui";
import { Form, Formik } from "formik";
import { Modal } from "components/modal/Modal";
import { FormField } from "components/form/FormField";
import { Select } from "components/form/Select";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import useFetch from "lib/useFetch";
import { handleValidate } from "lib/handleValidate";
import { CREATE_DOT_WORK_ORDER_SCHEMA } from "@snailycad/schemas";
import { useValues } from "context/ValuesContext";
import type { DotWorkOrder } from "@snailycad/types";
import type { PostDotWorkOrdersData, PutDotWorkOrderByIdData } from "@snailycad/types/api";

interface Props {
  onCreate?(workOrder: DotWorkOrder): void;
  onUpdate?(workOrder: DotWorkOrder): void;
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function ManageDotWorkOrderModal({ onCreate, onUpdate }: Props) {
  const modalState = useModal();
  const common = useTranslations("Common");
  const t = useTranslations("Dot");
  const { state, execute } = useFetch();
  const { department } = useValues();

  const workOrder = modalState.getPayload<DotWorkOrder | null>(ModalIds.ManageDotWorkOrder);
  const isEditing = Boolean(workOrder);

  function handleClose() {
    modalState.closeModal(ModalIds.ManageDotWorkOrder);
  }

  const validate = handleValidate(CREATE_DOT_WORK_ORDER_SCHEMA);
  const INITIAL_VALUES = {
    title: workOrder?.title ?? "",
    description: workOrder?.description ?? "",
    location: workOrder?.location ?? "",
    postal: workOrder?.postal ?? "",
    priority: workOrder?.priority ?? "MEDIUM",
    departmentId: workOrder?.departmentId ?? "",
  };

  async function onSubmit(values: typeof INITIAL_VALUES) {
    if (isEditing && workOrder) {
      const { json } = await execute<PutDotWorkOrderByIdData>({
        path: `/dot/work-orders/${workOrder.id}`,
        method: "PUT",
        data: { ...values, departmentId: values.departmentId || null },
      });

      if (json.id) {
        onUpdate?.(json);
        handleClose();
      }
      return;
    }

    const { json } = await execute<PostDotWorkOrdersData>({
      path: "/dot/work-orders",
      method: "POST",
      data: { ...values, departmentId: values.departmentId || null },
    });

    if (json.id) {
      onCreate?.(json);
      handleClose();
    }
  }

  return (
    <Modal
      isOpen={modalState.isOpen(ModalIds.ManageDotWorkOrder)}
      onClose={handleClose}
      title={isEditing ? t("editWorkOrder") : t("createWorkOrder")}
      className="w-[600px]"
    >
      <Formik validate={validate} onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ handleChange, setFieldValue, values, errors }) => (
          <Form>
            <TextField
              errorMessage={errors.title}
              label={t("workOrderTitle")}
              name="title"
              onChange={(value) => setFieldValue("title", value)}
              value={values.title}
              placeholder={t("workOrderTitlePlaceholder")}
            />

            <FormRow>
              <TextField
                errorMessage={errors.location}
                label={t("workOrderLocation")}
                name="location"
                onChange={(value) => setFieldValue("location", value)}
                value={values.location}
              />

              <TextField
                isOptional
                errorMessage={errors.postal}
                label={t("workOrderPostal")}
                name="postal"
                onChange={(value) => setFieldValue("postal", value)}
                value={values.postal}
              />
            </FormRow>

            <FormField label={t("workOrderPriority")}>
              <Select
                name="priority"
                onChange={handleChange}
                value={values.priority}
                values={PRIORITY_OPTIONS.map((priority) => ({
                  label: t(`priority_${priority}`),
                  value: priority,
                }))}
              />
            </FormField>

            <FormField optional label={t("workOrderDepartment")}>
              <Select
                isClearable
                name="departmentId"
                onChange={handleChange}
                value={values.departmentId}
                values={department.values
                  .filter((v) => v.type === "DOT")
                  .map((v) => ({ label: v.value.value, value: v.id }))}
              />
            </FormField>

            <TextField
              isOptional
              isTextarea
              errorMessage={errors.description}
              label={t("workOrderDescription")}
              name="description"
              onChange={(value) => setFieldValue("description", value)}
              value={values.description}
            />

            <footer className="flex mt-5 justify-end">
              <div className="flex">
                <Button onPress={handleClose} type="button" variant="cancel">
                  {common("cancel")}
                </Button>
                <Button className="flex items-center ml-2" type="submit">
                  {state === "loading" ? <Loader className="mr-2 border-red-200" /> : null}
                  {isEditing ? common("save") : common("create")}
                </Button>
              </div>
            </footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
