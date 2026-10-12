import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams } from "@tsed/platform-params";
import { ContentType, Description, Get, Put } from "@tsed/schema";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { getFivemFrameworkSettings, getFivemFrameworkStats } from "lib/fivem/settings";
import { describeFivemPhones, isFivemPhoneId } from "lib/fivem/phones";
import { REMOVED_VEHICLES_MODES } from "lib/fivem/remove-vehicles";

const FIVEM_FRAMEWORK_SETTINGS_SCHEMA = z.object({
  enabled: z.boolean().optional(),
  syncCitizens: z.boolean().optional(),
  syncVehicles: z.boolean().optional(),
  syncDuty: z.boolean().optional(),
  removedVehicles: z.enum(REMOVED_VEHICLES_MODES).optional(),
  disabledPhones: z
    .array(z.string().max(64))
    .max(50)
    .transform((ids) => [...new Set(ids.filter(isFivemPhoneId))])
    .optional(),
});

async function getSettingsWithStats() {
  const [settings, stats] = await Promise.all([
    getFivemFrameworkSettings(),
    getFivemFrameworkStats(),
  ]);
  return { ...settings, stats, phones: describeFivemPhones(settings) };
}

@Controller("/admin/manage/cad-settings/fivem-framework")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class FivemFrameworkAdminController {
  @Get("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description("FiveM framework sync: switches, last sync and counts")
  async getSettings() {
    return getSettingsWithStats();
  }

  @Put("/")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  @Description(
    "Turn parts of the FiveM framework sync, and which phones' numbers are used, on or off",
  )
  async updateSettings(@BodyParams() body: unknown) {
    const data = validateSchema(FIVEM_FRAMEWORK_SETTINGS_SCHEMA, body);
    const settings = await getFivemFrameworkSettings();
    await prisma.fivemFrameworkSettings.update({ where: { id: settings.id }, data });
    return getSettingsWithStats();
  }
}
