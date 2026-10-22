import { Controller } from "@tsed/di";
import { UseBeforeEach } from "@tsed/platform-middlewares";
import { BodyParams, Context } from "@tsed/platform-params";
import { ContentType, Description, Post, Tags } from "@tsed/schema";
import { BadRequest } from "@tsed/exceptions";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { validateSchema } from "lib/data/validate-schema";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";
import { AuditLogActionType, createAuditLogEntry } from "@snailycad/audit-logger/server";

const PREVIEW_LIMIT = 100;
const EXPORT_LIMIT = 10_000;
const DELETE_BATCH_SIZE = 250;

const dateString = z
  .string()
  .nullish()
  .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), { message: "invalidDate" });

const PRUNE_CITIZENS_FILTERS_SCHEMA = z.object({
  noUser: z.boolean().nullish(),
  createdBefore: dateString,
  ownerInactiveSince: dateString,
  noRecords: z.boolean().nullish(),
  nameContains: z.string().max(255).nullish(),
});

const PRUNE_CITIZENS_SCHEMA = z.object({
  filters: PRUNE_CITIZENS_FILTERS_SCHEMA,
  /** must be the word `DELETE` or the exact amount of citizens that will be deleted */
  confirm: z.string().min(1).max(255),
});

type PruneCitizensFilters = z.infer<typeof PRUNE_CITIZENS_FILTERS_SCHEMA>;

/**
 * builds the `where` input from the given filters. All filters are combined (AND).
 * Throws when no filter is set, this prevents accidentally deleting every citizen.
 *
 * Citizens that are linked to a LEO or EMS/FD unit are always excluded, since deleting them would
 * also delete those units.
 */
function createPruneWhere(filters: PruneCitizensFilters): Prisma.CitizenWhereInput {
  const AND: Prisma.CitizenWhereInput[] = [];

  if (filters.noUser) {
    AND.push({ userId: null });
  }

  if (filters.createdBefore) {
    AND.push({ createdAt: { lt: new Date(filters.createdBefore) } });
  }

  if (filters.ownerInactiveSince) {
    AND.push({ user: { lastSeen: { lt: new Date(filters.ownerInactiveSince) } } });
  }

  if (filters.noRecords) {
    AND.push({ Record: { none: {} } }, { warrants: { none: {} } });
  }

  const nameContains = filters.nameContains?.trim();
  if (nameContains) {
    const [name, surname] = nameContains.split(/ +/g);

    AND.push(
      surname
        ? {
            name: { contains: name },
            surname: { contains: surname },
          }
        : {
            OR: [{ name: { contains: name } }, { surname: { contains: name } }],
          },
    );
  }

  if (AND.length <= 0) {
    throw new ExtendedBadRequest({ filters: "atLeastOnePruneFilterRequired" });
  }

  AND.push({ officers: { none: {} } }, { emsFdDeputies: { none: {} } });

  return { AND };
}

const previewSelect = {
  id: true,
  name: true,
  surname: true,
  dateOfBirth: true,
  socialSecurityNumber: true,
  createdAt: true,
  user: { select: { id: true, username: true, lastSeen: true } },
  _count: { select: { Record: true, warrants: true } },
} satisfies Prisma.CitizenSelect;

function filtersSummary(filters: PruneCitizensFilters) {
  return Object.entries(filters)
    .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false)
    .map(([key, value]) => `${key}: ${String(value)}`);
}

@UseBeforeEach(IsAuth)
@Tags("Admin: Manage")
@Controller("/admin/manage/citizens/prune")
@ContentType("application/json")
export class AdminPruneCitizensController {
  @Post("/preview")
  @Description("Preview the citizens that would be deleted (total count + the first 100 matches)")
  @UsePermissions({ permissions: [Permissions.DeleteCitizens] })
  async previewPrune(@BodyParams() body: unknown) {
    const filters = validateSchema(PRUNE_CITIZENS_FILTERS_SCHEMA, body);
    const where = createPruneWhere(filters);

    const [totalCount, citizens] = await prisma.$transaction([
      prisma.citizen.count({ where }),
      prisma.citizen.findMany({
        where,
        select: previewSelect,
        orderBy: { createdAt: "asc" },
        take: PREVIEW_LIMIT,
      }),
    ]);

    return { totalCount, citizens };
  }

  @Post("/export")
  @Description("Get all citizens that would be deleted (max 10 000), used for the CSV export")
  @UsePermissions({ permissions: [Permissions.DeleteCitizens] })
  async exportPrune(@BodyParams() body: unknown) {
    const filters = validateSchema(PRUNE_CITIZENS_FILTERS_SCHEMA, body);
    const where = createPruneWhere(filters);

    const [totalCount, citizens] = await prisma.$transaction([
      prisma.citizen.count({ where }),
      prisma.citizen.findMany({
        where,
        select: previewSelect,
        orderBy: { createdAt: "asc" },
        take: EXPORT_LIMIT,
      }),
    ]);

    return { totalCount, citizens };
  }

  @Post("/")
  @Description("Delete all citizens matching the filters, requires an explicit confirmation")
  @UsePermissions({ permissions: [Permissions.DeleteCitizens] })
  async pruneCitizens(
    @Context("sessionUserId") sessionUserId: string,
    @BodyParams() body: unknown,
  ) {
    const data = validateSchema(PRUNE_CITIZENS_SCHEMA, body);
    const where = createPruneWhere(data.filters);

    const totalCount = await prisma.citizen.count({ where });
    const confirm = data.confirm.trim();

    if (confirm !== "DELETE" && confirm !== String(totalCount)) {
      throw new BadRequest("pruneConfirmationMismatch");
    }

    let deletedCount = 0;
    // safety net, the loop should never run more often than this
    const maxIterations = Math.ceil(totalCount / DELETE_BATCH_SIZE) + 1;

    for (let i = 0; i < maxIterations; i++) {
      const batch = await prisma.citizen.findMany({
        where,
        select: { id: true },
        take: DELETE_BATCH_SIZE,
      });
      if (batch.length <= 0) break;

      const ids = batch.map((citizen) => citizen.id);

      const [, , deleted] = await prisma.$transaction([
        // pet medical records don't cascade on delete
        prisma.petMedicalRecord.deleteMany({ where: { pet: { citizenId: { in: ids } } } }),
        prisma.pet.deleteMany({ where: { citizenId: { in: ids } } }),
        prisma.citizen.deleteMany({ where: { AND: [where, { id: { in: ids } }] } }),
      ]);

      deletedCount += deleted.count;
    }

    await createAuditLogEntry({
      translationKey: "citizensPruned",
      action: {
        type: AuditLogActionType.CitizensPruned,
        new: [`deleted: ${deletedCount}`, ...filtersSummary(data.filters)],
      },
      prisma,
      executorId: sessionUserId,
    });

    return { count: deletedCount };
  }
}
