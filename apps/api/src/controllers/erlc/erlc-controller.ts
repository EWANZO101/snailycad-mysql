import { Context, Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Post } from "@tsed/schema";
import { Forbidden } from "@tsed/exceptions";
import { Feature, type User } from "@snailycad/types";
import { hasPermission } from "@snailycad/permissions";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { parsePlayer } from "lib/erlc/client";
import { erlcService } from "lib/erlc/erlc-service";

const COMMAND_SCHEMA = z.object({
  /** hint = `:h`, message = `:m`, command = anything (admins only) */
  type: z.enum(["hint", "message", "command"]),
  // one line: a newline would let a hint smuggle in a second command
  text: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform((value) => value.replace(/[\r\n]+/g, " ")),
});

@Controller("/erlc")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class ErlcController {
  @Get("/")
  @IsFeatureEnabled({ feature: Feature.ERLC })
  @UsePermissions({ permissions: [Permissions.Dispatch, Permissions.ManageCADSettings] })
  @Description("The ER:LC private server as of the CAD's last poll")
  async getServer() {
    const server = erlcService.snapshot();
    const emergencyCalls = server?.EmergencyCalls ?? [];

    const links = emergencyCalls.length
      ? await prisma.erlcEmergencyCall.findMany({
          where: {
            OR: emergencyCalls.map((call) => ({
              callNumber: call.CallNumber,
              startedAt: call.StartedAt,
            })),
          },
        })
      : [];
    const cadCalls = await prisma.call911.findMany({
      where: { id: { in: links.flatMap((link) => (link.call911Id ? [link.call911Id] : [])) } },
      select: { id: true, caseNumber: true, ended: true },
    });

    const players = (server?.Players ?? []).map((player) => {
      const parsed = parsePlayer(player.Player);
      return {
        name: parsed?.name ?? player.Player,
        robloxId: parsed?.id ?? null,
        team: player.Team ?? null,
        callsign: player.Callsign ?? null,
        permission: player.Permission ?? null,
        wantedStars: player.WantedStars ?? 0,
        location: player.Location
          ? {
              street: player.Location.StreetName ?? null,
              buildingNumber: player.Location.BuildingNumber || null,
              postal: player.Location.PostalCode || null,
              x: player.Location.LocationX ?? null,
              z: player.Location.LocationZ ?? null,
            }
          : null,
      };
    });
    const nameById = new Map(players.map((player) => [player.robloxId, player.name]));

    return {
      status: erlcService.status(),
      server: server
        ? {
            name: server.Name,
            joinKey: server.JoinKey ?? null,
            currentPlayers: server.CurrentPlayers ?? players.length,
            maxPlayers: server.MaxPlayers ?? null,
            queue: server.Queue?.length ?? 0,
          }
        : null,
      players,
      vehicles: (server?.Vehicles ?? []).map((vehicle) => ({
        name: vehicle.Name ?? null,
        owner: vehicle.Owner ?? null,
        plate: vehicle.Plate ?? null,
        texture: vehicle.Texture ?? null,
        colorHex: vehicle.ColorHex ?? null,
        colorName: vehicle.ColorName ?? null,
      })),
      emergencyCalls: emergencyCalls
        .map((call) => {
          const link = links.find(
            (link) => link.callNumber === call.CallNumber && link.startedAt === call.StartedAt,
          );
          const cadCall = cadCalls.find((cadCall) => cadCall.id === link?.call911Id);
          return {
            callNumber: call.CallNumber,
            team: call.Team ?? null,
            caller: (call.Caller && nameById.get(call.Caller)) || call.Caller || null,
            description: call.Description ?? null,
            location: call.PositionDescriptor ?? null,
            startedAt: call.StartedAt,
            responders: call.Players?.length ?? 0,
            cadCall: cadCall
              ? { id: cadCall.id, caseNumber: cadCall.caseNumber, ended: cadCall.ended }
              : link?.towCallId
                ? { id: link.towCallId, caseNumber: null, ended: false, tow: true }
                : null,
          };
        })
        .sort((a, b) => b.startedAt - a.startedAt),
    };
  }

  @Post("/command")
  @IsFeatureEnabled({ feature: Feature.ERLC })
  @UsePermissions({ permissions: [Permissions.Dispatch, Permissions.ManageCADSettings] })
  @Description("Send a hint or message to the ER:LC server (admins: any command)")
  async runCommand(@Context("user") user: User, @BodyParams() body: unknown) {
    const data = validateSchema(COMMAND_SCHEMA, body);

    if (data.type === "command") {
      const isAdmin = hasPermission({
        userToCheck: user,
        permissionsToCheck: [Permissions.ManageCADSettings],
      });
      if (!isAdmin) throw new Forbidden("Only admins can run commands");
    }

    const command =
      data.type === "hint"
        ? `:h ${data.text}`
        : data.type === "message"
          ? `:m ${data.text}`
          : data.text.startsWith(":")
            ? data.text
            : `:${data.text}`;

    const result = await erlcService.runCommand(command);
    console.info(`[erlc] ${user.username} ran "${command}": ${result.ok ? "ok" : result.reason}`);
    return result;
  }
}
