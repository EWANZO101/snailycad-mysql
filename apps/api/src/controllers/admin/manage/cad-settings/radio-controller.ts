import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, PathParams } from "@tsed/platform-params";
import { ContentType, Delete, Description, Get, Post, Put } from "@tsed/schema";
import { NotFound } from "@tsed/exceptions";
import { RadioTransport } from "@prisma/client";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { getLiveKitConfig, getRadioWsUrl } from "lib/radio/config";
import { radioServer } from "lib/radio/radio-server";

const RADIO_CHANNEL_SCHEMA = z.object({
  name: z.string().trim().min(1).max(255),
  frequency: z.string().trim().max(64).nullish(),
  description: z.string().trim().max(1000).nullish(),
  position: z.number().int().min(0).max(10_000).optional(),
  departments: z.array(z.string()).max(100).default([]),
  allowExternal: z.boolean().default(true),
  receiveOnly: z.boolean().default(false),
});

const RADIO_SETTINGS_SCHEMA = z.object({
  transport: z.nativeEnum(RadioTransport),
});

const channelInclude = {
  departments: { include: { value: true } },
} as const;

@Controller("/admin/manage/cad-settings/radio")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class RadioAdminController {
  @Get("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Radio channels and settings")
  async getRadio() {
    const [channels, settings] = await Promise.all([
      prisma.radioChannel.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: channelInclude,
      }),
      this.getSettings(),
    ]);
    return {
      channels,
      settings,
      livekitConfigured: !!getLiveKitConfig(),
      livekitUrl: getLiveKitConfig()?.url ?? null,
      wsUrl: getRadioWsUrl(),
      transport: await radioServer.transport(),
    };
  }

  @Put("/settings")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Update the radio settings")
  async updateSettings(@BodyParams() body: unknown) {
    const data = validateSchema(RADIO_SETTINGS_SCHEMA, body);
    const settings = await this.getSettings();
    const updated = await prisma.radioSettings.update({
      where: { id: settings.id },
      data: { transport: data.transport },
    });
    // connected radios pick up the new transport when they reconnect; channel access refreshes now
    await radioServer.refreshAccess();
    return updated;
  }

  @Post("/channels")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Create a radio channel")
  async createChannel(@BodyParams() body: unknown) {
    const data = validateSchema(RADIO_CHANNEL_SCHEMA, body);
    const channel = await prisma.radioChannel.create({
      data: {
        name: data.name,
        frequency: data.frequency || null,
        description: data.description || null,
        position: data.position ?? (await prisma.radioChannel.count()),
        allowExternal: data.allowExternal,
        receiveOnly: data.receiveOnly,
        departments: { connect: data.departments.map((id) => ({ id })) },
      },
      include: channelInclude,
    });
    await radioServer.refreshAccess();
    return channel;
  }

  @Put("/channels/:id")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Update a radio channel")
  async updateChannel(@PathParams("id") id: string, @BodyParams() body: unknown) {
    const data = validateSchema(RADIO_CHANNEL_SCHEMA, body);
    await this.findChannel(id);
    const channel = await prisma.radioChannel.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency || null,
        description: data.description || null,
        position: data.position,
        allowExternal: data.allowExternal,
        receiveOnly: data.receiveOnly,
        departments: { set: data.departments.map((departmentId) => ({ id: departmentId })) },
      },
      include: channelInclude,
    });
    await radioServer.refreshAccess();
    return channel;
  }

  @Delete("/channels/:id")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Delete a radio channel")
  async deleteChannel(@PathParams("id") id: string) {
    await this.findChannel(id);
    await prisma.radioChannel.delete({ where: { id } });
    await radioServer.refreshAccess();
    return true;
  }

  private async getSettings() {
    const existing = await prisma.radioSettings.findFirst();
    return existing ?? prisma.radioSettings.create({ data: {} });
  }

  private async findChannel(id: string) {
    const channel = await prisma.radioChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFound("radioChannelNotFound");
    return channel;
  }
}
