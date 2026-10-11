import { type Prisma, ValueType } from "@prisma/client";
import { GET_VALUES } from "controllers/admin/values/values-controller";
import { getTypeFromPath } from "./utils";

interface CreateSearchWhereObjectOptions {
  path: string;
  query: string;
  showDisabled?: boolean;
  queryParams: Partial<Record<string, string>>;
}

export function createSearchWhereObject(options: CreateSearchWhereObjectOptions) {
  const type = getTypeFromPath(options.path);
  const data = GET_VALUES[type];
  const showDisabled = options.showDisabled ?? true;

  if (type === "PENAL_CODE") {
    const groupId = options.queryParams.groupId;

    const where: Prisma.PenalCodeWhereInput = {
      OR: [
        { title: { contains: options.query } },
        { description: { contains: options.query } },
        { group: { name: { contains: options.query } } },
      ],
      AND: groupId
        ? groupId === "ungrouped"
          ? [{ groupId: { equals: null } }]
          : [{ groupId }]
        : [],
    };

    return where;
  }

  if (data) {
    let where: any = {
      value: {
        isDisabled: showDisabled ? undefined : false,
        value: { contains: options.query },
      },
    };

    if (ValueType.BUSINESS_ROLE === type) {
      where = {
        ...where,
        businesses: {
          // hide roles created by other businesses
          every: { id: "null" },
        },
      };
    }

    if (ValueType.EMERGENCY_VEHICLE === type) {
      const divisionIds = String(options.queryParams.divisions).split(",");

      const whereAND = [
        { value: { isDisabled: showDisabled ? undefined : false } },
        { value: { value: { contains: options.query } } },
      ] as any[];

      if (options.queryParams.department) {
        whereAND.push({ departments: { some: { id: options.queryParams.department } } });
      }

      if (options.queryParams.divisions) {
        whereAND.push(...divisionIds.map((id) => ({ divisions: { some: { id } } })));
      }

      where = {
        AND: whereAND,
      };
    }

    if (ValueType.ADDRESS === type) {
      where = {
        OR: [
          { value: { value: { contains: options.query } } },
          { county: { contains: options.query } },
          { postal: { contains: options.query } },
        ],
        AND: [{ value: { isDisabled: showDisabled ? undefined : false } }],
      };
    }

    return where;
  }

  return {
    type,
    isDisabled: showDisabled ? undefined : false,
    value: { contains: options.query },
  };
}
