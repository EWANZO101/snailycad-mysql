import { Controller, UseBeforeEach } from "@tsed/common";
import { Context, QueryParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Tags } from "@tsed/schema";
import { Prisma, type User } from "@prisma/client";
import { hasPermission } from "@snailycad/permissions";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";

const MAX_PER_GROUP = 5;

/**
 * Search-as-you-type for the quick search (Ctrl/Cmd + K): a few results per kind, only the kinds the
 * user is allowed to search. The full details still come from the regular search endpoints.
 */
@Tags("Law Enforcement")
@Controller("/quick-search")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class QuickSearchController {
  @Get("/")
  @Description("Suggestions for citizens, plates, weapon serials and active 911 calls while typing")
  @UsePermissions({ permissions: [Permissions.Leo, Permissions.Dispatch, Permissions.EmsFd, Permissions.Dot] })
  async quickSearch(@QueryParams("query", String) rawQuery: string, @Context("user") user: User) {
    const query = (rawQuery ?? "").trim().slice(0, 100);
    if (query.length < 2) {
      return { citizens: [], vehicles: [], weapons: [], calls: [] };
    }

    const canSearchRecords = hasPermission({
      userToCheck: user,
      permissionsToCheck: [Permissions.Leo, Permissions.Dispatch],
    });
    const canSeeCalls = hasPermission({
      userToCheck: user,
      permissionsToCheck: [Permissions.Leo, Permissions.Dispatch, Permissions.EmsFd, Permissions.Dot],
    });

    const contains = { contains: query, mode: Prisma.QueryMode.insensitive };
    // every word must match the name or surname, so "jo smi" finds "John Smith"
    const words = query.split(/\s+/).filter(Boolean).slice(0, 4);
    const caseNumber = /^#?\d+$/.test(query) ? Number(query.replace("#", "")) : null;

    const [citizens, vehicles, weapons, calls] = await Promise.all([
      canSearchRecords
        ? prisma.citizen.findMany({
            where: {
              OR: [
                {
                  AND: words.map((word) => ({
                    OR: [
                      { name: { contains: word, mode: Prisma.QueryMode.insensitive } },
                      { surname: { contains: word, mode: Prisma.QueryMode.insensitive } },
                    ],
                  })),
                },
                { socialSecurityNumber: { equals: query } },
              ],
            },
            select: {
              id: true,
              name: true,
              surname: true,
              dateOfBirth: true,
              socialSecurityNumber: true,
            },
            orderBy: [{ surname: "asc" }, { name: "asc" }],
            take: MAX_PER_GROUP,
          })
        : [],
      canSearchRecords
        ? prisma.registeredVehicle.findMany({
            where: { OR: [{ plate: contains }, { vinNumber: contains }] },
            select: {
              id: true,
              plate: true,
              vinNumber: true,
              model: { select: { value: { select: { value: true } } } },
              citizen: { select: { name: true, surname: true } },
            },
            take: MAX_PER_GROUP,
          })
        : [],
      canSearchRecords
        ? prisma.weapon.findMany({
            where: { serialNumber: contains },
            select: {
              id: true,
              serialNumber: true,
              model: { select: { value: { select: { value: true } } } },
              citizen: { select: { name: true, surname: true } },
            },
            take: MAX_PER_GROUP,
          })
        : [],
      canSeeCalls
        ? prisma.call911.findMany({
            where: {
              NOT: { ended: true },
              OR: [
                ...(caseNumber !== null ? [{ caseNumber }] : []),
                { location: contains },
                { postal: contains },
                { name: contains },
                { description: contains },
              ],
            },
            select: {
              id: true,
              caseNumber: true,
              location: true,
              postal: true,
              name: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: MAX_PER_GROUP,
          })
        : [],
    ]);

    return { citizens, vehicles, weapons, calls };
  }
}
