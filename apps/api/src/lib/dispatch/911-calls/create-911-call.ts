import {
  type cad,
  type Call911,
  type MiscCadSettings,
  CallSource,
  DiscordWebhookType,
  Feature,
  WhitelistStatus,
} from "@prisma/client";
import type { ASSIGNED_UNIT, CALL_911_SCHEMA } from "@snailycad/schemas";
import { AuditLogActionType, createAuditLogEntry } from "@snailycad/audit-logger/server";
import { slateDataToString, type Descendant } from "@snailycad/utils/editor";
import type { APIEmbed } from "discord-api-types/v10";
import type { z } from "zod";
import { prisma } from "~/lib/data/prisma";
import { sendDiscordWebhook, sendRawWebhook } from "~/lib/discord/webhooks";
import { isFeatureEnabled } from "~/lib/upsert-cad";
import { officerOrDeputyToUnit } from "~/lib/leo/officerOrDeputyToUnit";
import type { Socket } from "~/services/socket-service";
import { getTranslator } from "~/utils/get-translator";
import { callInclude } from "~/utils/leo/includes";
import { assignUnitsTo911Call } from "./assign-units-to-911-call";
import { linkOrUnlinkCallDepartmentsAndDivisions } from "./link-unlink-departments-divisions-call-911";

interface Create911CallOptions {
  data: z.infer<typeof CALL_911_SCHEMA>;
  cad: cad & { features?: Record<Feature, boolean>; miscCadSettings: MiscCadSettings | null };
  socket: Socket;
  /** the user creating the call. `null` for calls created by an integration (e.g. ops-phone) */
  user: { id: string; locale?: string | null } | null;
  isFromDispatch: boolean;
  /** which integration (if any) actually created this call - shown as a badge/filter in the
   *  calls table. Defaults to MANUAL for ordinary dispatcher-created calls. */
  source?: CallSource;
  /** runs right after the call row exists, before the socket/webhooks fire (e.g. add an event) */
  onCreated?(call: Call911): Promise<void>;
}

/**
 * creates a 911 call: the single code path for the 911-calls controller and integrations, so
 * approvals, unit assignment, audit log, Discord/raw webhooks and the live socket update all
 * behave the same no matter where the call came from.
 */
export async function create911Call(options: Create911CallOptions) {
  const { data, cad, user } = options;
  const maxAssignmentsToCalls = cad.miscCadSettings?.maxAssignmentsToCalls ?? Infinity;

  const isCallApprovalEnabled = isFeatureEnabled({
    defaultReturn: false,
    feature: Feature.CALL_911_APPROVAL,
    features: cad.features,
  });
  const activeDispatchers = await prisma.activeDispatchers.count();
  const hasActiveDispatchers = activeDispatchers > 0;
  const shouldCallBePending =
    isCallApprovalEnabled && hasActiveDispatchers && !options.isFromDispatch;

  const callStatus = shouldCallBePending ? WhitelistStatus.PENDING : WhitelistStatus.ACCEPTED;

  const call = await prisma.call911.create({
    data: {
      location: data.location ?? undefined,
      postal: data.postal ?? undefined,
      description: data.descriptionData ? null : data.description,
      descriptionData: data.descriptionData ?? undefined,
      name: data.name ?? undefined,
      userId: user?.id || undefined,
      situationCodeId: data.situationCode ?? null,
      viaDispatch: options.isFromDispatch,
      source: options.source ?? CallSource.MANUAL,
      typeId: data.type,
      extraFields: data.extraFields || undefined,
      status: callStatus,
    },
    include: callInclude,
  });

  if (data.gtaMapPosition) {
    await prisma.gTAMapPosition.create({
      data: {
        x: data.gtaMapPosition.x,
        y: data.gtaMapPosition.y,
        z: data.gtaMapPosition.z,
        heading: data.gtaMapPosition.heading,
        Call911: { connect: { id: call.id } },
      },
    });
  }

  const unitIds = (data.assignedUnits ?? []) as z.infer<typeof ASSIGNED_UNIT>[];
  await assignUnitsTo911Call({
    call,
    maxAssignmentsToCalls,
    socket: options.socket,
    unitIds,
  });

  await linkOrUnlinkCallDepartmentsAndDivisions({
    departments: (data.departments ?? []) as string[],
    divisions: (data.divisions ?? []) as string[],
    call,
  });

  await options.onCreated?.(call);

  const updated = await prisma.call911.findUnique({
    where: { id: call.id },
    include: callInclude,
  });

  const normalizedCall = officerOrDeputyToUnit(updated);

  await createAuditLogEntry({
    action: {
      type: AuditLogActionType.Call911Create,
      new: normalizedCall,
    },
    executorId: user?.id ?? null,
    prisma,
  });

  try {
    const webhookData = await create911CallWebhookData(normalizedCall, user?.locale);
    await sendDiscordWebhook({ type: DiscordWebhookType.CALL_911, data: webhookData });
    await sendRawWebhook({ type: DiscordWebhookType.CALL_911, data: normalizedCall });
  } catch (error) {
    console.error("Could not send Discord webhook.", error);
  }

  options.socket.emit911Call(normalizedCall);
  return normalizedCall;
}

// creates the webhook structure that will get sent to Discord.
async function create911CallWebhookData(
  call: Call911,
  locale?: string | null,
): Promise<{ embeds: APIEmbed[] }> {
  const t = await getTranslator({ type: "webhooks", locale, namespace: "Calls" });
  const formattedDescription = slateDataToString(call.descriptionData as Descendant[] | null);

  const caller = call.name || t("unknown");
  const location = `${call.location} ${call.postal ? call.postal : ""}`;
  const description = call.description || formattedDescription || t("couldNotRenderDescription");

  return {
    embeds: [
      {
        title: t("callCreated"),
        description,
        footer: { text: t("viewMoreInfo") },
        fields: [
          { name: t("location"), value: location, inline: true },
          { name: t("caller"), value: caller, inline: true },
        ],
      },
    ],
  };
}
