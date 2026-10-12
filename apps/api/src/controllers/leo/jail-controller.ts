import { Context, Controller, UseBeforeEach } from "@tsed/common";
import { ContentType, Delete, Description, Get } from "@tsed/schema";
import { QueryParams, BodyParams, PathParams } from "@tsed/platform-params";
import { NotFound } from "@tsed/exceptions";
import { prisma } from "lib/data/prisma";
import { ident, isPostgres } from "lib/data/db-provider";
import { IsAuth } from "middlewares/auth/is-auth";
import { leoProperties } from "utils/leo/includes";
import type { z } from "zod";
import {
  type MiscCadSettings,
  ReleaseType,
  Prisma,
  PublishStatus,
  RecordType,
} from "@prisma/client";
import { validateSchema } from "lib/data/validate-schema";
import { RELEASE_CITIZEN_SCHEMA } from "@snailycad/schemas";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";
import { Permissions, UsePermissions } from "middlewares/use-permissions";
import { syncCitizensArrestedStatus, updateCitizensJailStatus } from "lib/leo/jail";
import { getFirstOrderBy } from "utils/order-by";
import type * as APITypes from "@snailycad/types/api";

const citizenInclude = {
  Record: {
    where: { type: RecordType.ARREST_REPORT, publishStatus: PublishStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    include: {
      release: {
        include: {
          releasedBy: true,
        },
      },
      officer: {
        include: leoProperties,
      },
      violations: {
        include: {
          penalCode: { include: { warningApplicable: true, warningNotApplicable: true } },
        },
      },
    },
  },
} satisfies Prisma.CitizenInclude;

@Controller("/leo/jail")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class JailController {
  @Get("/")
  @Description("Get all the citizens who are jailed")
  @UsePermissions({
    permissions: [Permissions.ViewJail, Permissions.ManageJail],
  })
  async getImprisonedCitizens(
    @Context("cad") cad: { miscCadSettings: MiscCadSettings | null },
    @QueryParams("skip", Number) skip = 0,
    @QueryParams("includeAll", Boolean) includeAll = false,
    @QueryParams("activeOnly", Boolean) activeOnly = false,
    @QueryParams("query", String) query = "",
    @QueryParams("sorting", String) sorting = "",
  ): Promise<APITypes.GetJailedCitizensData> {
    // release citizens whose jail time has ended & fix stale `arrested` flags
    await updateCitizensJailStatus({
      jailTimeScale: cad.miscCadSettings?.jailTimeScale,
    }).catch(console.error);

    const q = ident;
    const conditions = [
      Prisma.sql`r.${q("type")} = 'ARREST_REPORT'`,
      Prisma.sql`r.${q("publishStatus")} = 'PUBLISHED'`,
    ];

    if (activeOnly) {
      conditions.push(Prisma.sql`r.${q("releaseId")} IS NULL`);
    }

    const search = query.trim();
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      // MySQL / MariaDB compare case-insensitively already; PostgreSQL needs ILIKE
      const op = isPostgres() ? Prisma.sql`ILIKE` : Prisma.sql`LIKE`;
      conditions.push(Prisma.sql`(
        CONCAT(c.${q("name")}, ' ', c.${q("surname")}) ${op} ${like}
        OR CONCAT(c.${q("surname")}, ' ', c.${q("name")}) ${op} ${like}
        OR c.${q("socialSecurityNumber")} = ${search}
      )`);
    }

    const where = Prisma.join(conditions, " AND ");
    const [sortKey, sortOrder] = getFirstOrderBy(sorting) ?? [];
    const direction = sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const orderBy =
      sortKey === "citizen"
        ? Prisma.sql`LOWER(c.${q("name")}) ${direction}, LOWER(c.${q("surname")}) ${direction}, c.${q("id")} ASC`
        : sortKey === "createdAt"
          ? Prisma.sql`MAX(r.${q("createdAt")}) ${direction}, c.${q("id")} ASC`
          : Prisma.sql`MAX(r.${q("createdAt")}) DESC, c.${q("id")} ASC`;

    const pagination = includeAll ? Prisma.empty : Prisma.sql`LIMIT 35 OFFSET ${skip}`;

    const [countResult, citizenIdsResult] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT c.${q("id")}) AS count
        FROM ${q("Citizen")} c
        INNER JOIN ${q("Record")} r ON r.${q("citizenId")} = c.${q("id")}
        WHERE ${where}
      `,
      prisma.$queryRaw<{ id: string }[]>`
        SELECT c.${q("id")} AS id
        FROM ${q("Citizen")} c
        INNER JOIN ${q("Record")} r ON r.${q("citizenId")} = c.${q("id")}
        WHERE ${where}
        GROUP BY c.${q("id")}
        ORDER BY ${orderBy}
        ${pagination}
      `,
    ]);

    const totalCount = Number(countResult[0]?.count ?? 0);
    const citizenIds = citizenIdsResult.map((v) => v.id);

    const citizens = await prisma.citizen.findMany({
      where: { id: { in: citizenIds } },
      include: citizenInclude,
    });

    const sortedCitizens = citizenIds
      .map((id) => citizens.find((citizen) => citizen.id === id))
      .filter(Boolean);

    return { totalCount, jailedCitizens: sortedCitizens as any };
  }

  @Delete("/:id")
  @Description("Release a citizen by its id and type (time out / released by)")
  @UsePermissions({
    permissions: [Permissions.ManageJail],
  })
  async releaseCitizen(
    @PathParams("id") id: string,
    @BodyParams() body: unknown,
  ): Promise<APITypes.DeleteReleaseJailedCitizenData> {
    const data = validateSchema(RELEASE_CITIZEN_SCHEMA, body);

    return this.handleReleaseCitizen(id, data) as any;
  }

  private async handleReleaseCitizen(
    citizenId: string,
    data: z.infer<typeof RELEASE_CITIZEN_SCHEMA>,
  ) {
    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId },
    });

    if (!citizen) {
      throw new NotFound("citizenNotFound");
    }

    const type = data.type as ReleaseType;
    if (!Object.values(ReleaseType).includes(type)) {
      throw new ExtendedBadRequest({ type: "Invalid release type" });
    }

    const releasedById = type === ReleaseType.BAIL_POSTED ? data.releasedById || null : null;

    const record = await prisma.record.findFirst({
      where: {
        id: data.recordId,
        citizenId: citizen.id,
        type: RecordType.ARREST_REPORT,
      },
    });

    if (!record) {
      throw new NotFound("recordNotFound");
    }

    if (record.releaseId) {
      // already released (e.g. automatically). Make sure the citizen's status is up-to-date.
      await syncCitizensArrestedStatus([citizen.id]);
      throw new ExtendedBadRequest({ releasedById: "citizenNotArrested" });
    }

    if (releasedById) {
      const releasedBy = await prisma.citizen.findUnique({ where: { id: releasedById } });
      if (!releasedBy) {
        throw new ExtendedBadRequest({ releasedById: "citizenNotFound" });
      }
    }

    await prisma.record.update({
      where: { id: record.id },
      data: {
        release: { create: { type, citizenId: releasedById } },
      },
    });

    // a citizen is only "arrested" while they have other active arrest reports
    await syncCitizensArrestedStatus([citizen.id]);

    return prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
      include: citizenInclude,
    });
  }
}
