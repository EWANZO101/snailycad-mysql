import type { PenalCode, PenalCodeGroup } from "@snailycad/types";

export const UNGROUPED_PENAL_CODE_GROUP_ID = "ungrouped";

type PenalCodeWithGroup = PenalCode & { group?: PenalCodeGroup | null };

export interface GroupedPenalCodes<T extends PenalCode = PenalCode> {
  id: string;
  name: string;
  position: number | null;
  penalCodes: T[];
}

interface Options {
  /** label used for penal codes without a group */
  ungroupedName: string;
  /** groups known to the CAD, used for the name/position when a penal code does not include its group. */
  groups?: PenalCodeGroup[];
}

function compareTitles(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Groups penal codes by their group. Groups are sorted by position, then name.
 * Penal codes inside a group are sorted by title (natural sort, so "2" comes before "10").
 * Penal codes without a group are always last.
 */
export function groupPenalCodes<T extends PenalCodeWithGroup>(
  penalCodes: T[],
  options: Options,
): GroupedPenalCodes<T>[] {
  const knownGroups = new Map((options.groups ?? []).map((group) => [group.id, group]));
  const groups = new Map<string, GroupedPenalCodes<T>>();

  for (const penalCode of penalCodes) {
    const groupId = penalCode.groupId ?? UNGROUPED_PENAL_CODE_GROUP_ID;
    let group = groups.get(groupId);

    if (!group) {
      const groupData = penalCode.group ?? knownGroups.get(groupId) ?? null;

      group = {
        id: groupId,
        name:
          groupId === UNGROUPED_PENAL_CODE_GROUP_ID
            ? options.ungroupedName
            : (groupData?.name ?? options.ungroupedName),
        position: groupData?.position ?? null,
        penalCodes: [],
      };
      groups.set(groupId, group);
    }

    group.penalCodes.push(penalCode);
  }

  for (const group of groups.values()) {
    group.penalCodes.sort((a, b) => compareTitles(a.title, b.title));
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.id === UNGROUPED_PENAL_CODE_GROUP_ID) return 1;
    if (b.id === UNGROUPED_PENAL_CODE_GROUP_ID) return -1;

    const positionA = a.position ?? Number.MAX_SAFE_INTEGER;
    const positionB = b.position ?? Number.MAX_SAFE_INTEGER;
    if (positionA !== positionB) return positionA - positionB;

    return compareTitles(a.name, b.name);
  });
}

/** case-insensitive match on the title and the plain-text description of a penal code */
export function penalCodeMatchesSearch(penalCode: PenalCode, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  if (penalCode.title.toLowerCase().includes(query)) return true;
  return Boolean(penalCode.description?.toLowerCase().includes(query));
}
