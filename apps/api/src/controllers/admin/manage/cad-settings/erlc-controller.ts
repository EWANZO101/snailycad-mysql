import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import {
  ERLC_TEAM_MAP,
  MAX_POLL_SECONDS,
  MIN_POLL_SECONDS,
  toPublicErlcSettings,
} from "lib/erlc/settings";
import { getErlcSettings } from "lib/erlc/get-settings";
import { callErlc, isKeyRejected, isServerOffline } from "lib/erlc/client";
import { erlcService } from "lib/erlc/erlc-service";

const ERLC_SETTINGS_SCHEMA = z.object({
  enabled: z.boolean().optional(),
  /** `undefined` keeps the stored key, `""`/`null` removes it */
  serverKey: z.string().trim().max(512).nullish(),
  apiKey: z.string().trim().max(512).nullish(),
  pollSeconds: z.number().int().min(MIN_POLL_SECONDS).max(MAX_POLL_SECONDS).optional(),
  create911Calls: z.boolean().optional(),
  teamMap: ERLC_TEAM_MAP.optional(),
});

@Tags("Admin: Manage")
@Controller("/admin/manage/cad-settings/erlc")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class ErlcAdminController {
  @Get("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("ER:LC integration settings and status (the keys are never returned)")
  async getSettings() {
    return {
      ...toPublicErlcSettings(await getErlcSettings()),
      status: erlcService.status(),
    };
  }

  @Put("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Update the ER:LC integration settings")
  async updateSettings(@BodyParams() body: unknown) {
    const data = validateSchema(ERLC_SETTINGS_SCHEMA, body);
    const settings = await getErlcSettings();
    const keyChanged = data.serverKey !== undefined || data.apiKey !== undefined;

    const updated = await prisma.erlcSettings.update({
      where: { id: settings.id },
      data: {
        enabled: data.enabled,
        serverKey: data.serverKey === undefined ? undefined : data.serverKey || null,
        apiKey: data.apiKey === undefined ? undefined : data.apiKey || null,
        pollSeconds: data.pollSeconds,
        create911Calls: data.create911Calls,
        teamMap: data.teamMap,
        // a new key is the way out of "paused: key rejected"
        ...(keyChanged ? { pausedReason: null, pausedAt: null } : {}),
      },
    });

    await erlcService.refresh();
    return { ...toPublicErlcSettings(updated), status: erlcService.status() };
  }

  @Post("/resume")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Start polling again after ER:LC rejected the key")
  async resume() {
    const settings = await getErlcSettings();
    const updated = await prisma.erlcSettings.update({
      where: { id: settings.id },
      data: { pausedReason: null, pausedAt: null },
    });
    await erlcService.refresh();
    return { ...toPublicErlcSettings(updated), status: erlcService.status() };
  }

  @Post("/test")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Check the saved server key against the ER:LC API")
  async testConnection() {
    const settings = await getErlcSettings();
    if (!settings.serverKey) return { result: "noKey" as const };

    try {
      const response = await callErlc(settings, { method: "GET", path: "/v2/server" });
      if (response.status === 429) {
        return {
          result: "rateLimited" as const,
          retryInSeconds: Math.ceil(((response.retryAt ?? Date.now()) - Date.now()) / 1000),
        };
      }
      if (isKeyRejected(response)) {
        return { result: "rejected" as const, code: response.code, message: response.message };
      }
      if (isServerOffline(response)) return { result: "offline" as const };
      if (response.code === 9999) return { result: "moduleOutdated" as const };
      if (response.status >= 200 && response.status < 300) {
        const server = response.json as {
          Name?: string;
          CurrentPlayers?: number;
          MaxPlayers?: number;
        } | null;
        return {
          result: "ok" as const,
          name: server?.Name ?? null,
          players: server?.CurrentPlayers ?? null,
          maxPlayers: server?.MaxPlayers ?? null,
        };
      }
      return {
        result: "error" as const,
        status: response.status,
        code: response.code,
        message: response.message,
      };
    } catch (error) {
      return {
        result: "unreachable" as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
