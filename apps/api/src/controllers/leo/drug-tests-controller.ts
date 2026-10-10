import { Context, UseBefore, UseBeforeEach } from "@tsed/common";
import { Controller } from "@tsed/di";
import { ContentType, Description, Get, Post } from "@tsed/schema";
import { BodyParams, PathParams } from "@tsed/platform-params";
import { NotFound } from "@tsed/exceptions";
import type { CombinedLeoUnit, Officer, User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { ActiveOfficer } from "middlewares/active-officer";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { validateSchema } from "lib/data/validate-schema";
import { getUserOfficerFromActiveOfficer } from "lib/leo/utils";
import { leoProperties } from "utils/leo/includes";

// keep in sync with the `DrugTestResult` enum in schema.prisma
export const DRUG_TEST_RESULTS = ["POSITIVE", "NEGATIVE", "INCONCLUSIVE"] as const;

export const CITIZEN_DRUG_TEST_SCHEMA = z.object({
  citizenId: z.string().min(1),
  substances: z.string().trim().min(1).max(1000),
  result: z.enum(DRUG_TEST_RESULTS),
  notes: z.string().max(5000).nullish(),
});

const drugTestInclude = {
  officer: { include: leoProperties },
};

@Controller("/leo/drug-tests")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class LeoDrugTestsController {
  @Get("/:citizenId")
  @Description("Get all the drug tests of a citizen (newest first)")
  @UsePermissions({ permissions: [Permissions.Leo] })
  async getCitizenDrugTests(@PathParams("citizenId") citizenId: string) {
    return prisma.citizenDrugTest.findMany({
      where: { citizenId },
      orderBy: { createdAt: "desc" },
      include: drugTestInclude,
    });
  }

  @Post("/")
  @UseBefore(ActiveOfficer)
  @Description("Create a new drug test for a citizen. Requires an active officer.")
  @UsePermissions({ permissions: [Permissions.Leo] })
  async createDrugTest(
    @BodyParams() body: unknown,
    @Context("user") user: User,
    @Context("activeOfficer") activeOfficer: (CombinedLeoUnit & { officers: Officer[] }) | Officer,
  ) {
    const data = validateSchema(CITIZEN_DRUG_TEST_SCHEMA, body);
    const officer = getUserOfficerFromActiveOfficer({ userId: user.id, activeOfficer });

    const citizen = await prisma.citizen.findUnique({
      where: { id: data.citizenId },
      select: { id: true },
    });

    if (!citizen) {
      throw new NotFound("citizenNotFound");
    }

    return prisma.citizenDrugTest.create({
      data: {
        citizenId: citizen.id,
        officerId: officer?.id ?? null,
        substances: data.substances,
        result: data.result,
        notes: data.notes || null,
      },
      include: drugTestInclude,
    });
  }
}
