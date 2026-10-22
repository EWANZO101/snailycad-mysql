import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import {
  generateOpsPhoneSecret,
  getOpsPhoneSettings,
  OPS_PHONE_SERVICE_MAP,
  toPublicOpsPhoneSettings,
} from "lib/ops-phone/settings";
import { callOpsPhone } from "lib/ops-phone/client";

const OPS_PHONE_SETTINGS_SCHEMA = z.object({
  enabled: z.boolean().optional(),
  apiUrl: z
    .string()
    .trim()
    .max(512)
    .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "Must be an http(s) URL")
    .nullish(),
  /** `undefined` keeps the stored key, `""`/`null` removes it */
  apiKey: z.string().trim().max(512).nullish(),
  sendSms: z.boolean().optional(),
  serviceMap: OPS_PHONE_SERVICE_MAP.optional(),
});

@Tags("Admin: Manage")
@Controller("/admin/manage/cad-settings/ops-phone")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class OpsPhoneAdminController {
  @Get("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("ops-phone integration settings (the API key is never returned)")
  async getSettings() {
    return toPublicOpsPhoneSettings(await getOpsPhoneSettings());
  }

  @Put("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Update the ops-phone integration settings")
  async updateSettings(@BodyParams() body: unknown) {
    const data = validateSchema(OPS_PHONE_SETTINGS_SCHEMA, body);
    const settings = await getOpsPhoneSettings();

    const updated = await prisma.opsPhoneSettings.update({
      where: { id: settings.id },
      data: {
        enabled: data.enabled,
        apiUrl: data.apiUrl === undefined ? undefined : data.apiUrl || null,
        apiKey: data.apiKey === undefined ? undefined : data.apiKey || null,
        sendSms: data.sendSms,
        serviceMap: data.serviceMap,
      },
    });
    return toPublicOpsPhoneSettings(updated);
  }

  @Post("/regenerate-secret")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Make a new webhook secret (the old one stops working)")
  async regenerateSecret() {
    const settings = await getOpsPhoneSettings();
    const updated = await prisma.opsPhoneSettings.update({
      where: { id: settings.id },
      data: { webhookSecret: generateOpsPhoneSecret() },
    });
    return toPublicOpsPhoneSettings(updated);
  }

  @Post("/test")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("Check that the CAD can reach the ops-phone API with the key")
  async testConnection() {
    const settings = await getOpsPhoneSettings();
    if (!settings.apiUrl) return { result: "notConfigured" as const };
    if (!settings.apiKey) return { result: "noKey" as const };

    try {
      const response = await callOpsPhone(settings, { method: "GET", path: "/health" });
      if (response.status === 401 || response.status === 403) {
        return { result: "unauthorized" as const, status: response.status };
      }
      if (response.status === 503) {
        // ops-phone answers 503 while its own key (opslabs_phone_api_key) is missing
        return { result: "apiDisabled" as const, status: response.status };
      }
      if (response.status >= 200 && response.status < 300) {
        const data = (response.json as { data?: { resource?: string; version?: string } } | null)
          ?.data;
        return {
          result: "ok" as const,
          status: response.status,
          resource: data?.resource ?? null,
          version: data?.version ?? null,
        };
      }
      return { result: "error" as const, status: response.status };
    } catch (error) {
      return {
        result: "unreachable" as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
