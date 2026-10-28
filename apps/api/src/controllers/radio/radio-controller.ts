import { Context, Controller, UseBefore } from "@tsed/common";
import { BodyParams, HeaderParams, PathParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Tags } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { API_TOKEN_HEADER } from "@snailycad/config";
import { Feature, type User } from "@snailycad/types";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findLinkedUserId } from "lib/radio/access";
import { radioServer } from "lib/radio/radio-server";
import { assertCADApiToken, createRadioTokenResponse } from "lib/radio/token-response";

const EXTERNAL_TOKEN_SCHEMA = z.object({
  name: z.string().trim().min(1).max(100),
  identity: z.string().trim().min(1).max(200),
  identifiers: z
    .object({
      discordId: z.string().trim().max(64).nullish(),
      steamId: z.string().trim().max(64).nullish(),
    })
    .nullish(),
  kind: z.enum(["game", "external"]).default("game"),
  /** department ids or names this person belongs to in the game (e.g. mapped from a job) */
  departments: z.array(z.string().trim().min(1).max(255)).max(20).optional(),
  /** may overhear radios nearby (positional audio) */
  proximity: z.boolean().default(false),
  /** a player without a radio of their own: can only overhear nearby radios */
  listenOnly: z.boolean().default(false),
});

const TONE_SCHEMA = z.object({
  tone: z.string().trim().min(1).max(64),
});

const UNIT_PERMISSIONS = [Permissions.Dispatch, Permissions.Leo, Permissions.EmsFd, Permissions.Dot];

@Tags("Radio")
@Controller("/radio")
@ContentType("application/json")
export class RadioController {
  @Post("/token")
  @UseBefore(IsAuth)
  @IsFeatureEnabled({ feature: Feature.RADIO })
  @UsePermissions({ permissions: [...UNIT_PERMISSIONS, Permissions.ManageCADSettings] })
  @Description("Get a radio token for the signed-in CAD user")
  async getToken(@Context("user") user: User) {
    return createRadioTokenResponse({
      sub: `u:${user.id}`,
      nm: user.username,
      kind: "user",
      uid: user.id,
    });
  }

  @Post("/external/token")
  @Description(
    "Get a radio token for a game player or an external radio (needs the CAD API token in the snaily-cad-api-token header)",
  )
  async getExternalToken(
    @HeaderParams(API_TOKEN_HEADER) apiToken: string | undefined,
    @BodyParams() body: unknown,
  ) {
    await assertCADApiToken(apiToken);
    if (!(await radioServer.isEnabled())) throw new BadRequest("radioDisabled");
    const data = validateSchema(EXTERNAL_TOKEN_SCHEMA, body);

    const departments = data.departments?.length
      ? await prisma.departmentValue.findMany({
          where: {
            OR: [{ id: { in: data.departments } }, { value: { value: { in: data.departments } } }],
          },
          select: { id: true },
        })
      : [];
    const userId = await findLinkedUserId(data.identifiers ?? undefined);

    return createRadioTokenResponse({
      sub: `x:${data.identity}`,
      nm: data.name,
      kind: data.kind,
      uid: userId ?? undefined,
      dep: departments.map((d) => d.id),
      prox: data.proximity,
      lo: data.listenOnly,
    });
  }

  @Get("/channels")
  @UseBefore(IsAuth)
  @IsFeatureEnabled({ feature: Feature.RADIO })
  @UsePermissions({ permissions: [...UNIT_PERMISSIONS, Permissions.ManageCADSettings] })
  @Description("All radio channels, for dispatch (e.g. to move a unit to a channel)")
  async getChannels() {
    return prisma.radioChannel.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, frequency: true, description: true, receiveOnly: true },
    });
  }

  @Get("/status")
  @UseBefore(IsAuth)
  @IsFeatureEnabled({ feature: Feature.RADIO })
  @UsePermissions({ permissions: [Permissions.Dispatch] })
  @Description("Who is on which radio channel and who is talking")
  async getStatus() {
    return radioServer.status();
  }

  @Post("/channels/:id/tone")
  @UseBefore(IsAuth)
  @IsFeatureEnabled({ feature: Feature.RADIO })
  @UsePermissions({ permissions: [Permissions.Dispatch] })
  @Description("Play an alert tone on a radio channel")
  async playTone(@PathParams("id") id: string, @BodyParams() body: unknown) {
    const data = validateSchema(TONE_SCHEMA, body);
    const channel = await prisma.radioChannel.findUnique({ where: { id }, select: { id: true } });
    if (!channel) throw new NotFound("radioChannelNotFound");
    radioServer.sendTone(channel.id, data.tone);
    return true;
  }
}
