import { Prisma } from "@prisma/client";
import { WhitelistStatus } from "@snailycad/types";

type UnitWhereInputFor<Type extends "OFFICER" | "DEPUTY" | "DOT_WORKER"> = Type extends "OFFICER"
  ? Prisma.OfficerWhereInput
  : Type extends "DEPUTY"
    ? Prisma.EmsFdDeputyWhereInput
    : Prisma.DotWorkerWhereInput;

interface CreateWhereObjOptions<Type extends "OFFICER" | "DEPUTY" | "DOT_WORKER"> {
  departmentId?: string;
  query: string;
  pendingOnly: boolean;
  type: Type;
  extraWhere?: UnitWhereInputFor<Type>;
}

export function createWhereCombinedUnit<Type extends "OFFICER" | "DEPUTY" | "DOT_WORKER">(
  options: CreateWhereObjOptions<Type>,
) {
  const fieldName =
    options.type === "OFFICER" ? "officers" : options.type === "DEPUTY" ? "deputies" : "workers";

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
  extraWhere = {} as UnitWhereInputFor<Type>,
}: CreateWhereObjOptions<Type>): UnitWhereInputFor<Type> {
  const [name, surname] = getName(query);

  const departmentIdWhere = departmentId ? { departmentId } : {};

  if (!query) {
    return (
      pendingOnly
        ? {
            ...extraWhere,
            whitelistStatus: { status: WhitelistStatus.PENDING },
            ...departmentIdWhere,
          }
        : { ...extraWhere, ...departmentIdWhere }
    ) as UnitWhereInputFor<Type>;
  }

  const where = {
    ...(pendingOnly ? { whitelistStatus: { status: WhitelistStatus.PENDING } } : {}),
    ...extraWhere,
    OR: [
      departmentIdWhere,
      { id: query },
      { callsign: query },
      { callsign2: query },
      { department: { value: { value: { contains: query, mode: "insensitive" } } } },
      { status: { value: { value: { contains: query, mode: "insensitive" } } } },
      {
        citizen: {
          OR: [
            {
              name: { contains: name, mode: "insensitive" },
              surname: { contains: surname, mode: "insensitive" },
            },
            {
              name: { contains: name, mode: "insensitive" },
              surname: { contains: surname, mode: "insensitive" },
            },
          ],
        },
      },
      { user: { username: { contains: query, mode: Prisma.QueryMode.insensitive } } },
      type === "OFFICER"
        ? {
            divisions: { some: { value: { value: { contains: query, mode: "insensitive" } } } },
          }
        : {},
    ],
    // the shape above is valid for all three unit types; Prisma's generated where-input types
    // are too strict to express that without duplicating this function per unit type.
  } as UnitWhereInputFor<Type>;

  return where;
}

function getName(query: string) {
  try {
    return query.toString().toLowerCase().split(/ +/g);
  } catch {
    return [];
  }
}
