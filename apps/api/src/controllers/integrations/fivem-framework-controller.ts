import { Controller } from "@tsed/di";
import { BodyParams, HeaderParams, Req } from "@tsed/common";
import { ContentType, Description, Post } from "@tsed/schema";
import { Unauthorized } from "@tsed/exceptions";
import { API_TOKEN_HEADER } from "@snailycad/config";
import { Feature } from "@prisma/client";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { findLinkedUserId } from "lib/radio/access";
import { assertCADApiToken } from "lib/radio/token-response";
import { getCadWithFeatures } from "lib/fivem/cad";
import { hitFivemRateLimit, recordFivemFailure } from "lib/fivem/rate-limit";
import {
  getFivemFrameworkSettings,
  getFivemFrameworkStats,
  recordFivemSync,
} from "lib/fivem/settings";
import {
  FIVEM_CHARACTER_SYNC_SCHEMA,
  FIVEM_CHECK_SCHEMA,
  FIVEM_DUTY_SCHEMA,
} from "lib/fivem/schemas";
import { syncFivemCharacter } from "lib/fivem/sync-character";
import { phoneIdList, pickPhoneNumber } from "lib/fivem/phones";
import { syncFivemVehicles, type VehicleSyncResult } from "lib/fivem/sync-vehicles";
import { syncFivemDuty } from "lib/fivem/sync-duty";
import { Socket } from "services/socket-service";

/**
 * FiveM framework integration (ESX, QBCore, Qbox): the snailycad-framework resource sends game
 * characters, their vehicles and duty changes. No session: every request needs the CAD API token
 * (CAD Settings > API Token) in the snaily-cad-api-token header.
 */
@Controller("/integrations/fivem")
@ContentType("application/json")
export class FivemFrameworkController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  private async authenticate(req: Req, apiToken: string | undefined) {
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
    hitFivemRateLimit(ip);
    try {
      await assertCADApiToken(apiToken);
    } catch (error) {
      if (error instanceof Unauthorized) recordFivemFailure(ip);
      throw error;
    }
  }

  @Post("/characters")
  @Description(
    "Create or update the CAD citizen of a game character, and register its vehicles (CAD API token)",
  )
  async syncCharacter(
    @Req() req: Req,
    @HeaderParams(API_TOKEN_HEADER) apiToken: string | undefined,
    @BodyParams() body: unknown,
  ) {
    await this.authenticate(req, apiToken);
    const data = validateSchema(FIVEM_CHARACTER_SYNC_SCHEMA, body);
    const settings = await getFivemFrameworkSettings();
    if (!settings.enabled) return { result: "disabled" as const };

    const cad = await getCadWithFeatures();
    if (!cad) return { result: "skipped" as const, reason: "cadNotSetUp" };

    await recordFivemSync(settings.id, data);
    data.character.phoneNumber = pickPhoneNumber({
      phones: data.phones,
      fallback: data.character.phoneNumber,
      disabled: phoneIdList(settings.disabledPhones),
    });
    const userId = await findLinkedUserId(data.identifiers ?? undefined);
    const citizen = await syncFivemCharacter({
      data,
      cad,
      userId,
      syncCitizens: settings.syncCitizens,
    });

    let vehicles: VehicleSyncResult | null = null;
    if (data.vehicles && settings.syncVehicles && citizen.result !== "skipped") {
      vehicles = await syncFivemVehicles({
        vehicles: data.vehicles,
        framework: data.framework,
        characterId: data.characterId,
        citizenId: citizen.citizenId,
        userId: citizen.userId,
        cad,
        createVehicleModels: data.createVehicleModels,
      });
    }

    return { ...citizen, linked: !!userId, vehicles };
  }

  @Post("/duty")
  @Description("Set a player's CAD unit on or off duty after a duty change in game (CAD API token)")
  async syncDuty(
    @Req() req: Req,
    @HeaderParams(API_TOKEN_HEADER) apiToken: string | undefined,
    @BodyParams() body: unknown,
  ) {
    await this.authenticate(req, apiToken);
    const data = validateSchema(FIVEM_DUTY_SCHEMA, body);
    const settings = await getFivemFrameworkSettings();
    if (!settings.enabled) return { result: "disabled" as const };
    if (!settings.syncDuty) return { result: "skipped" as const, reason: "dutySyncDisabled" };

    const cad = await getCadWithFeatures();
    if (!cad) return { result: "skipped" as const, reason: "cadNotSetUp" };

    await recordFivemSync(settings.id, data);
    const userId = await findLinkedUserId(data.identifiers ?? undefined);
    if (!userId) return { result: "skipped" as const, reason: "noCadAccount" };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    return syncFivemDuty({
      data,
      userId,
      locale: user?.locale ?? null,
      cad,
      socket: this.socket,
    });
  }

  @Post("/check")
  @Description(
    "Connection check for the game server: settings, what the CAD has, and which players are linked (CAD API token)",
  )
  async check(
    @Req() req: Req,
    @HeaderParams(API_TOKEN_HEADER) apiToken: string | undefined,
    @BodyParams() body: unknown,
  ) {
    await this.authenticate(req, apiToken);
    const data = validateSchema(FIVEM_CHECK_SCHEMA, body ?? {});
    if (data.phoneResources) {
      const current = await getFivemFrameworkSettings();
      await recordFivemSync(current.id, { phoneResources: data.phoneResources });
    }
    const [settings, stats, cad] = await Promise.all([
      getFivemFrameworkSettings(),
      getFivemFrameworkStats(),
      getCadWithFeatures(),
    ]);

    const [onDutyStatus, offDutyStatus, genders, registrationStatuses, vehicleModels] =
      await Promise.all([
        prisma.statusValue.count({ where: { shouldDo: "SET_ON_DUTY" } }),
        prisma.statusValue.count({ where: { shouldDo: "SET_OFF_DUTY" } }),
        prisma.value.findMany({
          where: { type: "GENDER", isDisabled: false },
          select: { value: true },
        }),
        prisma.value.count({ where: { type: "LICENSE", isDisabled: false } }),
        prisma.vehicleValue.count(),
      ]);

    const players = [];
    for (const player of data.players ?? []) {
      const userId = await findLinkedUserId(player.identifiers ?? undefined);
      const [user, link, officers, deputies] = await Promise.all([
        userId
          ? prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
          : null,
        player.characterId && data.framework
          ? prisma.fivemCharacter.findUnique({
              where: {
                framework_characterId: {
                  framework: data.framework,
                  characterId: player.characterId,
                },
              },
              select: { citizenId: true },
            })
          : null,
        userId ? prisma.officer.count({ where: { userId } }) : 0,
        userId ? prisma.emsFdDeputy.count({ where: { userId } }) : 0,
      ]);
      players.push({
        characterId: player.characterId ?? null,
        cadUser: user?.username ?? null,
        citizenId: link?.citizenId ?? null,
        officers,
        emsFdDeputies: deputies,
      });
    }

    return {
      ok: true,
      settings: {
        enabled: settings.enabled,
        syncCitizens: settings.syncCitizens,
        syncVehicles: settings.syncVehicles,
        syncDuty: settings.syncDuty,
        disabledPhones: phoneIdList(settings.disabledPhones),
      },
      stats: { ...stats, lastSyncAt: settings.lastSyncAt },
      cad: {
        onDutyStatus: onDutyStatus > 0,
        offDutyStatus: offDutyStatus > 0,
        genders: genders.map((gender) => gender.value),
        registrationStatuses,
        vehicleModels,
        dmv: !!cad?.features[Feature.DMV],
        allowDuplicateCitizenNames: cad?.features[Feature.ALLOW_DUPLICATE_CITIZEN_NAMES] !== false,
        customVehicleModels: !!cad?.features[Feature.CUSTOM_TEXTFIELD_VALUES],
        maxCitizensPerUser: cad?.miscCadSettings.maxCitizensPerUser ?? null,
      },
      players,
    };
  }
}
