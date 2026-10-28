import { Controller } from "@tsed/di";
import { UseBeforeEach } from "@tsed/platform-middlewares";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Put, Tags } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { type User, WhitelistStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { validateSchema } from "lib/data/validate-schema";
import { AuditLogActionType, createAuditLogEntry } from "@snailycad/audit-logger/server";

const REVIEW_CITIZEN_CLAIM_SCHEMA = z.object({
  type: z.enum([WhitelistStatus.ACCEPTED, WhitelistStatus.DECLINED]),
});

const userSelect = { select: { id: true, username: true } } as const;

const claimInclude = {
  citizen: {
    select: {
      id: true,
      name: true,
      surname: true,
      dateOfBirth: true,
      socialSecurityNumber: true,
      userId: true,
      createdAt: true,
    },
  },
  user: userSelect,
  reviewedBy: userSelect,
} as const;

@UseBeforeEach(IsAuth)
@Tags("Admin: Manage")
@Controller("/admin/manage/citizen-claims")
@ContentType("application/json")
export class AdminManageCitizenClaimsController {
  @Get("/")
  @Description("Get all citizen claim requests, filtered by status (defaults to PENDING)")
  @UsePermissions({
    permissions: [Permissions.ManageCitizenClaims, Permissions.ManageCitizens],
  })
  async getClaims(
    @QueryParams("status", String) status: string = WhitelistStatus.PENDING,
    @QueryParams("skip", Number) skip = 0,
    @QueryParams("includeAll", Boolean) includeAll = false,
  ) {
    const parsedStatus = Object.values(WhitelistStatus).includes(status as WhitelistStatus)
      ? (status as WhitelistStatus)
      : undefined;
    const where = parsedStatus ? { status: parsedStatus } : undefined;

    const [totalCount, claims] = await prisma.$transaction([
      prisma.citizenClaimRequest.count({ where }),
      prisma.citizenClaimRequest.findMany({
        where,
        include: claimInclude,
        orderBy: { createdAt: parsedStatus === WhitelistStatus.PENDING ? "asc" : "desc" },
        take: includeAll ? undefined : 35,
        skip: includeAll ? undefined : Number(skip),
      }),
    ]);

    return { totalCount, claims };
  }

  @Put("/:id")
  @Description("Accept or decline a citizen claim request")
  @UsePermissions({
    permissions: [Permissions.ManageCitizenClaims, Permissions.ManageCitizens],
  })
  async reviewClaim(
    @PathParams("id") id: string,
    @Context("user") sessionUser: User,
    @BodyParams() body: unknown,
  ) {
    const data = validateSchema(REVIEW_CITIZEN_CLAIM_SCHEMA, body);

    const claim = await prisma.citizenClaimRequest.findUnique({ where: { id } });
    if (!claim) {
      throw new NotFound("notFound");
    }

    if (claim.status !== WhitelistStatus.PENDING) {
      throw new BadRequest("citizenClaimAlreadyReviewed");
    }

    const reviewedAt = new Date();

    if (data.type === WhitelistStatus.DECLINED) {
      const updated = await prisma.citizenClaimRequest.updateMany({
        where: { id, status: WhitelistStatus.PENDING },
        data: { status: WhitelistStatus.DECLINED, reviewedById: sessionUser.id, reviewedAt },
      });

      if (updated.count <= 0) {
        throw new BadRequest("citizenClaimAlreadyReviewed");
      }

      return prisma.citizenClaimRequest.findUniqueOrThrow({
        where: { id },
        include: claimInclude,
      });
    }

    const previousCitizen = await prisma.citizen.findUnique({ where: { id: claim.citizenId } });
    if (!previousCitizen) {
      throw new NotFound("citizenNotFound");
    }

    await prisma.$transaction(async (tx) => {
      // mark the claim as accepted first, this makes sure the same claim cannot be processed twice
      const updatedClaim = await tx.citizenClaimRequest.updateMany({
        where: { id, status: WhitelistStatus.PENDING },
        data: { status: WhitelistStatus.ACCEPTED, reviewedById: sessionUser.id, reviewedAt },
      });

      if (updatedClaim.count <= 0) {
        throw new BadRequest("citizenClaimAlreadyReviewed");
      }

      // re-check (atomically) that the citizen is still unowned
      const updatedCitizen = await tx.citizen.updateMany({
        where: { id: claim.citizenId, userId: null },
        data: { userId: claim.userId },
      });

      if (updatedCitizen.count <= 0) {
        throw new BadRequest("citizenAlreadyClaimed");
      }

      // vehicles and weapons of the citizen that are not linked to a user are also transferred
      await tx.registeredVehicle.updateMany({
        where: { citizenId: claim.citizenId, userId: null },
        data: { userId: claim.userId },
      });
      await tx.weapon.updateMany({
        where: { citizenId: claim.citizenId, userId: null },
        data: { userId: claim.userId },
      });

      // decline all other pending claims for this citizen
      await tx.citizenClaimRequest.updateMany({
        where: {
          citizenId: claim.citizenId,
          status: WhitelistStatus.PENDING,
          NOT: { id: claim.id },
        },
        data: { status: WhitelistStatus.DECLINED, reviewedById: sessionUser.id, reviewedAt },
      });
    });

    const newCitizen = await prisma.citizen.findUnique({ where: { id: claim.citizenId } });
    if (newCitizen) {
      await createAuditLogEntry({
        action: {
          type: AuditLogActionType.CitizenUpdate,
          previous: previousCitizen,
          new: newCitizen,
        },
        prisma,
        executorId: sessionUser.id,
      });
    }

    return prisma.citizenClaimRequest.findUniqueOrThrow({
      where: { id },
      include: claimInclude,
    });
  }
}
