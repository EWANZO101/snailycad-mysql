import { Context, Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, PathParams } from "@tsed/platform-params";
import { ContentType, Delete, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { NotFound } from "@tsed/exceptions";
import { ActiveToneType } from "@prisma/client";
import { Feature, type User } from "@snailycad/types";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { Socket } from "services/socket-service";

/** "builtin:<name>" (generated in the browser), an https/http URL, or a file in the client's /sounds */
const SOUND_REGEX = /^(builtin:[a-z0-9-]+|https?:\/\/\S+|\/sounds\/[\w.-]+\.(mp3|ogg|wav))$/i;

const TONE_PRESET_SCHEMA = z.object({
  name: z.string().trim().min(1).max(255),
  sound: z.string().trim().max(2000).regex(SOUND_REGEX),
  type: z.nativeEnum(ActiveToneType),
  departmentId: z.string().nullish(),
  position: z.number().int().min(0).max(10_000).optional(),
});

const PLAY_TONE_SCHEMA = z.object({
  target: z.enum(["ALL", "LEO", "EMS_FD", "DOT", "DEPARTMENT", "UNIT", "CALL"]),
  targetId: z.string().nullish(),
  description: z.string().max(355).nullish(),
});

const tonePresetInclude = {
  department: { include: { value: true } },
} as const;

@Tags("Dispatch")
@Controller("/tone-presets")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
@IsFeatureEnabled({ feature: Feature.TONES })
export class TonePresetsController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Get("/")
  @Description("Get the tone presets admins have configured")
  @UsePermissions({
    permissions: [
      Permissions.Dispatch,
      Permissions.Leo,
      Permissions.EmsFd,
      Permissions.Dot,
      Permissions.ManageCADSettings,
    ],
  })
  async getTonePresets() {
    return prisma.tonePreset.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: tonePresetInclude,
    });
  }

  @Post("/")
  @Description("Create a tone preset")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async createTonePreset(@BodyParams() body: unknown) {
    const data = validateSchema(TONE_PRESET_SCHEMA, body);

    return prisma.tonePreset.create({
      data: {
        name: data.name,
        sound: data.sound,
        type: data.type,
        departmentId: data.departmentId || null,
        position: data.position ?? 0,
      },
      include: tonePresetInclude,
    });
  }

  @Put("/:id")
  @Description("Update a tone preset")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async updateTonePreset(@PathParams("id") id: string, @BodyParams() body: unknown) {
    const data = validateSchema(TONE_PRESET_SCHEMA, body);
    await this.findTonePreset(id);

    return prisma.tonePreset.update({
      where: { id },
      data: {
        name: data.name,
        sound: data.sound,
        type: data.type,
        departmentId: data.departmentId || null,
        position: data.position ?? 0,
      },
      include: tonePresetInclude,
    });
  }

  @Delete("/:id")
  @Description("Delete a tone preset")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async deleteTonePreset(@PathParams("id") id: string) {
    await this.findTonePreset(id);
    await prisma.tonePreset.delete({ where: { id } });
    return true;
  }

  @Post("/:id/play")
  @Description(
    "Play a tone for everyone, LEO, EMS-FD, a department, a single unit or the units on a call",
  )
  @UsePermissions({ permissions: [Permissions.Dispatch] })
  async playTone(
    @PathParams("id") id: string,
    @BodyParams() body: unknown,
    @Context("user") user: User,
  ) {
    const data = validateSchema(PLAY_TONE_SCHEMA, body);
    const tone = await this.findTonePreset(id);

    let unitIds: string[] | null = null;
    let departmentId: string | null = null;

    if (data.target === "DEPARTMENT") {
      const department = await prisma.departmentValue.findUnique({
        where: { id: String(data.targetId) },
      });
      if (!department) throw new NotFound("departmentNotFound");
      departmentId = department.id;
    }

    if (data.target === "UNIT") {
      if (!data.targetId) throw new NotFound("unitNotFound");
      unitIds = [data.targetId];
    }

    if (data.target === "CALL") {
      const call = await prisma.call911.findUnique({
        where: { id: String(data.targetId) },
        include: { assignedUnits: true },
      });
      if (!call) throw new NotFound("callNotFound");

      unitIds = call.assignedUnits
        .map(
          (assigned) =>
            assigned.officerId ??
            assigned.emsFdDeputyId ??
            assigned.dotWorkerId ??
            assigned.combinedLeoId ??
            assigned.combinedEmsFdId ??
            assigned.combinedDotId,
        )
        .filter((unitId): unitId is string => Boolean(unitId));
    }

    this.socket.emitPlayTone({
      tone: { id: tone.id, name: tone.name, sound: tone.sound },
      target: data.target,
      unitIds,
      departmentId,
      description: data.description ?? null,
      sentBy: user.username,
    });

    return { played: true, unitCount: unitIds?.length ?? null };
  }

  private async findTonePreset(id: string) {
    const tone = await prisma.tonePreset.findUnique({ where: { id } });
    if (!tone) throw new NotFound("tonePresetNotFound");
    return tone;
  }
}
