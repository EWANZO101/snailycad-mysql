import { Context, Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, PathParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Tags } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Feature, type User } from "@snailycad/types";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { IsAuth } from "middlewares/auth/is-auth";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { Socket } from "services/socket-service";
import { validateSchema } from "lib/data/validate-schema";
import { leoProperties, unitProperties, dotWorkerProperties } from "utils/leo/includes";

const UNIT_MESSAGE_SCHEMA = z.object({
  message: z.string().trim().min(1).max(2000),
});

const ON_DUTY_FILTER = {
  status: { is: { NOT: { shouldDo: "SET_OFF_DUTY" as const } } },
};

/** an officer or EMS-FD deputy (not a combined unit), with what's needed to render its callsign */
async function findUnitsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length <= 0) return new Map<string, any>();

  const [officers, deputies, dotWorkers] = await Promise.all([
    prisma.officer.findMany({ where: { id: { in: uniqueIds } }, include: leoProperties }),
    prisma.emsFdDeputy.findMany({ where: { id: { in: uniqueIds } }, include: unitProperties }),
    prisma.dotWorker.findMany({ where: { id: { in: uniqueIds } }, include: dotWorkerProperties }),
  ]);

  return new Map<string, any>(
    [...officers, ...deputies, ...dotWorkers].map((unit) => [unit.id, unit]),
  );
}

/**
 * the sending unit must belong to the signed-in user. Combined units aren't supported: their
 * members message from their own officer or deputy.
 */
async function assertOwnUnit(unitId: string, user: Pick<User, "id">) {
  const [officer, deputy, dotWorker] = await Promise.all([
    prisma.officer.findFirst({ where: { id: unitId, userId: user.id }, select: { id: true } }),
    prisma.emsFdDeputy.findFirst({ where: { id: unitId, userId: user.id }, select: { id: true } }),
    prisma.dotWorker.findFirst({ where: { id: unitId, userId: user.id }, select: { id: true } }),
  ]);

  if (!officer && !deputy && !dotWorker) {
    throw new NotFound("unitNotFound");
  }
}

@Tags("Law Enforcement")
@Controller("/unit-messages")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
@IsFeatureEnabled({ feature: Feature.UNIT_PRIVATE_MESSAGES })
export class UnitMessagesController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Get("/:unitId")
  @Description("Get the conversations of one of your units, with unread counts")
  @UsePermissions({ permissions: [Permissions.Leo, Permissions.EmsFd, Permissions.Dot] })
  async getConversations(@PathParams("unitId") unitId: string, @Context("user") user: User) {
    await assertOwnUnit(unitId, user);

    const messages = await prisma.unitPrivateMessage.findMany({
      where: { OR: [{ senderUnitId: unitId }, { recipientUnitId: unitId }] },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const conversations = new Map<
      string,
      { lastMessage: (typeof messages)[number]; unreadCount: number }
    >();

    for (const message of messages) {
      const otherUnitId =
        message.senderUnitId === unitId ? message.recipientUnitId : message.senderUnitId;
      const isUnread = message.recipientUnitId === unitId && !message.readAt;
      const existing = conversations.get(otherUnitId);

      if (existing) {
        if (isUnread) existing.unreadCount += 1;
      } else {
        conversations.set(otherUnitId, { lastMessage: message, unreadCount: isUnread ? 1 : 0 });
      }
    }

    const units = await findUnitsByIds([...conversations.keys()]);

    return {
      totalUnread: [...conversations.values()].reduce((sum, c) => sum + c.unreadCount, 0),
      conversations: [...conversations.entries()]
        .filter(([otherUnitId]) => units.has(otherUnitId))
        .map(([otherUnitId, conversation]) => ({
          unit: units.get(otherUnitId),
          lastMessage: conversation.lastMessage,
          unreadCount: conversation.unreadCount,
        })),
    };
  }

  @Get("/:unitId/recipients")
  @Description("Get the on-duty officers and deputies one of your units can message")
  @UsePermissions({ permissions: [Permissions.Leo, Permissions.EmsFd, Permissions.Dot] })
  async getRecipients(@PathParams("unitId") unitId: string, @Context("user") user: User) {
    await assertOwnUnit(unitId, user);

    const [officers, deputies, dotWorkers] = await Promise.all([
      prisma.officer.findMany({
        where: { ...ON_DUTY_FILTER, NOT: { id: unitId } },
        include: leoProperties,
      }),
      prisma.emsFdDeputy.findMany({
        where: { ...ON_DUTY_FILTER, NOT: { id: unitId } },
        include: unitProperties,
      }),
      prisma.dotWorker.findMany({
        where: { ...ON_DUTY_FILTER, NOT: { id: unitId } },
        include: dotWorkerProperties,
      }),
    ]);

    return [...officers, ...deputies, ...dotWorkers];
  }

  @Get("/:unitId/:otherUnitId")
  @Description("Get the messages between one of your units and another unit, and mark them read")
  @UsePermissions({ permissions: [Permissions.Leo, Permissions.EmsFd, Permissions.Dot] })
  async getMessages(
    @PathParams("unitId") unitId: string,
    @PathParams("otherUnitId") otherUnitId: string,
    @Context("user") user: User,
  ) {
    await assertOwnUnit(unitId, user);

    const units = await findUnitsByIds([otherUnitId]);
    if (!units.has(otherUnitId)) {
      throw new NotFound("unitNotFound");
    }

    const messages = await prisma.unitPrivateMessage.findMany({
      where: {
        OR: [
          { senderUnitId: unitId, recipientUnitId: otherUnitId },
          { senderUnitId: otherUnitId, recipientUnitId: unitId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    await prisma.unitPrivateMessage.updateMany({
      where: { senderUnitId: otherUnitId, recipientUnitId: unitId, readAt: null },
      data: { readAt: new Date() },
    });

    return { unit: units.get(otherUnitId), messages };
  }

  @Post("/:unitId/:otherUnitId")
  @Description("Send a private message from one of your units to another officer or deputy")
  @UsePermissions({ permissions: [Permissions.Leo, Permissions.EmsFd, Permissions.Dot] })
  async sendMessage(
    @PathParams("unitId") unitId: string,
    @PathParams("otherUnitId") otherUnitId: string,
    @Context("user") user: User,
    @BodyParams() body: unknown,
  ) {
    const data = validateSchema(UNIT_MESSAGE_SCHEMA, body);
    await assertOwnUnit(unitId, user);

    if (unitId === otherUnitId) {
      throw new BadRequest("cannotMessageYourself");
    }

    const units = await findUnitsByIds([otherUnitId]);
    if (!units.has(otherUnitId)) {
      throw new NotFound("unitNotFound");
    }

    const message = await prisma.unitPrivateMessage.create({
      data: { message: data.message, senderUnitId: unitId, recipientUnitId: otherUnitId },
    });

    // sockets aren't authenticated, so only the unit ids are sent. Clients fetch the message itself.
    this.socket.emitUnitPrivateMessage({ senderUnitId: unitId, recipientUnitId: otherUnitId });

    return message;
  }
}
