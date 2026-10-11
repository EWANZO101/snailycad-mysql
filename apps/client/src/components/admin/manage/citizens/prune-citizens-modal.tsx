import * as React from "react";
import { useTranslations } from "use-intl";
import { Button, FullDate, Loader, SwitchField, TextField } from "@snailycad/ui";
import { Modal } from "components/modal/Modal";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import useFetch from "lib/useFetch";
import { toastMessage } from "lib/toastMessage";

interface PruneCitizensFilters {
  noUser: boolean;
  createdBefore: string;
  ownerInactiveSince: string;
  noRecords: boolean;
  nameContains: string;
}

interface PrunePreviewCitizen {
  id: string;
  name: string;
  surname: string;
  dateOfBirth: Date | string;
  socialSecurityNumber: string | null;
  createdAt: Date | string;
  user: { id: string; username: string; lastSeen: Date | string } | null;
  _count: { Record: number; warrants: number };
}

interface PrunePreviewData {
  totalCount: number;
  citizens: PrunePreviewCitizen[];
}

const INITIAL_FILTERS: PruneCitizensFilters = {
  noUser: false,
  createdBefore: "",
  ownerInactiveSince: "",
  noRecords: false,
  nameContains: "",
};

interface Props {
  onPruned?(count: number): void;
}

function makeFiltersBody(filters: PruneCitizensFilters) {
  return {
    noUser: filters.noUser || null,
    createdBefore: filters.createdBefore ? new Date(filters.createdBefore).toISOString() : null,
    ownerInactiveSince: filters.ownerInactiveSince
      ? new Date(filters.ownerInactiveSince).toISOString()
      : null,
    noRecords: filters.noRecords || null,
    nameContains: filters.nameContains.trim() || null,
  };
}

function csvEscape(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  // eslint-disable-next-line quotes
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function PruneCitizensModal({ onPruned }: Props) {
  const modalState = useModal();
  const t = useTranslations("PruneCitizens");
  const common = useTranslations("Common");

  const [filters, setFilters] = React.useState<PruneCitizensFilters>(INITIAL_FILTERS);
  const [preview, setPreview] = React.useState<PrunePreviewData | null>(null);
  const [previewFilters, setPreviewFilters] = React.useState<PruneCitizensFilters | null>(null);
  const [confirm, setConfirm] = React.useState("");
  const { state, execute } = useFetch();

  const hasFilter = Boolean(
    filters.noUser ||
      filters.createdBefore ||
      filters.ownerInactiveSince ||
      filters.noRecords ||
      filters.nameContains.trim(),
  );
  // the preview must match the current filters, otherwise the user must preview again.
  const currentPreview =
    preview && JSON.stringify(previewFilters) === JSON.stringify(filters) ? preview : null;
  const isConfirmed =
    currentPreview !== null &&
    currentPreview.totalCount > 0 &&
    (confirm.trim() === "DELETE" || confirm.trim() === String(currentPreview.totalCount));

  function setFilter<K extends keyof PruneCitizensFilters>(key: K, value: PruneCitizensFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setConfirm("");
  }

  function handleClose() {
    modalState.closeModal(ModalIds.PruneCitizens);
    setPreview(null);
    setPreviewFilters(null);
    setConfirm("");
    setFilters(INITIAL_FILTERS);
  }

  async function handlePreview() {
    const { json } = await execute<PrunePreviewData>({
      path: "/admin/manage/citizens/prune/preview",
      method: "POST",
      data: makeFiltersBody(filters),
    });

    if (Array.isArray(json.citizens)) {
      setPreview(json);
      setPreviewFilters(filters);
      setConfirm("");
    }
  }

  async function handleExport() {
    const { json } = await execute<PrunePreviewData>({
      path: "/admin/manage/citizens/prune/export",
      method: "POST",
      data: makeFiltersBody(filters),
    });

    if (!Array.isArray(json.citizens)) return;

    const header = [
      "id",
      "name",
      "surname",
      "dateOfBirth",
      "socialSecurityNumber",
      "createdAt",
      "username",
      "userLastSeen",
      "records",
      "warrants",
    ];
    const rows = json.citizens.map((citizen) =>
      [
        citizen.id,
        citizen.name,
        citizen.surname,
        toDateString(citizen.dateOfBirth),
        citizen.socialSecurityNumber,
        toDateString(citizen.createdAt),
        citizen.user?.username,
        toDateString(citizen.user?.lastSeen),
        citizen._count.Record,
        citizen._count.warrants,
      ]
        .map(csvEscape)
        .join(","),
    );

    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `citizens-prune-preview-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!isConfirmed || !previewFilters) return;

    const { json } = await execute<{ count: number }>({
      path: "/admin/manage/citizens/prune",
      method: "POST",
      data: { filters: makeFiltersBody(previewFilters), confirm: confirm.trim() },
    });

    if (typeof json.count === "number") {
      toastMessage({
        icon: "success",
        title: common("success"),
        message: t("prunedMessage", { count: json.count }),
      });
      onPruned?.(json.count);
      handleClose();
    }
  }

  return (
    <Modal
      className="w-[1000px]"
      title={t("pruneCitizens")}
      onClose={handleClose}
      isOpen={modalState.isOpen(ModalIds.PruneCitizens)}
    >
      <p className="mb-3 text-neutral-700 dark:text-gray-400">{t("pruneCitizensInfo")}</p>

      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <TextField
          label={t("nameContains")}
          name="nameContains"
          value={filters.nameContains}
          onChange={(value) => setFilter("nameContains", value)}
          placeholder="John Doe"
        />
        <TextField
          type="date"
          label={t("createdBefore")}
          name="createdBefore"
          value={filters.createdBefore}
          onChange={(value) => setFilter("createdBefore", value)}
        />
        <TextField
          type="date"
          label={t("ownerInactiveSince")}
          name="ownerInactiveSince"
          value={filters.ownerInactiveSince}
          onChange={(value) => setFilter("ownerInactiveSince", value)}
        >
          <span className="text-sm text-neutral-600 dark:text-gray-400">
            {t("ownerInactiveSinceInfo")}
          </span>
        </TextField>
        <div className="flex flex-col gap-3 mt-3">
          <SwitchField isSelected={filters.noUser} onChange={(value) => setFilter("noUser", value)}>
            {t("noUser")}
          </SwitchField>
          <SwitchField
            isSelected={filters.noRecords}
            onChange={(value) => setFilter("noRecords", value)}
          >
            {t("noRecords")}
          </SwitchField>
        </div>
      </div>

      <p className="mt-3 text-sm text-neutral-600 dark:text-gray-400">{t("unitsExcluded")}</p>

      <div className="flex items-center gap-2 mt-3">
        <Button
          onPress={handlePreview}
          isDisabled={!hasFilter || state === "loading"}
          className="flex items-center gap-2"
        >
          {state === "loading" ? <Loader /> : null}
          {t("preview")}
        </Button>
        {currentPreview && currentPreview.totalCount > 0 ? (
          <Button onPress={handleExport} isDisabled={state === "loading"}>
            {t("exportCsv")}
          </Button>
        ) : null}
      </div>

      {preview && !currentPreview ? (
        <p className="mt-3 font-semibold text-amber-600 dark:text-amber-400">
          {t("filtersChanged")}
        </p>
      ) : null}

      {currentPreview ? (
        <section className="mt-4">
          <p className="font-semibold">
            {currentPreview.totalCount <= 0
              ? t("noMatches")
              : t("previewInfo", {
                  count: currentPreview.totalCount,
                  shown: currentPreview.citizens.length,
                })}
          </p>

          {currentPreview.citizens.length > 0 ? (
            <div className="mt-2 overflow-x-auto max-h-80 thin-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-quinary">
                    <th className="p-2">{t("citizen")}</th>
                    <th className="p-2">{t("createdAt")}</th>
                    <th className="p-2">{t("user")}</th>
                    <th className="p-2">{t("lastSeen")}</th>
                    <th className="p-2">{t("records")}</th>
                    <th className="p-2">{t("warrants")}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPreview.citizens.map((citizen) => (
                    <tr key={citizen.id} className="border-b border-gray-200 dark:border-secondary">
                      <td className="p-2">
                        {citizen.name} {citizen.surname}
                      </td>
                      <td className="p-2">
                        <FullDate onlyDate>{citizen.createdAt}</FullDate>
                      </td>
                      <td className="p-2">{citizen.user?.username ?? common("none")}</td>
                      <td className="p-2">
                        {citizen.user ? (
                          <FullDate onlyDate>{citizen.user.lastSeen}</FullDate>
                        ) : (
                          common("none")
                        )}
                      </td>
                      <td className="p-2">{citizen._count.Record}</td>
                      <td className="p-2">{citizen._count.warrants}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {currentPreview.totalCount > 0 ? (
            <div className="mt-4">
              <TextField
                label={t.rich("confirmLabel", {
                  count: currentPreview.totalCount,
                  b: (children) => <b>{children}</b>,
                })}
                name="prune-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="flex justify-end gap-2 mt-5">
        <Button variant="cancel" onPress={handleClose}>
          {common("cancel")}
        </Button>
        <Button
          variant="danger"
          isDisabled={!isConfirmed || state === "loading"}
          onPress={handleDelete}
        >
          {t("deleteCitizens", { count: currentPreview?.totalCount ?? 0 })}
        </Button>
      </footer>
    </Modal>
  );
}
