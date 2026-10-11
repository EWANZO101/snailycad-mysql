import { Context, UseBeforeEach } from "@tsed/common";
import { Controller } from "@tsed/di";
import { ContentType, Delete, Description, Get, Post } from "@tsed/schema";
import { BodyParams, PathParams } from "@tsed/platform-params";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { User } from "@prisma/client";
import type { cad, Feature } from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { validateSchema } from "lib/data/validate-schema";
import { canManageInvariant } from "lib/auth/getSessionUser";
import { shouldCheckCitizenUserId } from "lib/citizen/has-citizen-access";

export const CITIZEN_ALIAS_SCHEMA = z.object({
  name: z.string().trim().min(1).max(255),
  surname: z.string().trim().min(1).max(255),
});

/** the maximum amount of aliases a single citizen can have */
const MAX_ALIASES_PER_CITIZEN = 25;

@Controller("/citizen/:citizenId/aliases")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class CitizenAliasesController {
  @Get("/")
  @Description("Get all the aliases of a citizen. Only the owner of the citizen can access this.")
  async getAliases(
    @PathParams("citizenId") citizenId: string,
    @Context("user") user: User,
    @Context("cad") cad: cad & { features?: Record<Feature, boolean> },
  ) {
    await this.getCitizenOrThrow({ citizenId, user, cad });

    return prisma.citizenAlias.findMany({
      where: { citizenId },
      orderBy: { createdAt: "asc" },
    });
  }

  @Post("/")
  @Description("Add a new alias to a citizen. Only the owner of the citizen can do this.")
  async createAlias(
    @PathParams("citizenId") citizenId: string,
    @Context("user") user: User,
    @Context("cad") cad: cad & { features?: Record<Feature, boolean> },
    @BodyParams() body: unknown,
  ) {
    const data = validateSchema(CITIZEN_ALIAS_SCHEMA, body);
    await this.getCitizenOrThrow({ citizenId, user, cad });

    const count = await prisma.citizenAlias.count({ where: { citizenId } });
    if (count >= MAX_ALIASES_PER_CITIZEN) {
      throw new BadRequest("maxAliasesReached");
    }

    return prisma.citizenAlias.create({
      data: { citizenId, name: data.name, surname: data.surname },
    });
  }

  @Delete("/:aliasId")
  @Description("Delete an alias of a citizen. Only the owner of the citizen can do this.")
  async deleteAlias(
    @PathParams("citizenId") citizenId: string,
    @PathParams("aliasId") aliasId: string,
    @Context("user") user: User,
    @Context("cad") cad: cad & { features?: Record<Feature, boolean> },
  ): Promise<boolean> {
    await this.getCitizenOrThrow({ citizenId, user, cad });

    const alias = await prisma.citizenAlias.findFirst({ where: { id: aliasId, citizenId } });
    if (!alias) {
      throw new NotFound("notFound");
    }

    await prisma.citizenAlias.delete({ where: { id: alias.id } });
    return true;
  }

  private async getCitizenOrThrow(options: {
    citizenId: string;
    user: User;
    cad: cad & { features?: Record<Feature, boolean> };
  }) {
    const citizen = await prisma.citizen.findUnique({
      where: { id: options.citizenId },
      select: { id: true, userId: true },
    });

    if (!citizen) {
      throw new NotFound("citizenNotFound");
    }

    const checkCitizenUserId = shouldCheckCitizenUserId({ cad: options.cad, user: options.user });
    if (checkCitizenUserId) {
      canManageInvariant(citizen.userId, options.user, new NotFound("notFound"));
    }

    return citizen;
  }
}
