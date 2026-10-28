import { type Prisma } from "@prisma/client";
import { WhitelistStatus } from "@snailycad/types";
import { insensitive } from "lib/data/db-provider";

interface CreateWhereObjOptions<Type extends "OFFICER" | "DEPUTY" | "DOT_WORKER"> {
  departmentId?: string;
  query: string;
  pendingOnly: boolean;
  type: Type;
  // kept as a loose union (rather than a `Type extends ...` conditional) since a 3-way
  // conditional here doesn't distribute cleanly through `createWhere`'s own generic `Type`
  extraWhere?: Prisma.OfficerWhereInput | Prisma.EmsFdDeputyWhereInput | Prisma.DotWorkerWhereInput;
}

export function createWhereCombinedUnit<Type extends "OFFICER" | "DEPUTY">(
  options: CreateWhereObjOptions<Type>,
) {
  const fieldName = options.type === "OFFICER" ? "officers" : "deputies";

  return {
    OR: [
      {
        [fieldName]: {
          some: createWhere({ ...options }),
        },
      },
    ],
  };
}

export function createWhere<Type extends "OFFICER" | "DEPUTY" | "DOT_WORKER">({
  query,
  pendingOnly,
  departmentId,
  type,
  extraWhere = {},
}: CreateWhereObjOptions<Type>) {
  const [name, surname] = getName(query);

  const departmentIdWhere = departmentId ? { departmentId } : {};

  if (!query) {
    return pendingOnly
      ? {
          ...extraWhere,
          whitelistStatus: { status: WhitelistStatus.PENDING },
          ...departmentIdWhere,
        }
      : { ...extraWhere, ...departmentIdWhere };
  }

  const where = {
    ...(pendingOnly ? { whitelistStatus: { status: WhitelistStatus.PENDING } } : {}),
    ...extraWhere,
    OR: [
      departmentIdWhere,
      { id: query },
      { callsign: query },
      { callsign2: query },
      { department: { value: { value: { contains: query, ...insensitive() } } } },
      { status: { value: { value: { contains: query, ...insensitive() } } } },
      {
        citizen: {
          OR: [
            {
              name: { contains: name, ...insensitive() },
              surname: { contains: surname, ...insensitive() },
            },
            {
              name: { contains: name, ...insensitive() },
              surname: { contains: surname, ...insensitive() },
            },
          ],
        },
      },
      { user: { username: { contains: query } } },
      type === "OFFICER"
        ? {
            divisions: { some: { value: { value: { contains: query, ...insensitive() } } } },
          }
        : {},
    ],
  };

  // the shape above is a valid where-input for all three unit types; the exact type just
  // isn't resolvable through `Type`'s own conditional here (see the comment on `extraWhere`)

  return where as any;
}

function getName(query: string) {
  try {
    return query.toString().toLowerCase().split(/ +/g);
  } catch {
    return [];
  }
}
