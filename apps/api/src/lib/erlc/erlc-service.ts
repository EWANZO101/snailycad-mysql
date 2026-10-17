import { Feature } from "@prisma/client";
import { prisma } from "~/lib/data/prisma";
import type { Socket } from "~/services/socket-service";
import {
  callErlc,
  ERLC_SERVER,
  isKeyRejected,
  isServerOffline,
  SERVER_QUERY,
  type ErlcResponse,
  type ErlcServer,
} from "./client";
import { handleErlcEmergencyCall } from "./handle-emergency-call";
import { getErlcSettings } from "./get-settings";
import { clampPollSeconds } from "./settings";

export type ErlcState =
  | "starting"
  | "featureOff"
  | "disabled"
  | "notConfigured"
  | "paused"
  | "online"
  | "offline"
  | "rateLimited"
  | "error";

/** a wrong key this many polls in a row stops polling (ER:LC blocks clients that keep failing) */
const MAX_KEY_FAILURES = 3;
/** how often to look again while the server is empty, or after an error */
const OFFLINE_POLL_MS = 60_000;
const ERROR_POLL_MS = 30_000;
/** how often to re-read the settings while the integration is off */
const IDLE_POLL_MS = 15_000;
/** a webhook can ask for a poll, but not more often than this */
const MIN_TRIGGER_GAP_MS = 2_000;
/** ER:LC allows one command per 5 seconds */
const COMMAND_GAP_MS = 5_000;

export interface ErlcStatus {
  state: ErlcState;
  lastPollAt: string | null;
  lastSuccessAt: string | null;
  nextPollAt: string | null;
  lastError: { status: number | null; code: number | null; message: string } | null;
}

export type ErlcCommandResult =
  | { ok: true; message: string | null }
  | {
      ok: false;
      reason: "notReady" | "wait" | "offline" | "restricted" | "prohibited" | "rejected" | "error";
      retryInSeconds?: number;
      message?: string | null;
    };

class ErlcService {
  #socket: Socket | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #running: Promise<void> | null = null;
  #keyFailures = 0;
  #blockedUntil = 0;
  #lastCommandAt = 0;
  #lastPollStartedAt = 0;
  /** a webhook or settings change asked for a poll while one was running */
  #pollSoon = false;

  #state: ErlcState = "starting";
  #snapshot: ErlcServer | null = null;
  #lastPollAt: Date | null = null;
  #lastSuccessAt: Date | null = null;
  #nextPollAt: Date | null = null;
  #lastError: ErlcStatus["lastError"] = null;

  start(socket: Socket) {
    this.#socket = socket;
    this.#schedule(1_000);
  }

  status(): ErlcStatus {
    return {
      state: this.#state,
      lastPollAt: this.#lastPollAt?.toISOString() ?? null,
      lastSuccessAt: this.#lastSuccessAt?.toISOString() ?? null,
      nextPollAt: this.#nextPollAt?.toISOString() ?? null,
      lastError: this.#lastError,
    };
  }

  /** the server as of the last successful poll (`null` while offline, off or not yet polled) */
  snapshot() {
    return this.#snapshot;
  }

  /** settings changed (new key, turned on/off): forget the old failures and poll right away */
  async refresh() {
    this.#keyFailures = 0;
    this.#lastError = null;
    this.#pollSoon = true;
    this.#schedule(0);
  }

  /** a signed webhook arrived: poll now instead of at the next interval */
  trigger() {
    const sinceLast = Date.now() - this.#lastPollStartedAt;
    this.#pollSoon = true;
    this.#schedule(Math.max(0, MIN_TRIGGER_GAP_MS - sinceLast));
  }

  #schedule(delayMs: number) {
    if (!this.#socket) return;
    if (this.#timer) clearTimeout(this.#timer);
    const wait = Math.max(delayMs, this.#blockedUntil - Date.now(), 0);
    this.#nextPollAt = new Date(Date.now() + wait);
    this.#timer = setTimeout(() => void this.#tick(), wait);
    this.#timer.unref?.();
  }

  async #tick() {
    this.#timer = null;
    // one poll at a time; a trigger during a poll runs after it
    if (this.#running) {
      this.#pollSoon = true;
      return;
    }
    this.#pollSoon = false;
    this.#running = this.#poll()
      .then((nextMs) => {
        // keep a webhook that arrived mid-poll from being pushed back a whole interval
        this.#schedule(this.#pollSoon ? Math.min(nextMs, MIN_TRIGGER_GAP_MS) : nextMs);
        this.#pollSoon = false;
      })
      .catch((error) => {
        console.error("[erlc] poll failed", error);
        this.#schedule(ERROR_POLL_MS);
      })
      .finally(() => {
        this.#running = null;
      });
  }

  #fail(state: ErlcState, response: Partial<ErlcResponse> | null, message: string) {
    this.#state = state;
    this.#snapshot = null;
    this.#lastError = {
      status: response?.status ?? null,
      code: response?.code ?? null,
      message: response?.message || message,
    };
  }

  /** one poll; returns how long to wait before the next one */
  async #poll(): Promise<number> {
    const [settings, feature] = await Promise.all([
      getErlcSettings(),
      prisma.cadFeature.findFirst({ where: { feature: Feature.ERLC } }),
    ]);
    const intervalMs = clampPollSeconds(settings.pollSeconds) * 1000;

    if (!feature?.isEnabled) {
      this.#state = "featureOff";
      this.#snapshot = null;
      return IDLE_POLL_MS;
    }
    if (!settings.enabled) {
      this.#state = "disabled";
      this.#snapshot = null;
      return IDLE_POLL_MS;
    }
    if (!settings.serverKey) {
      this.#state = "notConfigured";
      this.#snapshot = null;
      return IDLE_POLL_MS;
    }
    if (settings.pausedReason) {
      this.#state = "paused";
      this.#snapshot = null;
      return IDLE_POLL_MS;
    }

    this.#lastPollStartedAt = Date.now();
    this.#lastPollAt = new Date();

    let response: ErlcResponse;
    try {
      response = await callErlc(settings, { method: "GET", path: `/v2/server${SERVER_QUERY}` });
    } catch (error) {
      this.#fail("error", null, error instanceof Error ? error.message : String(error));
      return ERROR_POLL_MS;
    }

    if (response.retryAt) this.#blockedUntil = response.retryAt;

    if (response.status === 429) {
      this.#fail("rateLimited", response, "Rate limited by ER:LC");
      return intervalMs;
    }

    if (isKeyRejected(response)) {
      this.#keyFailures += 1;
      this.#fail("error", response, "ER:LC rejected the server key");
      if (this.#keyFailures >= MAX_KEY_FAILURES) {
        // stop using a dead key (ER:LC's guidance), until an admin saves a new one
        await prisma.erlcSettings.update({
          where: { id: settings.id },
          data: { pausedReason: "keyRejected", pausedAt: new Date() },
        });
        this.#state = "paused";
        console.warn("[erlc] the server key was rejected 3 times in a row; polling paused");
      }
      return intervalMs;
    }

    if (isServerOffline(response)) {
      this.#keyFailures = 0;
      this.#fail("offline", response, "The private server is empty");
      return OFFLINE_POLL_MS;
    }

    if (response.status < 200 || response.status >= 300) {
      this.#fail("error", response, `ER:LC answered ${response.status}`);
      return Math.max(intervalMs, ERROR_POLL_MS);
    }

    const parsed = ERLC_SERVER.safeParse(response.json);
    if (!parsed.success) {
      this.#fail("error", response, "Unexpected answer from ER:LC");
      return Math.max(intervalMs, ERROR_POLL_MS);
    }

    this.#keyFailures = 0;
    this.#state = "online";
    this.#snapshot = parsed.data;
    this.#lastSuccessAt = new Date();
    this.#lastError = null;

    if (settings.create911Calls && this.#socket) {
      for (const call of parsed.data.EmergencyCalls ?? []) {
        try {
          await handleErlcEmergencyCall({
            settings,
            call,
            players: parsed.data.Players ?? [],
            socket: this.#socket,
          });
        } catch (error) {
          console.error(
            `[erlc] could not create a CAD call for ER:LC call #${call.CallNumber}`,
            error,
          );
        }
      }
    }

    return intervalMs;
  }

  /** runs an in-game command as "virtual server management" (`:h hello`, `:m hello`...) */
  async runCommand(command: string): Promise<ErlcCommandResult> {
    const settings = await getErlcSettings();
    if (!settings.enabled || !settings.serverKey || settings.pausedReason) {
      return { ok: false, reason: "notReady" };
    }

    const now = Date.now();
    const readyAt = Math.max(this.#lastCommandAt + COMMAND_GAP_MS, this.#blockedUntil);
    if (readyAt > now) {
      return { ok: false, reason: "wait", retryInSeconds: Math.ceil((readyAt - now) / 1000) };
    }
    this.#lastCommandAt = now;

    let response: ErlcResponse;
    try {
      response = await callErlc(settings, {
        method: "POST",
        path: "/v2/server/command",
        body: { command },
      });
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    if (response.retryAt) {
      // the command bucket is separate; only a 429 should hold back the polls too
      if (response.status === 429) this.#blockedUntil = response.retryAt;
      this.#lastCommandAt = Math.max(this.#lastCommandAt, response.retryAt - COMMAND_GAP_MS);
    }

    if (response.status >= 200 && response.status < 300) {
      return { ok: true, message: response.message };
    }
    if (response.status === 429) {
      return {
        ok: false,
        reason: "wait",
        retryInSeconds: Math.ceil(((response.retryAt ?? now + 5000) - Date.now()) / 1000),
      };
    }
    if (isServerOffline(response)) return { ok: false, reason: "offline" };
    if (response.code === 4002) return { ok: false, reason: "restricted" };
    if (response.code === 4003) return { ok: false, reason: "prohibited" };
    if (isKeyRejected(response)) return { ok: false, reason: "rejected" };
    return { ok: false, reason: "error", message: response.message };
  }
}

export const erlcService = new ErlcService();
