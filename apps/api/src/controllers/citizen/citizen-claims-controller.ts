import { Controller } from "@tsed/di";
import { UseBeforeEach } from "@tsed/platform-middlewares";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/platform-params";
import { ContentType, Delete, Description, Get, Post, Tags } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import {
  type User,
  type cad,
  type MiscCadSettings,
  Prisma,
  WhitelistStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { validateSchema } from "lib/data/validate-schema";

/** the max amount of pending claim requests a single user can have at the same time. */
const MAX_PENDING_CLAIMS_PER_USER = 5;

const CREATE_CITIZEN_CLAIM_SCHEMA = z.object({
  citizenId: z.string().min(2).max(255),
  reason: z.string().max(1000).nullish(),
});

/**
 * minimal citizen data that is safe to show to any authenticated user.
 * claimable citizens are citizens that are **not** linked to any user (`userId` is `null`).
 */
export const claimableCitizenSelect = {
  id: true,
  name: true,
  surname: true,
  dateOfBirth: true,
} satisfies Prisma.CitizenSelect;

@UseBeforeEach(IsAuth)
@Tags("Citizens")
@Controller("/citizen-claims")
@ContentType("application/json")
export class CitizenClaimsController {
  @Get("/")
  @Description("Get the authenticated user's citizen claim requests")
  async getMyClaims(@Context("user") user: User) {
    const claims = await prisma.citizenClaimRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { citizen: { select: claimableCitizenSelect } },
    });

    return claims;
  }

  @Get("/search")
  @Description(
    "Search for citizens that can be claimed (citizens without a linked user) by name or exact social security number",
  )
  async searchClaimableCitizens(
    @Context("user") user: User,
    @QueryParams("query", String) query = "",
  ) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const [name, surname] = trimmed.toLowerCase().split(/ +/g);

    const citizens = await prisma.citizen.findMany({
      where: {
        userId: null,
        OR: [
          // SSNs must be an exact match to prevent enumerating SSNs
          { socialSecurityNumber: trimmed },
          {
            name: { contains: name, mode: Prisma.QueryMode.insensitive },
            surname: surname ? { contains: surname, mode: Prisma.QueryMode.insensitive } : undefined,
          },
          surname
            ? {
                name: { contains: surname, mode: Prisma.QueryMode.insensitive },
                surname: { contains: name, mode: Prisma.QueryMode.insensitive },
              }
            : { surname: { contains: name, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
      take: 25,
      select: {
        ...claimableCitizenSelect,
        claimRequests: {
          where: { userId: user.id, status: WhitelistStatus.PENDING },
          select: { id: true },
        },
      },
    });

    return citizens.map(({ claimRequests, ...citizen }) => ({
      ...citizen,
      hasPendingClaim: claimRequests.length > 0,
    }));
  }

  @Post("/")
  @Description("Request to claim a citizen that is not linked to any user")
  async createClaim(
    @Context("user") user: User,
    @Context("cad") cad: cad & { miscCadSettings?: MiscCadSettings | null },
    @BodyParams() body: unknown,
  ) {
    const data = validateSchema(CREATE_CITIZEN_CLAIM_SCHEMA, body);

    const citizen = await prisma.citizen.findUnique({
      where: { id: data.citizenId },
      select: { id: true, userId: true },
    });

    // don't reveal whether the citizen exists if it's already owned
    if (!citizen || citizen.userId) {
      throw new BadRequest("citizenNotClaimable");
    }

    const maxCitizensPerUser = cad.miscCadSettings?.maxCitizensPerUser;
    if (maxCitizensPerUser) {
      const count = await prisma.citizen.count({ where: { userId: user.id } });
      if (count >= maxCitizensPerUser) {
        throw new BadRequest("maxCitizensPerUserReached");
      }
    }

    const [existingClaim, pendingCount] = await Promise.all([
      prisma.citizenClaimRequest.findFirst({
        where: { citizenId: citizen.id, userId: user.id, status: WhitelistStatus.PENDING },
      }),
      prisma.citizenClaimRequest.count({
        where: { userId: user.id, status: WhitelistStatus.PENDING },
      }),
    ]);

    if (existingClaim) {
      throw new BadRequest("citizenClaimAlreadyPending");
    }

    if (pendingCount >= MAX_PENDING_CLAIMS_PER_USER) {
      throw new BadRequest("tooManyPendingCitizenClaims");
    }

    const claim = await prisma.citizenClaimRequest.create({
      data: {
        citizenId: citizen.id,
        userId: user.id,
        reason: data.reason?.trim() || null,
        status: WhitelistStatus.PENDING,
      },
      include: { citizen: { select: claimableCitizenSelect } },
    });

    return claim;
  }

  @Delete("/:id")
  @Description("Cancel one of your own pending citizen claim requests")
  async cancelClaim(@Context("user") user: User, @PathParams("id") id: string) {
    const deleted = await prisma.citizenClaimRequest.deleteMany({
      where: { id, userId: user.id, status: WhitelistStatus.PENDING },
    });

    if (deleted.count <= 0) {
      throw new NotFound("notFound");
    }

    return true;
  }
}
