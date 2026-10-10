import { Button } from "@snailycad/ui";
import { useDownload } from "@casperiv/useful";
import type { PenalCode, PenalCodeGroup } from "@snailycad/types";
import format from "date-fns/format";
import useFetch from "lib/useFetch";
import { useTranslations } from "use-intl";

interface Props {
  /**
   * `undefined` exports every penal code, `"ungrouped"` only exports the penal codes without a group,
   * any other value only exports the penal codes of that group.
   */
  groupId?: string;
  /** used for the filename */
  groupName?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * Exports penal codes as JSON in the exact format `POST /admin/values/import/penal_code` accepts.
 * See `sh/docs/PENAL-CODE-SHARING.md`.
 */
export function ExportPenalCodesButton({ groupId, groupName, size, className }: Props) {
  const t = useTranslations("Values");
  const download = useDownload();
  const { state, execute } = useFetch();

  async function handleExport() {
    const { json } = await execute<PenalCode[]>({
      path: "/admin/values/penal_code/export",
    });

    if (!Array.isArray(json)) return;

    const penalCodes = json.filter((penalCode) => {
      if (!groupId) return true;
      if (groupId === "ungrouped") return !penalCode.groupId;
      return penalCode.groupId === groupId;
    });

    const date = format(Date.now(), "yyyy-MM-dd-HH-mm-ss");
    const slug = (groupName ?? groupId ?? "all")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    download({
      filename: `penal_codes_${slug || "group"}_${date}.json`,
      data: JSON.stringify(penalCodes.map(toImportablePenalCode), null, 2),
    });
  }

  return (
    <Button
      size={size}
      className={className}
      disabled={state === "loading"}
      onPress={handleExport}
      type="button"
    >
      {t("exportJson")}
    </Button>
  );
}

type PenalCodeWithGroup = PenalCode & { group?: PenalCodeGroup | null };

export function toImportablePenalCode(penalCode: PenalCodeWithGroup) {
  const group = penalCode.group
    ? { id: penalCode.group.id, name: penalCode.group.name, position: penalCode.group.position }
    : null;

  return {
    title: penalCode.title,
    description: penalCode.description ?? null,
    descriptionData: penalCode.descriptionData ?? null,
    type: penalCode.type ?? null,
    isPrimary: penalCode.isPrimary,
    groupId: penalCode.groupId ?? null,
    group,
    warningApplicable: Boolean(penalCode.warningApplicable),
    warningNotApplicable: Boolean(penalCode.warningNotApplicable),
    warningFines: penalCode.warningApplicable?.fines ?? [],
    warningNotFines: penalCode.warningNotApplicable?.fines ?? [],
    prisonTerm: penalCode.warningNotApplicable?.prisonTerm ?? [],
    bail: penalCode.warningNotApplicable?.bail ?? [],
  };
}
