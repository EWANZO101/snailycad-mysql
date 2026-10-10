import type { DiscordWebhookType } from "@prisma/client";
import type { APIEmbed } from "discord-api-types/v10";
import { getTranslator } from "utils/get-translator";
import { slateDataToString, type Descendant } from "@snailycad/utils/editor";
import { sendDiscordWebhook } from "./webhooks";

/**
 * helpers for the extra (local) Discord webhook event types.
 *
 * - each event type has its own Discord webhook (configured in CAD settings -> Discord webhooks).
 *   when no webhook is set for a type, `sendDiscordWebhook` returns early (= disabled).
 * - only send the minimum info needed: never tokens, emails, IPs or full addresses.
 * - sending is fire-and-forget so it never blocks or breaks the API response.
 */

/**
 * the extra webhook types (also in the `DiscordWebhookType` prisma enum).
 * string values are used so this keeps working even if the generated prisma client is stale.
 */
export const ExtraWebhookType = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_BAN_STATUS: "USER_BAN_STATUS",
  BOLO_UPDATED: "BOLO_UPDATED",
  BOLO_DELETED: "BOLO_DELETED",
  WARRANT_STATUS_CHANGED: "WARRANT_STATUS_CHANGED",
  CALL_911_ENDED: "CALL_911_ENDED",
  CITIZEN_CREATED: "CITIZEN_CREATED",
  CITIZEN_DELETED: "CITIZEN_DELETED",
  EXPUNGEMENT_REQUEST_STATUS: "EXPUNGEMENT_REQUEST_STATUS",
  TOW_CALL_CREATED: "TOW_CALL_CREATED",
  TAXI_CALL_CREATED: "TAXI_CALL_CREATED",
} as const satisfies Record<string, DiscordWebhookType>;

type Translator =Awaited<ReturnType<typeof getTranslator>>;

const MAX_FIELD_LENGTH = 1024;
const MAX_DESCRIPTION_LENGTH = 2048;

export const WEBHOOK_COLORS = {
  created: 0x22c55e,
  updated: 0x3b82f6,
  deleted: 0xef4444,
  neutral: 0x6b7280,
  warning: 0xf59e0b,
} as const;

interface ExtraWebhookField {
  name: string;
  value: string | number | null | undefined;
  inline?: boolean;
}

interface ExtraWebhookEmbed extends Omit<APIEmbed, "fields"> {
  fields?: ExtraWebhookField[];
}

interface SendExtraWebhookOptions {
  type: DiscordWebhookType;
  build(t: Translator): ExtraWebhookEmbed | null | undefined;
  extraMessageData?: { userDiscordId?: string | null };
}

export function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function fieldValue(value: string | number | null | undefined) {
  if (value === null || typeof value === "undefined") return "—";
  const str = String(value).trim();
  return str ? truncate(str, MAX_FIELD_LENGTH) : "—";
}

export function descriptionFromData(
  description: string | null | undefined,
  descriptionData?: unknown,
) {
  const formatted = descriptionData
    ? slateDataToString(descriptionData as Descendant[] | null)
    : null;

  return description || formatted || null;
}

async function _sendExtraWebhook(options: SendExtraWebhookOptions) {
  try {
    const t = await getTranslator({ type: "webhooks", namespace: "ExtraWebhooks", locale: "en" });
    const embed = options.build(t);
    if (!embed) return;

    const normalizedEmbed: APIEmbed = {
      ...embed,
      description: embed.description
        ? truncate(embed.description, MAX_DESCRIPTION_LENGTH)
        : undefined,
      fields: embed.fields?.map((field) => ({
        name: truncate(field.name, 256),
        value: fieldValue(field.value),
        inline: field.inline ?? true,
      })),
      timestamp: embed.timestamp ?? new Date().toISOString(),
    };

    await sendDiscordWebhook({
      type: options.type,
      data: { embeds: [normalizedEmbed] },
      extraMessageData: options.extraMessageData,
    });
  } catch (error) {
    console.error(`[extra_webhooks]: Could not send Discord webhook (${options.type}).`, error);
  }
}

/** fire-and-forget: never throws and never blocks the caller. */
export function sendExtraWebhook(options: SendExtraWebhookOptions) {
  void _sendExtraWebhook(options);
}

/** --- event specific helpers --- */

type NameLike = { name: string; surname: string } | null | undefined;

function fullName(citizen: NameLike) {
  return citizen ? `${citizen.name} ${citizen.surname}` : null;
}

export function sendUserRegisteredWebhook(options: {
  user: { username: string; whitelistStatus?: string | null; discordId?: string | null };
  method: "password" | "discord" | "steam";
}) {
  const isPending = options.user.whitelistStatus === "PENDING";

  sendExtraWebhook({
    type: ExtraWebhookType.USER_REGISTERED,
    extraMessageData: { userDiscordId: options.user.discordId },
    build: (t) => ({
      title: t("userRegistered"),
      color: isPending ? WEBHOOK_COLORS.warning : WEBHOOK_COLORS.created,
      fields: [
        { name: t("username"), value: options.user.username },
        { name: t("method"), value: t(options.method) },
        { name: t("status"), value: isPending ? t("pendingApproval") : t("accepted") },
      ],
    }),
  });
}

export function sendUserBanStatusWebhook(options: {
  user: { username: string; discordId?: string | null };
  banned: boolean;
  reason?: string | null;
  executor?: { username: string } | null;
}) {
  sendExtraWebhook({
    type: ExtraWebhookType.USER_BAN_STATUS,
    extraMessageData: { userDiscordId: options.user.discordId },
    build: (t) => ({
      title: options.banned ? t("userBanned") : t("userUnbanned"),
      color: options.banned ? WEBHOOK_COLORS.deleted : WEBHOOK_COLORS.created,
      fields: [
        { name: t("username"), value: options.user.username },
        ...(options.banned ? [{ name: t("reason"), value: options.reason }] : []),
        { name: t("by"), value: options.executor?.username },
      ],
    }),
  });
}

export function sendBoloChangeWebhook(options: {
  action: "updated" | "deleted";
  bolo: {
    type: string;
    description?: string | null;
    name?: string | null;
    plate?: string | null;
    model?: string | null;
    color?: string | null;
  };
}) {
  const { bolo } = options;
  const isDeleted = options.action === "deleted";

  sendExtraWebhook({
    type: isDeleted ? ExtraWebhookType.BOLO_DELETED : ExtraWebhookType.BOLO_UPDATED,
    build: (t) => ({
      title: isDeleted ? t("boloDeleted") : t("boloUpdated"),
      description: bolo.description || undefined,
      color: isDeleted ? WEBHOOK_COLORS.deleted : WEBHOOK_COLORS.updated,
      footer: { text: t("viewMoreInfo") },
      fields: [
        { name: t("type"), value: bolo.type.toLowerCase() },
        { name: t("name"), value: bolo.name },
        { name: t("plate"), value: bolo.plate?.toUpperCase() },
        { name: t("model"), value: bolo.model },
        { name: t("color"), value: bolo.color },
      ],
    }),
  });
}

export function sendWarrantStatusChangedWebhook(options: {
  citizen: (NonNullable<NameLike> & { user?: { discordId?: string | null } | null }) | null;
  previousStatus: string;
  newStatus: string;
  description?: string | null;
}) {
  sendExtraWebhook({
    type: ExtraWebhookType.WARRANT_STATUS_CHANGED,
    extraMessageData: { userDiscordId: options.citizen?.user?.discordId },
    build: (t) => ({
      title: t("warrantStatusChanged"),
      description: options.description || undefined,
      color: options.newStatus === "ACTIVE" ? WEBHOOK_COLORS.warning : WEBHOOK_COLORS.neutral,
      footer: { text: t("viewMoreInfo") },
      fields: [
        { name: t("citizen"), value: fullName(options.citizen) ?? t("unknown") },
        { name: t("previousStatus"), value: options.previousStatus.toLowerCase() },
        { name: t("newStatus"), value: options.newStatus.toLowerCase() },
      ],
    }),
  });
}

export function sendCalls911EndedWebhook(
  calls: { caseNumber: number; location: string; postal?: string | null }[],
) {
  if (calls.length <= 0) return;
  const [firstCall] = calls;

  sendExtraWebhook({
    type: ExtraWebhookType.CALL_911_ENDED,
    build: (t) => {
      if (calls.length === 1 && firstCall) {
        return {
          title: t("call911Ended"),
          color: WEBHOOK_COLORS.neutral,
          fields: [
            { name: t("caseNumber"), value: `#${firstCall.caseNumber}` },
            { name: t("location"), value: firstCall.location },
            { name: t("postal"), value: firstCall.postal },
          ],
        };
      }

      return {
        title: t("calls911Ended", { count: calls.length }),
        color: WEBHOOK_COLORS.neutral,
        description: calls
          .map(
            (call) =>
              `#${call.caseNumber} - ${call.location}${call.postal ? ` (${call.postal})` : ""}`,
          )
          .join("\n"),
      };
    },
  });
}

export function sendCitizenChangeWebhook(options: {
  action: "created" | "deleted";
  citizen: NameLike;
  executor?: { username: string; discordId?: string | null } | null;
}) {
  const isDeleted = options.action === "deleted";

  sendExtraWebhook({
    type: isDeleted ? ExtraWebhookType.CITIZEN_DELETED : ExtraWebhookType.CITIZEN_CREATED,
    extraMessageData: { userDiscordId: options.executor?.discordId },
    build: (t) => ({
      title: isDeleted ? t("citizenDeleted") : t("citizenCreated"),
      color: isDeleted ? WEBHOOK_COLORS.deleted : WEBHOOK_COLORS.created,
      fields: [
        { name: t("citizen"), value: fullName(options.citizen) ?? t("unknown") },
        ...(options.executor ? [{ name: t("by"), value: options.executor.username }] : []),
      ],
    }),
  });
}

export function sendExpungementRequestStatusWebhook(options: {
  status: string;
  citizen: NameLike;
  recordsCount: number;
  warrantsCount: number;
}) {
  const isAccepted = options.status === "ACCEPTED";

  sendExtraWebhook({
    type: ExtraWebhookType.EXPUNGEMENT_REQUEST_STATUS,
    build: (t) => ({
      title: isAccepted ? t("expungementAccepted") : t("expungementDeclined"),
      color: isAccepted ? WEBHOOK_COLORS.created : WEBHOOK_COLORS.deleted,
      fields: [
        { name: t("citizen"), value: fullName(options.citizen) ?? t("unknown") },
        { name: t("records"), value: options.recordsCount },
        { name: t("warrants"), value: options.warrantsCount },
      ],
    }),
  });
}

export function sendTowTaxiCallWebhook(options: {
  type: "tow" | "taxi";
  call: {
    location: string;
    postal?: string | null;
    name?: string | null;
    description?: string | null;
    descriptionData?: unknown;
    creator?: NameLike;
  };
}) {
  const { call } = options;
  const isTow = options.type === "tow";

  sendExtraWebhook({
    type: isTow ? ExtraWebhookType.TOW_CALL_CREATED : ExtraWebhookType.TAXI_CALL_CREATED,
    build: (t) => ({
      title: isTow ? t("towCallCreated") : t("taxiCallCreated"),
      description: descriptionFromData(call.description, call.descriptionData) ?? undefined,
      color: WEBHOOK_COLORS.warning,
      footer: { text: t("viewMoreInfo") },
      fields: [
        { name: t("location"), value: call.location },
        { name: t("postal"), value: call.postal },
        { name: t("caller"), value: call.name || fullName(call.creator) || t("unknown") },
      ],
    }),
  });
}
