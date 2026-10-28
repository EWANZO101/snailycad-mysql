import { type Prisma, ShouldDoType, type User } from "@prisma/client";
import { defaultPermissions, hasPermission } from "@snailycad/permissions";
import type { Req, Context } from "@tsed/common";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { combinedDotUnitProperties, dotWorkerProperties } from "utils/leo/includes";
import { getInactivityFilter } from "./leo/utils";
import { prisma } from "./data/prisma";

interface GetActiveDotWorkerOptions {
  ctx: Context;
  user: Pick<User, "rank" | "id" | "permissions">;
  req?: Req;
}

export async function getActiveDotWorker(options: GetActiveDotWorkerOptions) {
  // dispatch is allowed to use dot routes
  let isDispatch = false;
  const isAdmin = hasPermission({
    userToCheck: options.user,
    permissionsToCheck: defaultPermissions.allDefaultAdminPermissions,
  });

  if (options.req?.headers["is-from-dispatch"]?.toString() === "true") {
    const hasDispatchPermissions = hasPermission({
      userToCheck: options.user,
      permissionsToCheck: defaultPermissions.defaultDispatchPermissions,
    });

    if (isAdmin && !hasDispatchPermissions) {
      isDispatch = true;
    }

    if (!hasDispatchPermissions) {
      throw new Forbidden("Must be dispatch to use this header.");
    } else {
      isDispatch = true;
    }
  } else {
    const hasDotPermissions = hasPermission({
      userToCheck: options.user,
      permissionsToCheck: defaultPermissions.defaultDotPermissions,
    });

    if (isAdmin && !hasDotPermissions) {
      isDispatch = true;
    }

    if (!hasDotPermissions) {
      throw new Forbidden("Invalid Permissions");
    }
  }

  if (isDispatch) {
    return null;
  }

  const combinedUnit = await prisma.combinedDotUnit.findFirst({
    where: {
      NOT: { status: { shouldDo: "SET_OFF_DUTY" } },
      workers: { some: { userId: options.user.id } },
    },
    include: combinedDotUnitProperties,
  });

  const cad = await prisma.cad.findFirst({ include: { miscCadSettings: true } });
  const unitsInactivityFilter = getInactivityFilter(cad!, "unitInactivityTimeout");

  const filters: Prisma.Enumerable<Prisma.DotWorkerWhereInput> = [
    { status: { shouldDo: ShouldDoType.SET_OFF_DUTY } },
    { status: { is: null } },
  ];

  if (unitsInactivityFilter) {
    filters.push({
      updatedAt: { lte: unitsInactivityFilter.updatedAt },
    });
  }

  const dotWorker = await prisma.dotWorker.findFirst({
    where: {
      userId: options.user.id,
      NOT: { OR: filters },
    },
    include: dotWorkerProperties,
  });

  const activeDotWorkerOrCombinedUnit = combinedUnit ?? dotWorker;

  if (!activeDotWorkerOrCombinedUnit) {
    options.ctx.delete("activeDotWorker");
    throw new BadRequest("noActiveDotWorker");
  }

  return activeDotWorkerOrCombinedUnit;
}
