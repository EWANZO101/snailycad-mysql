import { timingSafeEqual } from "node:crypto";
import { Controller } from "@tsed/di";
import { BodyParams, Req } from "@tsed/common";
import { ContentType, Description, Post } from "@tsed/schema";
import { BadRequest, NotFound, TooManyRequests, Unauthorized } from "@tsed/exceptions";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { Socket } from "services/socket-service";
import {
  handleOpsPhoneServiceRequest,
  OPS_PHONE_SERVICE_REQUEST,
} from "lib/ops-phone/handle-service-request";

/**
 * public webhook for ops-phone (OpsLab Systems FiveM phone). No session: the request is
 * authenticated by the shared secret in the `X-OpsLabs-Secret` header.
 */

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_IP = 120;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IP = 10;

interface Bucket {
  windowStart: number;
  requests: number;
  failureWindowStart: number;
  failures: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(ip: string) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { windowStart: now, requests: 0, failureWindowStart: now, failures: 0 };
    buckets.set(ip, bucket);
  }
  if (now - bucket.windowStart > WINDOW_MS) {
    bucket.windowStart = now;
    bucket.requests = 0;
  }
  if (now - bucket.failureWindowStart > FAILURE_WINDOW_MS) {
    bucket.failureWindowStart = now;
    bucket.failures = 0;
  }

  // keep the map from growing forever
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (now - value.windowStart > FAILURE_WINDOW_MS) buckets.delete(key);
    }
  }
  return bucket;
}

function getClientIp(req: Req) {
  // not trusting `x-forwarded-for` (spoofable); behind a proxy everyone shares one bucket
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function secretsMatch(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // compare against itself on a length mismatch so the timing doesn't leak the length
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

const WEBHOOK_BODY = z.object({
  event: z.string().max(64),
  timestamp: z.any().optional(),
  data: z.any().optional(),
});

@Controller("/integrations/ops-phone")
@ContentType("application/json")
export class OpsPhoneWebhookController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Post("/webhook")
  @Description("Receives ops-phone events (service requests become CAD calls)")
  async webhook(@Req() req: Req, @BodyParams() body: unknown) {
    const bucket = getBucket(getClientIp(req));
    bucket.requests += 1;
    if (bucket.requests > MAX_REQUESTS_PER_IP || bucket.failures >= MAX_FAILURES_PER_IP) {
      throw new TooManyRequests("Too many requests");
    }

    const settings = await prisma.opsPhoneSettings.findFirst();
    if (!settings?.enabled) {
      throw new NotFound("Not Found");
    }

    const header = req.headers["x-opslabs-secret"];
    const given = Array.isArray(header) ? header[0] : header;
    if (!given || !secretsMatch(given, settings.webhookSecret)) {
      bucket.failures += 1;
      console.warn(`[ops-phone] webhook with a wrong secret from ${getClientIp(req)}`);
      throw new Unauthorized("Invalid secret");
    }

    const parsedBody = WEBHOOK_BODY.safeParse(body);
    if (!parsedBody.success) {
      throw new BadRequest("Invalid body");
    }

    if (parsedBody.data.event !== "service.request") {
      return { ok: true, ignored: true };
    }

    const request = OPS_PHONE_SERVICE_REQUEST.safeParse(parsedBody.data.data);
    if (!request.success) {
      throw new BadRequest("Invalid service request");
    }

    const result = await handleOpsPhoneServiceRequest({
      settings,
      request: request.data,
      socket: this.socket,
    });

    return { ok: true, ...result };
  }
}
